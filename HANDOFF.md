# Handoff

_Updated 2026-11-13, end of the first Phase 0 increment._

## State
- **Slice 001 (vertical launch brief) is implemented and passes `npm run check`.** Results: unit 39, integration 21,
  e2e 10, eval 8/8 fake. Evidence: `specs/001-vertical-launch-brief/verification.md`, matrix: `specs/traceability.md`.
- **Phase 0 exit is not met yet.** It needs a live baseline (OBS-003), which needs an Anthropic API key.
- Pushed: branch `claude/determined-allen-6qwn6z` on homielea/thefirstconstellation (draft PR). Nothing is deployed.

## Owner actions needed
1. **Anthropic API key.** In this cloud environment ("First Constellation"), open the environment settings and add
   `ANTHROPIC_API_KEY` (as a network secret for `api.anthropic.com` if offered, otherwise as an environment variable).
   The in-session credential form refuses Anthropic hosts. Then run
   `PROVIDER_MODE=live npm run eval -- --live` (capped at $5 per session, $25 total) and record the results.
2. **Source documents.** Commit the two original specs to `docs/source/`. They were supplied in chat and are not
   yet in the repo.
3. **Staging hosting** (owner decision at the end of Phase 0): options are Vercel + Neon/Supabase Postgres + a
   small always-on worker (Fly.io/Render/Railway). The worker needs a long-running process, so serverless alone
   does not fit ADR-0002.
4. Before slice 005: decide the email sending model (connected mailbox via OAuth, or a product-managed sender).

## How to resume
```bash
# local Postgres 16 running; superuser URL in PGSUPER
scripts/dev-db.sh && npm install && cp .env.example .env.local
npm run db:migrate && npm run db:seed
npm run check
```
In this cloud container Postgres is at `/home/user/pgdata`. Start it with:
`su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /home/user/pgdata -l /home/user/pgdata/log -o '-p 5432 -k /tmp' start"`
(if the container was replaced, re-run `initdb` as in that directory's history, then `scripts/dev-db.sh`).

## Next increments (in order)
1. 001-T14: live baseline + live eval with rubric. Fix prompts if the structural pass rate is below 100%, recording new prompt versions.
2. Close the ACC-001/ACC-002 gaps: keyboard e2e for sign-in and cancel, plus a screen-reader pass (VoiceOver/NVDA).
3. Slice 002 spec to Approved: onboarding, invitations and roles, Google OAuth, still/list constellation first, then the lazy 3D.
4. Backlog: record `in_flight` model executions before calls (td §5 r2); bundle-size budget (PERF-002); export the JSON
   Schemas in CI and fail on drift.

## Known limitations
- Seer cites search snippets, not full pages (ADR-0004).
- Fake providers are clearly labelled. Their text is placeholder, not a quality signal.
- Production builds refuse email sign-in (no transport yet). Use `npm run dev` locally.
