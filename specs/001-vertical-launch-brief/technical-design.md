# 001 — Technical design

Revision: r2 (2026-11-13): §5 crash accounting corrected; see revision notes in requirements.md.

## §1 Components
| Module | Responsibility |
|---|---|
| `src/app/**` | Next.js App Router pages and `/api` routes (thin: auth → `withWorkspace` → domain call) |
| `src/server/db/pool.ts` | `pg` pool. `withWorkspace(ctx, fn)` runs `fn` in a transaction with `set_config('app.user_id')` and `set_config('app.workspace_id')` |
| `src/server/auth/*` | magic-link tokens, sessions, rate limit, `requireMember(slug)` |
| `src/domain/*` | pure: plan validation, state machine, cost, redaction, citation integrity |
| `src/contracts/*` | Zod schemas (source of truth) → JSON Schema export (`npm run contracts:export`) |
| `src/agents/*` | First Seven definitions, profile config, versioned prompt files |
| `src/server/orchestrator/*` | mission service (create/cancel/retry), scheduler (claim/lease), agent runner, tool gateway, usage recorder, spend guard |
| `src/server/providers/*` | `ModelProvider` (anthropic, fake), `SearchProvider` (brave, fake) |
| `src/worker/main.ts` | poll loop: `claim_next_step` → run → heartbeat |

## §2 Data model (migration `0001_foundation`)
Global: `users`, `sessions`, `login_tokens`, `agent_archetypes`, `live_spend`.
Tenant (all with `workspace_id NOT NULL`, RLS on): `workspaces` (keyed by `id`),
`workspace_memberships`, `agent_profiles`, `agent_profile_versions`, `rooms`, `messages`,
`source_documents`, `missions`, `mission_plans`, `mission_steps`, `run_events`,
`model_executions`, `tool_executions`, `usage_ledger`, `artifacts`, `artifact_versions`, `citations`.

Key constraints:
- `mission_steps (mission_id, step_key)` unique. `depends_on text[]`. `attempt int`. `lease_expires_at`.
- `artifact_versions (artifact_id, version)` unique. `(produced_by_step_id)` unique where not null → **at most
  one agent version per step (REL-001)**.
- `run_events (mission_id, seq)` unique. `dedupe_key` unique per mission → completion events are idempotent.
- `citations (artifact_version_id, ref)` unique.
- `model_executions (step_id, attempt, call_index)` unique.

Down migration drops all objects (reversible).

## §3 Authorization
- RLS policy on every tenant table: `workspace_id = current_setting('app.workspace_id')::uuid`.
  On `workspaces`: `id = …`. Memberships additionally readable where
  `user_id = current_setting('app.user_id')` so a user can list their own workspaces.
- `fc_app` role has no BYPASSRLS. Tables are owned by `fc_owner`. `FORCE ROW LEVEL SECURITY` is on.
- Membership is resolved with a `SECURITY DEFINER` function `resolve_membership(user_id, slug)`
  returning `(workspace_id, role)`. A null result means 404.
- Worker: `claim_next_step(worker_id, lease_seconds)` is `SECURITY DEFINER` and returns
  `(step_id, mission_id, workspace_id)` for one claimable step, chosen with `FOR UPDATE SKIP LOCKED`.

## §4 State machines
Mission: `queued → running → (completed | failed | cancelled | blocked)`. `blocked → running`
(retry, budget raise later). `failed → running` (retry step). Any active → `cancelled`.
Terminal states: `completed`, `cancelled`.
Step: `pending → ready → running → (completed | failed | cancelled)`. `running → ready`
(retryable failure with attempts left, or lease reclaim). `failed → ready` (user retry). Transitions
are enforced in `src/domain/state.ts` and asserted in SQL by guarded `UPDATE … WHERE status IN (…)`.

## §5 Execution and idempotency
1. `createMission` (one txn): insert message → mission (`queued`) → plan JSON → steps (`ready` if no
   deps, else `pending`) → event `plan.saved`. Commit. **AGT-001.**
2. Worker claims a step (lease 60 s, renewed every 15 s). `attempt += 1`. Mission → `running`.
   Emits `step.started` (dedupe `step.started:<id>:<attempt>`).
3. Runner: builds context from completed dependency outputs (DB, workspace-scoped), calls tools via
   the gateway, then the model via the provider. Each call is recorded in `model_executions` /
   `tool_executions` + `usage_ledger` as it finishes (separate short txns).
4. Completion (one txn, guarded by `status='running' AND lease_owner=$worker`): insert outputs
   (artifact version, citations, review), event `step.completed` (dedupe `step.completed:<id>`), set
   step `completed`, mark dependents `ready` when all deps are complete, and complete the mission if all
   steps are done. If the guard fails (cancelled or reclaimed), roll back and discard. **REL-001, REL-003.**
5. Crash anywhere before step 4 commits: the lease expires, another claim re-runs the attempt. Calls
   of the lost attempt whose records had already committed stay in the ledger. A call that is in flight
   at the moment of the crash is **not** recorded in `model_executions` (r2, found by
   `recovery.test.ts`). For live providers, `live_spend` is written immediately after the provider
   returns, so the spend cap still counts it unless the crash falls between those two statements.
   Backlog: write a `model_executions` row with outcome `in_flight` before the call (slice 003).
6. Failure: retryable categories (`model_error`, `invalid_output`, `timeout`) → `ready` if
   attempt < 3, else step `failed` + mission `failed`. Non-retryable (`connection_missing`,
   `spend_cap`, `budget_reached`) → step `failed` or mission `blocked` immediately.

## §6 Model and tool contracts
- `ModelProvider.generateStructured({ policy, system, messages, schemaName, schema, maxTokens, signal })`
  → `{ output, usage: {inputTokens, outputTokens}, modelId, latencyMs, stopReason }`.
  Anthropic: `client.messages.parse` with `output_config.format = zodOutputFormat(schema)`, adaptive
  thinking on the reasoning policy, and refusals mapped to `model_error` (refusal). Fake: deterministic
  generator per `schemaName`, with fault injection (`FAULTS` env / test hook).
- `SearchProvider.search({ query, count })` → `{ results: [{ title, url, snippet }] }`.
- Model policies (`src/agents/model-policies.ts`): `reasoning` → `claude-opus-5-5` (effort medium);
  `fast` → `claude-sonnet-5-5` (effort low). Prices are in `src/domain/pricing.ts` (USD per MTok).
- Prompt versions: `src/agents/prompts/<archetype>.v<N>.md`, hashed. The prompt version id is stored
  on every model execution.
- Steps: Seer → (fast) `seer.queries` → `web_search`×≤3 → (reasoning) `seer.findings`.
  Scribe → (fast) `scribe.brief`. Sentinel → (reasoning) `sentinel.review`.

## §7 Event stream
`GET /api/missions/:id/events` (SSE). It authorises like the page, then loops: select events with
`seq > lastId` (from the `Last-Event-ID` header or `?after=`), writes `id: <seq>`, and sleeps 500 ms
until the mission is terminal and drained. Durable first: events are only ever read from the table.

## §8 Cost and load
Expected per reference mission (live): roughly 4 model calls and 3 search calls. Estimated
$0.05–$0.30 per mission. Budget default $1.00. Latency target: under 3 minutes end to end, recorded as a baseline.

## §9 Telemetry
`run_events.data` carries plain-language fields and `diagnostic` (admin-only, redacted): error
class, provider request id, and HTTP status. Logs go through `log()`, which runs `redact()` on all objects.

## §10 Alternatives
See ADR-0002 (workflow engine) and ADR-0001 (auth/database).
