# 002 — Tasks

Status: Draft, awaiting owner approval with `requirements.md`. No task starts before approval.
Each task covers requirement IDs, names the files it changes, and states its proof.
Flags: S = schema change, P = permissions, V = provider, C = cost.

## 002a (no external dependencies)
| ID | Task | Requirements | Files | Proof | Deps | Flags |
|---|---|---|---|---|---|---|
| 002-T01 | Contracts: `agent-profile@2`, `StarName`, `AuditEvent`, API shapes, fixtures | SEC-011, OBS-004, DAT-006 | `src/contracts/*` | `tests/unit/contracts.test.ts`; CI schema check | — | S |
| 002-T02 | Migration 0002: settings columns, invitations, room grants, audit events, one-owner and name indexes | DAT-007, PROD-007, SEC-008 | `migrations/0002_*` | integration: up, down, up; slice 001 suite still green | T01 | S,P |
| 002-T03 | Role table and `app.role`; RLS for new tables and admin-only writes | SEC-007, PROD-016 | `src/domain/roles.ts`, `src/server/db/pool.ts`, migration 0002 | unit roles; integration direct-id per table and role | T02 | P |
| 002-T04 | Guest visibility by room grant across slice 001 tables | PROD-017, SEC-007 | migration 0002, `src/server/queries.ts` | integration: guest matrix (granted and ungranted room, mission, artifact, stream) | T03 | P |
| 002-T05 | Idempotent constellation creation, slug, limits, audit | PROD-006, PROD-007, SEC-010, OBS-004 | `src/server/workspaces.ts`, `src/server/audit.ts` | integration: repeat key, exactly seven, limit | T03 | S |
| 002-T06 | Onboarding pages with resume | PROD-006, PROD-008, PROD-011..013, EXP-014, ACC-007, ACC-010 | `src/app/onboarding/**` | e2e: keyboard, with and without outcome, resume | T05 | — |
| 002-T07 | `star-visual` recipe and still SVG components | VIS-004, ACC-008 | `src/domain/star-visual.ts`, `src/components/constellation/still.tsx` | unit: pinned recipes, label contrast | T01 | — |
| 002-T08 | Constellation home: list, still constellation, composer, active missions | EXP-009, ACC-006, ACC-009, VIS-003 | `src/app/c/[slug]/page.tsx` | e2e: list actions, 320 px, axe, reduced motion | T07 | — |
| 002-T09 | Star focus layer, star page, glossary | EXP-010, EXP-011, ACC-007 | `src/app/c/[slug]/stars/**`, `glossary/**` | e2e: open, Escape, focus return, direct link | T08 | — |
| 002-T10 | Personalise: save version with conflict handling, preview, reset | PROD-009, PROD-010, EXP-012, SEC-011, REL-007, DAT-006 | `src/server/stars.ts`, `stars/[id]/personalise/**` | integration: conflict, duplicate name; e2e: rename shows in list, room, plan, artifact; old events unchanged | T09 | — |
| 002-T11 | Communication preference: star override, else constellation setting | PROD-011 | `src/server/orchestrator/context.ts` | unit: resolution; `npm run eval` (fake) | T10 | — |
| 002-T12 | Invitations, accept, members, role change, removal | PROD-015, PROD-016, SEC-008, SEC-010, REL-007, EXP-013 | `src/server/members.ts`, `settings/members/**`, `invitations/[token]/**` | integration: every invitation state; e2e: two browser contexts, guest view | T04 | P |
| 002-T13 | Personal settings: still constellation, display name | VIS-003 | `src/app/settings/**` | e2e: setting persists across contexts | T08 | — |
| 002-T14 | Bundle-size budget check in CI | PERF-005 | `scripts/bundle-budget.ts`, `ci.yml` | CI step fails over 200 kB | — | — |
| 002-T15 | 002a verification: traceability rows, screenshots of named states, screen-reader pass | all (a) | `specs/002-*/verification.md`, `specs/traceability.md` | recorded results | T06..T14 | — |

## 002b (after 002a is verified)
| ID | Task | Requirements | Files | Proof | Deps | Flags |
|---|---|---|---|---|---|---|
| 002-T16 | Google sign-in with a fake issuer for tests | PROD-014, SEC-009, EXP-013, ACC-007 | `src/server/auth/google.ts`, `src/app/auth/google/**` | integration: state, nonce, signature, unverified address, linking; log scan for tokens | owner: D5, D6, Google credentials | V |
| 002-T17 | 3D constellation as a lazy chunk over the still view | PERF-003, VIS-005, ACC-006 | `src/components/constellation/canvas.tsx` | e2e: shell usable with the chunk blocked; canvas `aria-hidden`; labels never rotate | T08 | — |
| 002-T18 | Adaptive quality and pause rules | PERF-004, VIS-003, OBS-004 | `src/domain/quality.ts`, canvas | unit: stepper; e2e: forced slow frames reach the still view | T17 | — |
| 002-T19 | 002b verification, including a manual frame-rate check on real hardware | all (b) | `specs/002-*/verification.md` | recorded results | T16..T18 | — |
