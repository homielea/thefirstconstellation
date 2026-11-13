# ADR-0002: Durable workflow engine

Status: Accepted (2026-11-13)

## Context
Missions must be durable, resumable, idempotent and cancellable. Persisted state must commit with
the scheduling decision. Phase 0 must not add vendor cost or lock-in.

## Options
| Option | Pros | Cons |
|---|---|---|
| Temporal | Strongest durability semantics | Separate cluster or cloud cost; heavy for 3-step plans; determinism constraints on workflow code |
| Trigger.dev / Inngest | Hosted, nice DX | Vendor event shapes; state lives outside our DB; extra monthly cost |
| graphile-worker | Postgres-native, transactional enqueue | Crashed-worker locks are released only after a long timeout; it is a job queue, so we still model steps ourselves |
| **Postgres lease scheduler on `mission_steps`** | Step state *is* the queue; enqueue = commit; lease expiry gives crash recovery; zero new services | We own a small amount of scheduling code |

## Decision
Use a **Postgres lease scheduler** behind a `StepScheduler` interface
(`src/server/orchestrator/scheduler.ts`). Claimable = `status='ready'`, or `status='running'` with
`lease_expires_at < now()`. Claims go through `claim_next_step()` with `FOR UPDATE SKIP LOCKED`.
Leases last 60 s with a 15 s heartbeat. Completion is a guarded transaction (see 001 technical design §5).

## Revisit when
Plans need timers or long waits (approvals waiting for days, slice 005), or throughput exceeds
about 50 steps/s. The `StepScheduler` boundary is where Temporal or Inngest would plug in.
