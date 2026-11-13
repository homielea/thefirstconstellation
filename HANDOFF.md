# Handoff

_Updated 2026-11-13 after the second session (keyboard evidence, CI schema check, slice 002 draft spec). The live baseline is still blocked on the API key._

## State
- **Slice 001 (vertical launch brief) is implemented and passes `npm run check`.** Results: unit 39, integration 21,
  e2e 13, eval 8/8 fake. Evidence: `specs/001-vertical-launch-brief/verification.md`, matrix: `specs/traceability.md`.
- **Phase 0 exit is not met yet.** It needs a live baseline (OBS-003), which needs an Anthropic API key.
- Pushed: branch `claude/determined-allen-6qwn6z` → draft PR https://github.com/homielea/thefirstconstellation/pull/1
  into `main` (`main` is an empty root commit). Second-session work is on `claude/vibrant-dijkstra-yuzedt`, which
  continues from that branch. Nothing deployed. Original specs in `docs/source/`.
- **Slice 002 has a full Draft spec** (`specs/002-constellation-onboarding/`). It needs owner decisions D1–D8
  (table at the top of its `requirements.md`) before it is Approved. No slice 002 code exists.
- GitHub may still show the claude branch as the repo default; the owner can switch it to `main` in Settings → General.

## Owner actions needed
1. **Anthropic API key: still not usable.** The cloud environment "First Constellation" lists `ANTHROPIC_API_KEY`,
   but the variable is not present in the session's shell (checked in a fresh session on 2026-11-13; a request with a
   placeholder key returns `invalid x-api-key`, and the credential form refuses Anthropic hosts). Untested guess: the
   runtime withholds a variable with that exact name. To try: add the same key under another name, for example
   `FC_ANTHROPIC_API_KEY`, start a new session, and run
   `ANTHROPIC_API_KEY="$FC_ANTHROPIC_API_KEY" PROVIDER_MODE=live npm run eval -- --live`.
   Brave Search works (network secret; set `BRAVE_API_KEY=proxy-injected` in `.env.local`).
2. **Slice 002 decisions D1–D8** (guests, invitation delivery, who may personalise, one owner, Google sign-in
   client and linking, rename history, creation limit). Google sign-in also needs Google OAuth credentials (002b).
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
In a cloud container with the packaged cluster: `pg_ctlcluster 16 main start`, set a password for `postgres`
(`su postgres -c "psql -c \"ALTER ROLE postgres PASSWORD 'postgres'\""`), then
`PGSUPER=postgres://postgres:postgres@localhost:5432/postgres scripts/dev-db.sh`. Restart the cluster after a container restart.

## Next increments (in order)
1. **001-T14 live baseline (blocked on owner action 1).**
   a. Confirm the key: `[ -n "$ANTHROPIC_API_KEY" ]`, then send a tiny request with the SDK. The `.env.local` value
      must be empty or absent so the real env var wins: `loadEnvFile` does not override, but an empty
      `ANTHROPIC_API_KEY=` line in `.env.local` would still be loaded first if the shell variable is unset.
   b. `PROVIDER_MODE=live npm run eval -- --live` (6 fixtures + rubric; expected $1–3; caps $5/session, $25 total).
   c. Record the model ids, per-fixture latency and cost, rubric scores and pass rate in `verification.md` (baseline section),
      and flip OBS-003, AGT-008, INT-001 and SEC-003 (grep the worker/app logs for `sk-ant`) in `traceability.md`.
   d. If a structural check fails live: fix the prompt as a new version (`seer.v2` …), never edit v1 in place.
      Re-run the evals and record both versions.
   e. Optionally run the UI once in live mode (`PROVIDER_MODE=live npm run dev` + `npm run worker`) and capture a screenshot.
2. ACC-001 is Verified (keyboard e2e, 001-T15). ACC-002 still needs a screen-reader pass by a person (VoiceOver/NVDA).
3. Slice 002: get D1–D8 decided, mark the spec Approved, add its rows to `traceability.md`, then start 002a at
   002-T01 (no external dependencies). 002b (Google sign-in, 3D) follows after 002a is verified.
4. Backlog: record `in_flight` model executions before calls (td §5 r2); bundle-size budget (now 002-T14). CI already fails on JSON Schema drift (001-T16).

## Known limitations
- Seer cites search snippets, not full pages (ADR-0004).
- Fake providers are clearly labelled. Their text is placeholder, not a quality signal.
- Production builds refuse email sign-in (no transport yet). Use `npm run dev` locally.
