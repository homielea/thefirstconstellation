# The First Constellation

The first product experience of a multi-tenant AI-coworker platform (the parent brand name is not
decided yet; see `src/brand.ts`). A person or team works with seven foundational AI coworkers, the
**First Seven**, in shared rooms. The work is visible, editable and controlled: plans are persisted
before they run, every step names its agent and tools, outputs are editable artifacts with citations,
and nothing leaves the workspace without explicit approval.

**Status: Phase 0, slice 001 (vertical launch-brief loop).** See `HANDOFF.md`.

## Quick start (local)

Needs Node 22+, PostgreSQL 16 (with a superuser to create roles), and, for e2e, Playwright with Chromium.

```bash
npm install
PGSUPER=postgres://postgres@localhost:5432/postgres scripts/dev-db.sh   # roles fc_owner/fc_app, dbs fc_dev/fc_test
cp .env.example .env.local
npm run db:migrate && npm run db:seed
npm run dev          # app on http://localhost:3000
npm run worker       # in a second terminal: executes mission steps
```

Sign in as `founder@example.com`. In development the sign-in link is printed to the `npm run dev`
console. The seeded workspace is **Northlight Studio**, with room **Spring launch** and two sample
library notes. Everything is sample information.

`PROVIDER_MODE=fake` (default) uses deterministic test providers and labels every mission
"Sample providers". For real output, set `PROVIDER_MODE=live`, `ANTHROPIC_API_KEY` and `BRAVE_API_KEY`.
Live spend is capped by `LIVE_SESSION_CAP_USD` (5) and `LIVE_TOTAL_CAP_USD` (25).

## Commands

| Command | What it does |
|---|---|
| `npm run check` | typecheck + unit + integration + build + browser e2e |
| `npm test` | unit tests (domain, contracts, token contrast) |
| `npm run test:integration` | Postgres integration: RLS, missions, recovery (spawns a worker and kills it), SSE replay |
| `npm run e2e` | Playwright against `next start` + worker (needs `npm run build`) |
| `npm run eval` / `npm run eval -- --live` | evaluation fixtures, results in `evals/results/` |
| `npm run db:rollback` | revert the last migration |
| `npm run contracts:export` | write JSON Schema for the Zod contracts |

## Where things are

- `specs/`: product specifications (spec-driven lifecycle), `specs/traceability.md`
- `docs/decisions/`: ADRs. `docs/design/`: tokens, content style, constellation behaviour
- `src/contracts/`: Zod schemas, the single source for API, plan, agent outputs, events
- `src/domain/`: pure logic (plan validation, state machine, pricing, redaction, citation integrity)
- `src/server/orchestrator/`: mission service, lease scheduler, step runner, tool gateway
- `src/server/providers/`: model and search adapters (Anthropic, Brave, fakes) and spend guard
- `src/agents/`: First Seven definitions, model policies, versioned prompts
- `src/worker/`: worker process. `src/app/`: Next.js pages and API routes
- `docs/operator-guide.md`: diagnosing a failed or stuck mission
