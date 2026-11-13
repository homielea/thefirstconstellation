import type { RunEventType } from "@/contracts";
import { redact } from "@/domain/redact";
import type { Db } from "../db/pool";

export interface NewEvent {
  workspaceId: string;
  missionId: string;
  type: RunEventType;
  message: string;
  dedupeKey: string;
  stepId?: string | null;
  stepKey?: string | null;
  agentName?: string | null;
  data?: Record<string, unknown>;
  diagnostic?: Record<string, unknown> | null;
}

/** DAT-004: append-only, per-mission increasing seq. Idempotent by dedupe key (REL-001). */
export async function appendEvent(db: Db, e: NewEvent): Promise<number | null> {
  const exists = await db.query("SELECT seq FROM run_events WHERE mission_id=$1 AND dedupe_key=$2", [e.missionId, e.dedupeKey]);
  if (exists.rows[0]) return null;
  const seq = (await db.query("UPDATE missions SET event_seq = event_seq + 1, updated_at = now() WHERE id=$1 RETURNING event_seq", [e.missionId])).rows[0]?.event_seq as number;
  await db.query(
    `INSERT INTO run_events (workspace_id, mission_id, seq, type, step_id, step_key, agent_name, message, data, diagnostic, dedupe_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [e.workspaceId, e.missionId, seq, e.type, e.stepId ?? null, e.stepKey ?? null, e.agentName ?? null, e.message, redact(e.data ?? {}), e.diagnostic ? redact(e.diagnostic) : null, e.dedupeKey],
  );
  return seq;
}

export interface EventRow { seq: number; type: string; at: string; stepKey: string | null; agentName: string | null; message: string; data: Record<string, unknown> }
export async function eventsAfter(db: Db, missionId: string, afterSeq: number, limit = 200): Promise<EventRow[]> {
  const r = await db.query(
    "SELECT seq, type, created_at, step_key, agent_name, message, data FROM run_events WHERE mission_id=$1 AND seq > $2 ORDER BY seq LIMIT $3",
    [missionId, afterSeq, limit]);
  return r.rows.map((x) => ({ seq: x.seq, type: x.type, at: x.created_at.toISOString(), stepKey: x.step_key, agentName: x.agent_name, message: x.message, data: x.data }));
}
