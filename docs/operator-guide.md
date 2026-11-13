# Operator guide (Phase 0)

## A mission failed or is paused
1. Open the mission page. The failed step shows its error category and attempts. Run history shows each model and
   tool call, with outcome, latency and cost.
2. Admin diagnostics (provider status, request id) are stored, redacted, in `run_events.diagnostic`:
   `SELECT seq, type, message, diagnostic FROM run_events WHERE mission_id = '<id>' ORDER BY seq;` (as the owner role).
3. Categories: `connection_missing` (key missing or rejected: fix the credential, then "Retry step");
   `spend_cap` (raise `LIVE_*_CAP_USD` only with owner approval); `budget_reached` (raising a mission budget arrives in
   slice 003); `invalid_output` / `model_error` / `timeout` (retry; if repeated, run `npm run eval -- --only=<fixture>`).

## A mission looks stuck
`SELECT * FROM find_stuck_steps(60);` lists running steps whose lease expired more than 60 s ago. A healthy worker
reclaims them automatically. If none is running, start one (`npm run worker`). Leases are 60 s, with heartbeats every 15 s.

## Revoking a connection
Phase 0 connections are environment credentials (`ANTHROPIC_API_KEY`, `BRAVE_API_KEY`). Remove or rotate the key at
the provider and in the environment, then restart the app and the worker. Missions then block with
`connection_missing`. They do not fabricate results. The connection framework with in-app revocation arrives in slice 005.
