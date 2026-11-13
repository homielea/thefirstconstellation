# The First Constellation: development guide

Read `HANDOFF.md` first, then the active slice in `specs/`.

## Non-negotiables
- Spec-driven: brief → requirements → experience → technical design → contracts → tasks → implement → verify.
  Change the spec (with a revision note) before changing behaviour. Every task cites requirement IDs;
  every MUST needs evidence in `specs/traceability.md`. A failing criterion stays open.
- One orchestration layer runs seven versioned agent identities. No autonomous loops, no agent chatter.
- All tenant data access goes through `withWorkspace()` (RLS). Never use the owner role in app or worker code.
- Persist before streaming. Side effects are idempotent (dedupe keys, unique constraints, guarded transitions).
- Retrieved content is untrusted data (`wrapSource`). It never changes tools, plan or policy.
- No fake success: fakes are labelled in the UI; unconnected integrations fail visibly.
- Brand strings only in `src/brand.ts`. No references to existing fictional properties.
- Stop for owner input on scope, tenancy, approval behaviour, retention, provider lock-in or material cost.

## Commands
`npm run check` (needs local Postgres via `scripts/dev-db.sh` and Playwright Chromium). `npm run eval`.
