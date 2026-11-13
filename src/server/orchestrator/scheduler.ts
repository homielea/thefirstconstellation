import { withGlobal, withWorkspace } from "../db/pool";

/** ADR-0002 boundary. A different engine (Temporal, Inngest) would implement this interface. */
export interface StepClaim { stepId: string; missionId: string; workspaceId: string }
export interface StepScheduler {
  claim(workerId: string): Promise<StepClaim | null>;
  heartbeat(claim: StepClaim, workerId: string): Promise<{ alive: boolean; cancelled: boolean }>;
}

export const leaseSeconds = () => Number(process.env.STEP_LEASE_SECONDS ?? 60);

export const postgresScheduler: StepScheduler = {
  async claim(workerId) {
    const r = await withGlobal((db) => db.query("SELECT * FROM claim_next_step($1,$2)", [workerId, leaseSeconds()]));
    const x = r.rows[0];
    return x ? { stepId: x.step_id, missionId: x.mission_id, workspaceId: x.workspace_id } : null;
  },
  async heartbeat(claim, workerId) {
    return withWorkspace({ workspaceId: claim.workspaceId, userId: null }, async (db) => {
      const r = await db.query(
        `UPDATE mission_steps s SET lease_expires_at = now() + make_interval(secs => $3)
         FROM missions m WHERE s.id=$1 AND s.lease_owner=$2 AND s.status='running' AND m.id=s.mission_id
         RETURNING m.cancel_requested_at IS NOT NULL AS cancelled`, [claim.stepId, workerId, leaseSeconds()]);
      return r.rows[0] ? { alive: true, cancelled: r.rows[0].cancelled } : { alive: false, cancelled: true };
    });
  },
};

/** REL-006: stuck-run detection (lease expired beyond a grace period). */
export async function findStuckSteps(graceSeconds = 60) {
  return withGlobal(async (db) => (await db.query("SELECT * FROM find_stuck_steps($1)", [graceSeconds])).rows);
}
