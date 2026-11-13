import { AgentProfileConfig, artifactText, parseArtifactContent } from "@/contracts";
import { log } from "@/domain/redact";
import { withWorkspace, type Db } from "../db/pool";
import type { Providers } from "../providers/registry";
import { StepContext, StepError, type MissionRow, type StepResult, type StepRow } from "./context";
import { appendEvent } from "./events";
import { leaseSeconds, type StepClaim, type StepScheduler } from "./scheduler";
import { runScribe } from "./agents/scribe";
import { runSeer } from "./agents/seer";
import { runSentinel } from "./agents/sentinel";

const HANDLERS: Record<string, (ctx: StepContext) => Promise<StepResult>> = { seer: runSeer, scribe: runScribe, sentinel: runSentinel };
const BLOCKING = new Set(["budget_reached", "connection_missing", "spend_cap"]);
const PLAIN: Record<string, string> = {
  model_error: "the model service returned an error", invalid_output: "the answer did not match the required format", timeout: "the call took too long",
  connection_missing: "a required connection is missing", budget_reached: "the mission budget was reached", spend_cap: "the live spend cap was reached",
  tool_refused: "a tool outside this step's permissions was requested", internal: "an internal error occurred",
};
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export type StepOutcome = "completed" | "retrying" | "failed" | "blocked" | "discarded";

/** Executes one claimed step attempt end to end. Safe to call again after a crash (REL-001). */
export async function executeStep(claim: StepClaim, workerId: string, providers: Providers, scheduler: StepScheduler, heartbeatMs = Math.min(15_000, (leaseSeconds() * 1000) / 4)): Promise<StepOutcome> {
  const scope = { workspaceId: claim.workspaceId, userId: null };
  const loaded = await withWorkspace(scope, async (db) => {
    const s = (await db.query("SELECT * FROM mission_steps WHERE id=$1", [claim.stepId])).rows[0] as StepRow | undefined;
    const m = (await db.query("SELECT id, room_id, objective, status, budget_usd, spent_usd, provider_mode FROM missions WHERE id=$1", [claim.missionId])).rows[0] as MissionRow | undefined;
    if (!s || !m) return null;
    const a = (await db.query("SELECT config FROM agent_profile_versions WHERE agent_profile_id=$1 AND version=$2", [s.agent_profile_id, s.agent_profile_version])).rows[0];
    return { s, m, config: AgentProfileConfig.parse(a.config) };
  });
  if (!loaded) return "discarded";
  const { s: step, m: mission, config } = loaded;
  const ctl = new AbortController();
  const ctx = new StepContext(claim, workerId, step, mission, { id: step.agent_profile_id, version: step.agent_profile_version, config }, providers, ctl.signal);

  if (step.attempt > step.max_attempts) {
    return finishFailure(ctx, new StepError("internal", "The step was interrupted too many times.", false));
  }

  await withWorkspace(scope, async (db) => {
    const r = await db.query("UPDATE missions SET status='running', updated_at=now() WHERE id=$1 AND status='queued' RETURNING id", [mission.id]);
    if (r.rows[0]) await appendEvent(db, { workspaceId: claim.workspaceId, missionId: mission.id, type: "mission.running", dedupeKey: "mission.running", message: "Mission started." });
    await appendEvent(db, { workspaceId: claim.workspaceId, missionId: mission.id, type: "step.started", stepId: step.id, stepKey: step.step_key, agentName: config.properName,
      dedupeKey: `step.started:${step.id}:${step.attempt}`, message: `${ctx.agentName} started: ${step.title}${step.attempt > 1 ? ` (attempt ${step.attempt} of ${step.max_attempts})` : ""}.`,
      data: { attempt: step.attempt } });
  });

  let cancelled = false;
  const hb = setInterval(async () => {
    try {
      const h = await scheduler.heartbeat(claim, workerId);
      if (!h.alive || h.cancelled) { cancelled = true; ctl.abort(); }
    } catch (e) { log("warn", "heartbeat failed", e); }
  }, heartbeatMs);

  try {
    const handler = HANDLERS[step.archetype];
    if (!handler) throw new StepError("internal", `No handler for ${step.archetype}`, false);
    const result = await handler(ctx);
    if (cancelled) return discard(ctx);
    return await finishSuccess(ctx, result);
  } catch (e) {
    if (cancelled || ctl.signal.aborted) return discard(ctx);
    const se = e instanceof StepError ? e : new StepError("internal", "The step failed unexpectedly.", true, { error: String(e) });
    if (se.category === "internal") log("error", "step internal error", { stepId: step.id, error: e });
    return finishFailure(ctx, se);
  } finally {
    clearInterval(hb);
  }
}

/** Guard: only the current lease holder of a running step in a non-cancelled mission may finish it. */
async function guard(db: Db, ctx: StepContext): Promise<boolean> {
  const r = await db.query(
    `SELECT 1 FROM mission_steps s JOIN missions m ON m.id=s.mission_id
     WHERE s.id=$1 AND s.status='running' AND s.lease_owner=$2 AND s.attempt=$3 AND m.cancel_requested_at IS NULL FOR UPDATE OF s, m`,
    [ctx.step.id, ctx.workerId, ctx.step.attempt]);
  return !!r.rows[0];
}

async function finishSuccess(ctx: StepContext, result: StepResult): Promise<StepOutcome> {
  const ws = ctx.claim.workspaceId;
  return withWorkspace(ctx.scope, async (db) => {
    if (!(await guard(db, ctx))) return "discarded";
    for (const a of result.artifacts) {
      parseArtifactContent(a.type, a.content); // DAT-002: validate before persisting
      const art = await db.query(
        "INSERT INTO artifacts (workspace_id, mission_id, room_id, type, title, current_version, reviews_artifact_id) VALUES ($1,$2,$3,$4,$5,1,$6) RETURNING id",
        [ws, ctx.mission.id, ctx.mission.room_id, a.type, a.title, a.reviewsArtifactId ?? null]);
      const ver = await db.query(
        `INSERT INTO artifact_versions (workspace_id, artifact_id, version, content, text_content, author_kind, author_agent_profile_id, author_agent_version, produced_by_step_id)
         VALUES ($1,$2,1,$3,$4,'agent',$5,$6,$7) RETURNING id`,
        [ws, art.rows[0].id, a.content, artifactText(a.type, a.content), ctx.agent.id, ctx.agent.version, ctx.step.id]);
      for (const c of a.citations) {
        await db.query(
          `INSERT INTO citations (workspace_id, artifact_version_id, ref, source_kind, url, source_document_id, title, excerpt, retrieved_by_step_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [ws, ver.rows[0].id, c.ref, c.sourceKind, c.url, c.sourceDocumentId, c.title, c.excerpt, c.retrievedByStepId]);
      }
    }
    await db.query("UPDATE mission_steps SET status='completed', output=$2, completed_at=now(), lease_owner=NULL, lease_expires_at=NULL, last_error=NULL WHERE id=$1", [ctx.step.id, result.output]);
    await appendEvent(db, { workspaceId: ws, missionId: ctx.mission.id, type: "step.completed", stepId: ctx.step.id, stepKey: ctx.step.step_key, agentName: ctx.agent.config.properName,
      dedupeKey: `step.completed:${ctx.step.id}`, message: result.message, data: result.data ?? {} });
    // AGT-005: unlock dependents whose dependencies are all complete.
    await db.query(
      `UPDATE mission_steps s SET status='ready' WHERE s.mission_id=$1 AND s.status='pending'
       AND NOT EXISTS (SELECT 1 FROM unnest(s.depends_on) d WHERE NOT EXISTS (SELECT 1 FROM mission_steps x WHERE x.mission_id=s.mission_id AND x.step_key=d AND x.status='completed'))`,
      [ctx.mission.id]);
    const left = await db.query("SELECT count(*)::int AS n FROM mission_steps WHERE mission_id=$1 AND status <> 'completed'", [ctx.mission.id]);
    if (left.rows[0].n === 0) {
      const tot = await db.query("SELECT spent_usd FROM missions WHERE id=$1", [ctx.mission.id]);
      await db.query("UPDATE missions SET status='completed', completed_at=now(), updated_at=now() WHERE id=$1", [ctx.mission.id]);
      await appendEvent(db, { workspaceId: ws, missionId: ctx.mission.id, type: "mission.completed", dedupeKey: "mission.completed",
        message: "Mission complete. The brief is ready to edit.", data: { spentUsd: tot.rows[0].spent_usd } });
    }
    return "completed";
  });
}

async function finishFailure(ctx: StepContext, e: StepError): Promise<StepOutcome> {
  const ws = ctx.claim.workspaceId;
  return withWorkspace(ctx.scope, async (db) => {
    if (!(await guard(db, ctx))) return "discarded";
    const lastError = { category: e.category, message: e.message, attempt: ctx.step.attempt };
    const name = ctx.agent.config.properName;
    const base = { workspaceId: ws, missionId: ctx.mission.id, stepId: ctx.step.id, stepKey: ctx.step.step_key, agentName: name, diagnostic: e.diagnostic };
    if (e.retryable && ctx.step.attempt < ctx.step.max_attempts) {
      await db.query("UPDATE mission_steps SET status='ready', lease_owner=NULL, lease_expires_at=NULL, last_error=$2 WHERE id=$1", [ctx.step.id, lastError]);
      await appendEvent(db, { ...base, type: "step.attempt_failed", dedupeKey: `step.attempt_failed:${ctx.step.id}:${ctx.step.attempt}`,
        message: `${name}'s attempt ${ctx.step.attempt} failed: ${PLAIN[e.category]}. Retrying.`, data: lastError });
      return "retrying";
    }
    await db.query("UPDATE mission_steps SET status='failed', lease_owner=NULL, lease_expires_at=NULL, last_error=$2 WHERE id=$1", [ctx.step.id, lastError]);
    await appendEvent(db, { ...base, type: "step.failed", dedupeKey: `step.failed:${ctx.step.id}:${ctx.step.attempt}`,
      message: `${name} could not finish “${ctx.step.title}”: ${PLAIN[e.category]}. Nothing outside this workspace was changed.`, data: lastError });
    const blocked = BLOCKING.has(e.category);
    await db.query("UPDATE missions SET status=$2, blocked_reason=$3, updated_at=now() WHERE id=$1", [ctx.mission.id, blocked ? "blocked" : "failed", blocked ? e.category : null]);
    const n = (await db.query("SELECT count(*)::int AS n FROM run_events WHERE mission_id=$1 AND type IN ('mission.failed','mission.blocked')", [ctx.mission.id])).rows[0].n;
    await appendEvent(db, { workspaceId: ws, missionId: ctx.mission.id, type: blocked ? "mission.blocked" : "mission.failed", dedupeKey: `mission.stopped:${n + 1}`,
      message: blocked ? `Paused: ${PLAIN[e.category]}.` : `${cap(PLAIN[e.category]!)}. The mission stopped at “${ctx.step.title}”.`, data: { reason: e.category } });
    return blocked ? "blocked" : "failed";
  });
}

async function discard(ctx: StepContext): Promise<StepOutcome> {
  await withWorkspace(ctx.scope, (db) => appendEvent(db, { workspaceId: ctx.claim.workspaceId, missionId: ctx.mission.id, type: "step.cancelled", stepId: ctx.step.id,
    stepKey: ctx.step.step_key, agentName: ctx.agent.config.properName, dedupeKey: `step.cancelled:${ctx.step.id}`,
    message: `${ctx.agent.config.properName}'s work in progress was discarded.` }));
  return "discarded";
}
