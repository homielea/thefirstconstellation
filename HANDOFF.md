# Handoff

_Updated 2026-11-13, end of the first Phase 0 increment (handed to a new session that has `ANTHROPIC_API_KEY`)._

## State
- **Slice 001 (vertical launch brief) is implemented and passes `npm run check`.** Results: unit 39, integration 21,
  e2e 10, eval 8/8 fake. Evidence: `specs/001-vertical-launch-brief/verification.md`, matrix: `specs/traceability.md`.
- **Phase 0 exit is not met yet.** It needs a live baseline (OBS-003), which needs an Anthropic API key.
- Pushed: branch `claude/determined-allen-6qwn6z` → draft PR https://github.com/homielea/thefirstconstellation/pull/1
  into `main` (`main` is an empty root commit). CI green on head `e436f10`. Nothing deployed. Original specs in `docs/source/`.
- GitHub may still show the claude branch as the repo default; the owner can switch it to `main` in Settings → General.

## Owner actions needed
1. **Anthropic API key.** Done by the owner: `ANTHROPIC_API_KEY` is an environment variable in the cloud environment
   "First Constellation" (new sessions only). Brave Search is a network secret there (the proxy injects it; set
   `BRAVE_API_KEY=proxy-injected` in `.env.local`).
2. **Staging hosting** (owner decision at the end of Phase 0): options are Vercel + Neon/Supabase Postgres + a
   small always-on worker (Fly.io/Render/Railway). The worker needs a long-running process, so serverless alone
   does not fit ADR-0002.
3. Before slice 005: decide the email sending model (connected mailbox via OAuth, or a product-managed sender).

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
1. **001-T14 live baseline (do this first in the new session).**
   a. Confirm the key: `[ -n "$ANTHROPIC_API_KEY" ]`, then send a tiny request with the SDK. The `.env.local` value
      must be empty or absent so the real env var wins: `loadEnvFile` does not override, but an empty
      `ANTHROPIC_API_KEY=` line in `.env.local` would still be loaded first if the shell variable is unset.
   b. `PROVIDER_MODE=live npm run eval -- --live` (6 fixtures + rubric; expected $1–3; caps $5/session, $25 total).
   c. Record the model ids, per-fixture latency and cost, rubric scores and pass rate in `verification.md` (baseline section),
      and flip OBS-003, AGT-008, INT-001 and SEC-003 (grep the worker/app logs for `sk-ant`) in `traceability.md`.
   d. If a structural check fails live: fix the prompt as a new version (`seer.v2` …), never edit v1 in place.
      Re-run the evals and record both versions.
   e. Optionally run the UI once in live mode (`PROVIDER_MODE=live npm run dev` + `npm run worker`) and capture a screenshot.
2. Close the ACC-001/ACC-002 gaps: keyboard e2e for sign-in and cancel, plus a screen-reader pass (VoiceOver/NVDA).
3. Slice 002 spec to Approved: onboarding, invitations and roles, Google OAuth, still/list constellation first, then the lazy 3D.
4. Backlog: record `in_flight` model executions before calls (td §5 r2); bundle-size budget (PERF-002); export the JSON
   Schemas in CI and fail on drift.

## Known limitations
- Seer cites search snippets, not full pages (ADR-0004).
- Fake providers are clearly labelled. Their text is placeholder, not a quality signal.
- Production builds refuse email sign-in (no transport yet). Use `npm run dev` locally.
