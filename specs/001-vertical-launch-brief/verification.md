# 001 — Verification

Date: 2026-11-13 · Environment: cloud dev container (Linux, Node 22.23, PostgreSQL 16.15, Chromium via
Playwright 1.63) · Providers: fake (deterministic) unless stated · Commit: see git log for this file.

## Automated results
| Suite | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | pass |
| Unit | `npm test` | 39/39 pass (plan, state, pricing, redaction, integrity, contracts, token contrast) |
| Integration (real Postgres) | `npm run test:integration` | 21/21 pass, stable over 3 consecutive runs |
| Build | `npm run build` | pass |
| Browser e2e (production build + worker) | `npm run e2e` | 13/13 pass (r2: adds keyboard-only sign-in, version history and cancel) |
| Evaluations (fake) | `npm run eval` | 8/8 fixtures structural pass (`evals/results/2026-11-13.fake.json`) |

Requirement-level mapping: `specs/traceability.md`.

## Named visual states (desktop 1280 and mobile 320)
Captured to `tests/e2e/output/` on each e2e run (not committed): `room-empty`, `mission-running`,
`mission-failed`, `mission-cancel-confirm`, `mission-cancelled`, `mission-completed`, `artifact-edited`,
`mobile-room`, `mobile-mission`, `mobile-artifact`, `signin-no-email-transport`. Reviewed 2026-11-13
against experience.md: hierarchy, status-as-text, stacked history at 320 px, and the review-version notice all match.
Observed: plan step numbering and status chips fit at 320 px; long objectives wrap without overflow.

## Recovery and failure injection
- Worker process killed with exit 137 immediately after Scribe's model call. The step was reclaimed after the lease
  (2 s in test) by a new process. Result: one brief version, one completion event per step, research not
  re-run, `find_stuck_steps` reported the step while orphaned (`tests/integration/recovery.test.ts`).
- Dropped stream: the client disconnected after event 1. The mission completed without it, and replay from
  `Last-Event-ID` returned events 2…N exactly once.
- Injected model error, invalid output ×3, hang + cancel, tool refusal, missing search connection, budget exhaustion:
  all covered in `tests/integration/execution.test.ts`.

## Findings that changed the spec or code (change protocol)
1. `workspaces.workspace_id` (generated) was nullable. Found by the catalog test, fixed in migration 0001 before release.
2. Technical design §5 said lost-attempt calls stay in the ledger. A call in flight at crash time is not recorded.
   Spec revised (r2), limitation recorded, fix planned for slice 003.
3. The heartbeat interval was fixed at 15 s, so a lease shorter than the heartbeat expired under a healthy worker. The heartbeat is now
   min(15 s, lease/4).
4. The composer form and its textarea shared an accessible name. The form is now labelled "Begin a mission".

## Not yet verified (open)
- **OBS-003 live baseline, and live checks of AGT-008, INT-001 and SEC-003.** Blocked: no Anthropic API key in this
  environment. The cloud session's own Anthropic access cannot be used by app code, and the credential form refuses
  Anthropic hosts. Brave Search is connected (probe returned HTTP 200).
- Screen-reader review (ACC-002): needs a person with VoiceOver or NVDA. Keyboard assertions (ACC-001) were closed in
  r2 (001-T15); the live region is checked automatically for one announcement per transition.
- Staging demonstration. Hosting is to be decided at the end of Phase 0 (owner decision).
- Two-user collaboration in the UI (the second member exists in seed data, but is exercised only via tenancy and roles in this slice).

## Baseline (fake providers; not a quality signal)
Reference mission, fake providers: 4 model calls + 4 tool calls, about 3 s end to end with a 700 ms artificial delay per call.
Live latency and cost will be recorded here once a key is available (`npm run eval -- --live`, about $0.10–$1.00).
