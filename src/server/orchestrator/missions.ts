import { CURRENT_PROMPT, promptRef } from "@/agents/prompts";
import type { Archetype } from "@/contracts";
import { launchBriefPlan, validatePlan } from "@/domain/plan";
import { CANCELLABLE, type MissionStatus } from "@/domain/state";
import { providerMode } from "../env";
import { withWorkspace, type WorkspaceCtx } from "../db/pool";
import { listAgents } from "../workspaces";
import { appendEvent } from "./events";

export class NotFound extends Error {}
export class Conflict extends Error {}

/** PROD-001/002, AGT-001: message, mission, plan and steps commit together before any claim. */
export async function createMission(ctx: WorkspaceCtx & { userId: string }, roomId: string, request: string, opts: { budgetUsd?: number } = {}) {
  return withWorkspace(ctx, async (db) => {
    const room = await db.query("SELECT id FROM rooms WHERE id=$1", [roomId]);
    if (!room.rows[0]) throw new NotFound("room");
    const v = validatePlan(launchBriefPlan(request, opts.budgetUsd ?? 1));
    if (!v.ok) throw new Error(`Invalid plan: ${v.errors.join("; ")}`);
    const plan = v.plan;
    const agents = await listAgents(db);
    const byArch = new Map(agents.map((a) => [a.archetype, a]));
    const msg = await db.query("INSERT INTO messages (workspace_id, room_id, author_user_id, body) VALUES ($1,$2,$3,$4) RETURNING id", [ctx.workspaceId, roomId, ctx.userId, request]);
    const m = await db.query(
      `INSERT INTO missions (workspace_id, room_id, created_by, objective, template_id, status, budget_usd, provider_mode)
       VALUES ($1,$2,$3,$4,$5,'queued',$6,$7) RETURNING id`,
      [ctx.workspaceId, roomId, ctx.userId, request, plan.templateId, plan.budgetUsd, providerMode()]);
    const missionId = m.rows[0].id as string;
    await db.query("INSERT INTO mission_plans (workspace_id, mission_id, plan) VALUES ($1,$2,$3)", [ctx.workspaceId, missionId, plan]);
    for (const [i, s] of plan.steps.entries()) {
      const agent = byArch.get(s.agentArchetype);
      if (!agent) throw new Error(`Workspace has no ${s.agentArchetype} profile`);
      const prompt = CURRENT_PROMPT[s.agentArchetype as Archetype];
      if (!prompt) throw new Error(`No prompt for ${s.agentArchetype}`);
      await db.query(
        `INSERT INTO mission_steps (workspace_id, mission_id, step_key, position, title, archetype, agent_profile_id, agent_profile_version,
           prompt_version, depends_on, allowed_tools, expected_output, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [ctx.workspaceId, missionId, s.id, i, s.title, s.agentArchetype, agent.id, agent.version, promptRef(prompt), s.dependsOn, s.allowedTools, s.expectedOutput, s.dependsOn.length ? "pending" : "ready"]);
    }
    await db.query("UPDATE messages SET mission_id=$1 WHERE id=$2", [missionId, msg.rows[0].id]);
    const names = plan.steps.map((s) => `${byArch.get(s.agentArchetype)!.config.properName} (${s.agentArchetype[0]!.toUpperCase()}${s.agentArchetype.slice(1)})`);
    await appendEvent(db, { workspaceId: ctx.workspaceId, missionId, type: "plan.saved", dedupeKey: "plan.saved",
      message: `Plan saved: ${plan.steps.length} steps — ${names.join(", then ")}.`, data: { steps: plan.steps.length } });
    return { missionId };
  });
}

/** EXP-007, REL-003: once committed, nothing new is claimed; an in-flight result is discarded at completion. */
export async function cancelMission(ctx: WorkspaceCtx, missionId: string): Promise<MissionStatus> {
  return withWorkspace(ctx, async (db) => {
    const r = await db.query("SELECT status FROM missions WHERE id=$1 FOR UPDATE", [missionId]);
    const status = r.rows[0]?.status as MissionStatus | undefined;
    if (!status) throw new NotFound("mission");
    if (!CANCELLABLE.includes(status)) throw new Conflict(`Mission is ${status}`);
    await db.query("UPDATE missions SET status='cancelled', cancel_requested_at=now(), updated_at=now() WHERE id=$1", [missionId]);
    const steps = await db.query(
      "UPDATE mission_steps SET status='cancelled', lease_owner=NULL, lease_expires_at=NULL WHERE mission_id=$1 AND status IN ('pending','ready','running','failed','awaiting_approval') RETURNING step_key", [missionId]);
    await appendEvent(db, { workspaceId: ctx.workspaceId, missionId, type: "mission.cancelled", dedupeKey: "mission.cancelled",
      message: `Mission cancelled. ${steps.rowCount} unfinished step${steps.rowCount === 1 ? "" : "s"} will not run. Finished steps stay finished.`,
      data: { cancelledSteps: steps.rows.map((x) => x.step_key) } });
    return "cancelled" as const;
  });
}

/** REL-004: retry a failed step; earlier completed steps are not re-run. */
export async function retryStep(ctx: WorkspaceCtx, stepId: string) {
  return withWorkspace(ctx, async (db) => {
    const r = await db.query("SELECT s.mission_id, s.status, s.step_key, m.status AS mstatus FROM mission_steps s JOIN missions m ON m.id=s.mission_id WHERE s.id=$1 FOR UPDATE OF s, m", [stepId]);
    const row = r.rows[0];
    if (!row) throw new NotFound("step");
    if (row.status !== "failed" || !["failed", "blocked"].includes(row.mstatus)) throw new Conflict("Only a failed step of a failed or blocked mission can be retried");
    await db.query("UPDATE mission_steps SET status='ready', attempt=0, last_error=NULL, lease_owner=NULL, lease_expires_at=NULL WHERE id=$1", [stepId]);
    await db.query("UPDATE missions SET status='running', blocked_reason=NULL, completed_at=NULL, updated_at=now() WHERE id=$1", [row.mission_id]);
    const n = (await db.query("SELECT count(*)::int AS n FROM run_events WHERE mission_id=$1 AND type='step.retried'", [row.mission_id])).rows[0].n;
    await appendEvent(db, { workspaceId: ctx.workspaceId, missionId: row.mission_id, type: "step.retried", stepId, stepKey: row.step_key,
      dedupeKey: `step.retried:${stepId}:${n + 1}`, message: "Retry requested. The step will run again." });
    return { missionId: row.mission_id as string };
  });
}
