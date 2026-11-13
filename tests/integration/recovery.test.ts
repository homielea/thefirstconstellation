import "./setup";
import { afterAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import pg from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMission } from "../../src/server/orchestrator/missions";
import { findStuckSteps } from "../../src/server/orchestrator/scheduler";
import { makeWorkspace, TEST_APP_URL, TEST_OWNER_URL } from "../helpers/db";
import { missionState } from "../helpers/mission";

const children: ChildProcess[] = [];
afterAll(() => { for (const c of children) if (c.exitCode === null) c.kill("SIGKILL"); });

function startWorker(env: Record<string, string>): ChildProcess {
  // Spawn node directly (not npx) so kill() reaches the worker itself.
  const child = spawn(process.execPath, ["--import", "tsx", "src/worker/main.ts"], {
    cwd: path.resolve(import.meta.dirname, "../.."),
    env: { ...process.env, DATABASE_URL: TEST_APP_URL, DATABASE_OWNER_URL: TEST_OWNER_URL, PROVIDER_MODE: "fake", FAKE_DELAY_MS: "50",
      STEP_LEASE_SECONDS: "2", WORKER_CONCURRENCY: "1", ...env },
    stdio: ["ignore", "ignore", process.env.DEBUG_WORKER ? "inherit" : "ignore"],
  });
  children.push(child);
  return child;
}
const exited = (p: ChildProcess) => new Promise<number | null>((r) => p.on("exit", (code) => r(code)));

describe("worker crash and restart (REL-001, REL-006, ACPT-19)", () => {
  it("a killed worker's step is reclaimed after its lease; nothing is lost or duplicated", { timeout: 90_000 }, async () => {
    // Isolate: other test files may leave active missions that a separate worker process would pick up first.
    const owner = new pg.Client({ connectionString: TEST_OWNER_URL });
    await owner.connect();
    await owner.query("UPDATE missions SET status='cancelled', cancel_requested_at=now() WHERE status IN ('queued','running','blocked','failed')");
    await owner.end();
    const f = await makeWorkspace("crash");
    const { missionId } = await createMission({ workspaceId: f.workspaceId, userId: f.userId }, f.roomId, "Draft a launch brief for Tidewater, our studio planning app.");
    const markers = fs.mkdtempSync(path.join(os.tmpdir(), "fc-faults-"));
    const faults = JSON.stringify([{ schema: "scribe.brief@1", kind: "crash", times: 1 }]);

    // 1. The worker crashes right after Scribe's model call returns, before the step can complete.
    const w1 = startWorker({ FAKE_FAULTS: faults, FAULT_MARKER_DIR: markers });
    expect(await exited(w1)).toBe(137);
    let s = await missionState(f, missionId);
    expect(s.stepStatus).toMatchObject({ research: "completed", draft: "running" });

    // 2. While the lease is expired, the step is detectable as stuck.
    await new Promise((r) => setTimeout(r, 2500));
    const stuck = await findStuckSteps(0);
    if (process.env.DEBUG_WORKER) console.log("stuck", stuck, (await missionState(f, missionId)).steps);
    expect(stuck.some((x) => x.mission_id === missionId)).toBe(true);

    // 3. A new worker reclaims it and finishes the mission.
    const w2 = startWorker({ FAKE_FAULTS: faults, FAULT_MARKER_DIR: markers });
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      s = await missionState(f, missionId);
      if (s.status === "completed") break;
      await new Promise((r) => setTimeout(r, 300));
    }
    w2.kill("SIGTERM");
    await exited(w2);

    expect(s.status).toBe("completed");
    expect(s.steps.find((x) => x.step_key === "draft")!.attempt).toBe(2);
    expect(s.artifacts.filter((a) => a.type === "launch_brief")).toHaveLength(1);
    expect(s.artifacts.filter((a) => a.type === "research_note")).toHaveLength(1);
    expect(s.events.filter((e) => e.type === "step.completed").map((e) => e.step_key)).toEqual(["research", "draft", "review"]);
    expect(s.events.filter((e) => e.type === "mission.completed")).toHaveLength(1);
    // The call in flight when the process died was never recorded (technical design §5, r2); attempt 2's call is.
    expect(s.models.filter((m) => m.schema_name === "scribe.brief@1").map((m) => m.attempt)).toEqual([2]);
    // Research was not re-run.
    expect(s.models.filter((m) => m.step_key === "research")).toHaveLength(2);
  });
});
