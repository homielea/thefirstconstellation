import { withWorkspace } from "../../src/server/db/pool";
import type { Fixture } from "./db";

export async function missionState(f: Fixture, missionId: string) {
  return withWorkspace({ workspaceId: f.workspaceId, userId: f.userId }, async (db) => {
    const mission = (await db.query("SELECT * FROM missions WHERE id=$1", [missionId])).rows[0];
    const steps = (await db.query("SELECT step_key, status, attempt, last_error FROM mission_steps WHERE mission_id=$1 ORDER BY position", [missionId])).rows;
    const events = (await db.query("SELECT seq, type, step_key, message FROM run_events WHERE mission_id=$1 ORDER BY seq", [missionId])).rows;
    const artifacts = (await db.query(
      "SELECT a.type, v.version, v.author_kind, v.produced_by_step_id, (SELECT count(*)::int FROM citations c WHERE c.artifact_version_id=v.id) AS citations FROM artifacts a JOIN artifact_versions v ON v.artifact_id=a.id WHERE a.mission_id=$1 ORDER BY a.created_at, v.version", [missionId])).rows;
    const models = (await db.query("SELECT s.step_key, m.attempt, m.schema_name, m.outcome, m.error_category FROM model_executions m JOIN mission_steps s ON s.id=m.step_id WHERE m.mission_id=$1 ORDER BY m.created_at", [missionId])).rows;
    const tools = (await db.query("SELECT tool, outcome, error_category FROM tool_executions WHERE mission_id=$1 ORDER BY created_at", [missionId])).rows;
    return { mission, steps, events, artifacts, models, tools, status: mission?.status as string, stepStatus: Object.fromEntries(steps.map((s) => [s.step_key, s.status])) };
  });
}
