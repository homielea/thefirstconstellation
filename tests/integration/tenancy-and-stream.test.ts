import "./setup";
import { describe, expect, it } from "vitest";
import { withWorkspace } from "../../src/server/db/pool";
import { createMission } from "../../src/server/orchestrator/missions";
import { createProviders } from "../../src/server/providers/registry";
import { missionEventStream } from "../../src/server/sse";
import { drain } from "../../src/worker/loop";
import { makeWorkspace } from "../helpers/db";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}
const ids = (sse: string) => [...sse.matchAll(/^id: (\d+)$/gm)].map((m) => Number(m[1]));

describe("tenant isolation (SEC-001, ACPT-18)", async () => {
  it("a different workspace cannot read missions, artifacts, citations, events or executions by id", async () => {
    const a = await makeWorkspace("iso-a");
    const b = await makeWorkspace("iso-b");
    const { missionId } = await createMission({ workspaceId: a.workspaceId, userId: a.userId }, a.roomId, "Draft a launch brief for Tidewater please.");
    await drain(createProviders("fake"));
    const refs = await withWorkspace({ workspaceId: a.workspaceId, userId: a.userId }, async (db) => ({
      artifact: (await db.query("SELECT id FROM artifacts WHERE mission_id=$1 LIMIT 1", [missionId])).rows[0].id,
      citation: (await db.query("SELECT c.id FROM citations c JOIN artifact_versions v ON v.id=c.artifact_version_id JOIN artifacts x ON x.id=v.artifact_id WHERE x.mission_id=$1 LIMIT 1", [missionId])).rows[0].id,
    }));
    await withWorkspace({ workspaceId: b.workspaceId, userId: b.userId }, async (db) => {
      expect((await db.query("SELECT * FROM missions WHERE id=$1", [missionId])).rowCount).toBe(0);
      expect((await db.query("SELECT * FROM artifacts WHERE id=$1", [refs.artifact])).rowCount).toBe(0);
      expect((await db.query("SELECT * FROM artifact_versions WHERE artifact_id=$1", [refs.artifact])).rowCount).toBe(0);
      expect((await db.query("SELECT * FROM citations WHERE id=$1", [refs.citation])).rowCount).toBe(0);
      expect((await db.query("SELECT * FROM run_events WHERE mission_id=$1", [missionId])).rowCount).toBe(0);
      expect((await db.query("SELECT * FROM model_executions WHERE mission_id=$1", [missionId])).rowCount).toBe(0);
      expect((await db.query("SELECT * FROM mission_steps WHERE mission_id=$1", [missionId])).rowCount).toBe(0);
      expect((await db.query("UPDATE missions SET status='cancelled' WHERE id=$1", [missionId])).rowCount).toBe(0);
    });
    // WITH CHECK: cannot write rows into another workspace
    await expect(withWorkspace({ workspaceId: b.workspaceId, userId: b.userId }, (db) =>
      db.query("INSERT INTO rooms (workspace_id, name, created_by) VALUES ($1,'x',$2)", [a.workspaceId, b.userId]))).rejects.toThrow(/row-level security/);
    // Event stream scoped to the wrong workspace yields nothing
    const sse = await readAll(missionEventStream({ workspaceId: b.workspaceId, userId: b.userId }, missionId, 0, new AbortController().signal, 20));
    expect(ids(sse)).toEqual([]);
    expect(sse).not.toContain("run-event");
  });
});

describe("event stream replay (REL-002)", () => {
  it("replays every event after Last-Event-ID from the database, then ends", async () => {
    const f = await makeWorkspace("sse");
    const { missionId } = await createMission({ workspaceId: f.workspaceId, userId: f.userId }, f.roomId, "Draft a launch brief for Tidewater please.");
    // first connection sees only the plan, then "drops"
    const ctl = new AbortController();
    const firstStream = missionEventStream({ workspaceId: f.workspaceId, userId: f.userId }, missionId, 0, ctl.signal, 20);
    const reader = firstStream.getReader();
    const dec = new TextDecoder();
    let first = "";
    while (!first.includes("id: 1")) first += dec.decode((await reader.read()).value);
    ctl.abort();
    await reader.cancel();
    // the mission continues without any client
    await drain(createProviders("fake"));
    const total = await withWorkspace({ workspaceId: f.workspaceId, userId: f.userId }, async (db) => (await db.query("SELECT max(seq)::int AS n FROM run_events WHERE mission_id=$1", [missionId])).rows[0].n);
    const resumed = await readAll(missionEventStream({ workspaceId: f.workspaceId, userId: f.userId }, missionId, 1, new AbortController().signal, 20));
    expect(ids(resumed)).toEqual(Array.from({ length: total - 1 }, (_, i) => i + 2));
    expect(resumed).toContain('event: end\ndata: {"status":"completed"}');
  });
});
