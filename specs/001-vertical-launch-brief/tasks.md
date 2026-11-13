# 001 — Tasks

Each task covers requirement IDs, names the files it changes, and states its proof.
Flags: S = schema change, P = permissions, V = provider, C = cost.

| ID | Task | Requirements | Files | Proof | Deps | Flags |
|---|---|---|---|---|---|---|
| 001-T01 | Repo scaffold, tokens, CI workflow, local Postgres scripts | VIS-001 | `package.json`, `src/styles/tokens.css`, `.github/workflows/ci.yml`, `scripts/dev-db.sh` | `npm run typecheck` passes; CI yaml lints | — | — |
| 001-T02 | Contracts + fixtures + JSON Schema export | AGT-002, AGT-004, AGT-006, DAT-002 | `src/contracts/*` | `tests/unit/contracts.test.ts` | T01 | S |
| 001-T03 | Migration 0001 with RLS, roles, claim function; up/down runner | DAT-001, DAT-004, SEC-001, REL-006 | `migrations/0001_*`, `scripts/migrate.ts` | `tests/integration/migrations.test.ts` (up/down/up) | T01 | S,P |
| 001-T04 | `withWorkspace`, membership resolution, magic-link auth, rate limit | PROD-003, SEC-002, SEC-004, SEC-006 | `src/server/db`, `src/server/auth` | `tests/integration/auth.test.ts` | T03 | P |
| 001-T05 | First Seven definitions, workspace creation, seed script | PROD-004 | `src/agents/*`, `src/server/workspaces.ts`, `scripts/seed.ts` | `tests/integration/workspace.test.ts` (exactly seven) | T03 | S |
| 001-T06 | Domain: plan validation, state machine, pricing, redaction, citation integrity | AGT-002, AGT-005, AGT-006, SEC-003, OBS-001 | `src/domain/*` | `tests/unit/*.test.ts` | T02 | — |
| 001-T07 | Provider adapters (Anthropic, Brave, fakes) + spend guard | INT-001, INT-002, SEC-005, PROD-005 | `src/server/providers/*` | `tests/unit/providers.test.ts`, `tests/integration/spend.test.ts` | T02 | V,C |
| 001-T08 | Mission service: create (plan persisted first), cancel, retry | PROD-001, PROD-002, AGT-001, EXP-007, REL-003, REL-004 | `src/server/orchestrator/missions.ts` | `tests/integration/missions.test.ts` | T05,T06 | S |
| 001-T09 | Scheduler + worker (lease, heartbeat, reclaim) + agent runner + tool gateway | AGT-003, AGT-004, AGT-007, AGT-008, AGT-009, REL-001, REL-005, REL-006, DAT-003 | `src/server/orchestrator/*`, `src/worker/main.ts` | `tests/integration/execution.test.ts`, `tests/integration/recovery.test.ts` | T07,T08 | C |
| 001-T10 | SSE event stream with replay | EXP-003, REL-002 | `src/app/api/missions/[id]/events/route.ts` | `tests/integration/events-stream.test.ts`, e2e reconnect | T09 | — |
| 001-T11 | Pages: sign-in, room, mission, artifact; save version | EXP-001..008, ACC-001..004, VIS-002, PERF-001 | `src/app/**` | `tests/e2e/*` (happy path, keyboard, 320 px, axe, screenshots) | T10 | — |
| 001-T12 | Tenant isolation across pages, API and stream | SEC-001, SEC-002 | tests only | `tests/integration/tenancy.test.ts`, e2e 404 | T11 | P |
| 001-T13 | Eval suite (≥5 fixtures) + runner | OBS-002, AGT-008 | `evals/*` | `npm run eval` (fake) results file | T09 | C |
| 001-T14 | Live baseline run under the cap | OBS-003 | `specs/001/verification.md` | recorded run | T13 + Anthropic key | V,C |
