# Traceability matrix

One row per MUST requirement in the active slice (001). Statuses: Draft, Approved, Implementing,
Implemented, Verified, Deferred, Rejected. "Verified" means automated or reviewed evidence exists, as
listed in `001-vertical-launch-brief/verification.md`.
Test paths: U = `tests/unit/*`, I = `tests/integration/*`, E = `tests/e2e/run.mjs`, V = `evals/`.

| Requirement | Experience / design | Technical design | Task | Evidence | Status |
|---|---|---|---|---|---|
| PROD-001 | exp §2.1 | td §5.1 | 001-T08 | I execution "happy path"; E keyboard mission | Verified |
| PROD-002 | exp §2.2 | td §6 | 001-T08 | U plan validation; I happy path step order | Verified |
| PROD-003 | exp §3 | ADR-0001 | 001-T04 | I auth; E sign-in (production build refuses without transport) | Verified |
| PROD-004 | — | td §2 | 001-T05 | I "exactly one profile per archetype"; U First Seven | Verified |
| PROD-005 | exp §2.2 | td §6 | 001-T07 | E keyboard mission (label asserted) | Verified |
| AGT-001 | exp §2.2 | td §5.1 | 001-T08 | I happy path (queued + 3 steps + plan row before claim) | Verified |
| AGT-002 | — | td §6 | 001-T02/T06 | U plan fixtures (cycle, >12 steps, unknown archetype, forward dep) | Verified |
| AGT-003 | exp §2.2 tools | td §6 | 001-T09 | I tool gateway "refuses a tool outside allowed tools" | Verified |
| AGT-004 | — | td §6 | 001-T09 | I invalid-output retries; V invalid-output-exhausted | Verified |
| AGT-005 | — | td §5.4 | 001-T06/T09 | U dependency unlocking; I failure leaves review pending | Verified |
| AGT-006 | exp §2.3 | td §6 | 001-T06/T09 | U citation integrity (findings, brief markers) | Verified |
| AGT-007 | exp §2.3 | td §6 | 001-T09 | U Sentinel grants; E review disclaimer; review never approves (no approval tool exists) | Verified |
| AGT-008 | — | ADR-0004 | 001-T09/T13 | I hostile library; V hostile-source (fake). **Live-model behaviour pending OBS-003** | Implemented |
| AGT-009 | exp §5 | td §5.6 | 001-T09 | I "fails the mission after 3 attempts" | Verified |
| EXP-001 | exp §2.1 | — | 001-T11 | E room empty state | Verified |
| EXP-002 | exp §2.2 | — | 001-T11 | E agents, tools, expected output shown | Verified |
| EXP-003 | exp §2.2, §5 | td §7 | 001-T10/T11 | E live progress without reload | Verified |
| EXP-004 | exp §9 | td §5.6 | 001-T11 | E failed step + retry | Verified |
| EXP-005 | exp §2.3 | — | 001-T11 | E edit + save version + review version notice | Verified |
| EXP-006 | exp §2.2 | td §9 | 001-T11 | E run history ≥ 8 rows with totals; screenshot mission-completed | Verified |
| EXP-007 | exp §4 | td §4 | 001-T08/T11 | I cancellation; E in-page confirmation | Verified |
| DAT-001 | — | td §2 | 001-T03 | I catalog check (NOT NULL + forced RLS on every tenant table) | Verified |
| DAT-002 | — | td §2 | 001-T09/T11 | I artifact attribution; E version 2 by person | Verified |
| DAT-003 | exp §2.3 | td §2 | 001-T09 | I happy path citations > 0; E sources list | Verified |
| DAT-004 | exp §2.2 | td §2 | 001-T09 | I strictly increasing seq; dedupe keys | Verified |
| DAT-005 | — | td §2 | 001-T08 | I happy path (messages separate from events) | Verified |
| REL-001 | — | td §5 r2 | 001-T09 | I recovery: real worker process killed mid-step, restarted, one brief version | Verified |
| REL-002 | exp §9 | td §7 | 001-T10 | I event stream replay after drop | Verified |
| REL-003 | exp §4 | td §5.4 | 001-T08 | I cancellation (in-flight discarded, nothing claimed); E cancel | Verified |
| REL-004 | exp §9 | td §5.6 | 001-T08 | I retry resumes without re-running research; E retry | Verified |
| REL-005 | exp §9 | td §5.6 | 001-T09 | I budget blocks; V budget-exhausted | Verified |
| REL-006 | — | ADR-0002 | 001-T09 | I recovery (`find_stuck_steps` lists the expired lease) | Verified |
| SEC-001 | — | td §3 | 001-T03/T12 | I tenancy (direct ids ×7 tables, WITH CHECK, stream); I app role has no BYPASSRLS | Verified |
| SEC-002 | — | td §3 | 001-T04/T12 | E outsider 404 for page and stream; I membership | Verified |
| SEC-003 | — | td §9 | 001-T06 | U redaction | Verified (unit). Log audit of a live run pending OBS-003 |
| SEC-004 | — | ADR-0001 | 001-T04 | I hashed, 32-byte, single-use, expiry | Verified |
| SEC-005 | — | ADR-0003 | 001-T07 | I spend cap refuses past total | Verified |
| SEC-006 | — | ADR-0001 | 001-T04 | I rate limit 5 / 15 min | Verified |
| INT-001 | — | ADR-0003 | 001-T07 | Adapter interface + fakes in all tests. **Anthropic adapter not exercised live** | Implemented |
| INT-002 | exp §9 | ADR-0004 | 001-T07 | I connection_missing blocks, no artifacts; V search-disconnected; Brave reachable (HTTP 200 probe) | Verified |
| OBS-001 | exp §2.2 | td §9 | 001-T09 | I model executions recorded with cost; E run history | Verified |
| OBS-002 | — | — | 001-T13 | V 8 fixtures, 100% structural (fake) | Verified |
| OBS-003 | — | td §8 | 001-T14 | — blocked: no Anthropic API key in this environment | Approved (blocked) |
| ACC-001 | exp §4 | — | 001-T11, 001-T15 | E keyboard only, with focus indicator asserted: sign-in request, composer → submit, open brief → edit → save, version history, cancel (focus to question and back) | Verified |
| ACC-002 | exp §7 | — | 001-T11, 001-T15 | E landmarks; E live region announces each transition once, ending with completion. **Screen-reader review not done (needs a person with VoiceOver/NVDA)** | Implemented |
| ACC-003 | tokens.md | — | 001-T01 | U contrast for all text/surface pairs | Verified |
| ACC-004 | exp §6 | — | 001-T11 | E 320 px no horizontal scroll ×3 views | Verified |
| ACC-005 | — | — | 001-T11 | E axe: room, mission, artifact (no serious/critical) | Verified |
| VIS-001 | tokens.md | — | 001-T01 | Code review: components use CSS variables only | Verified (review) |
| VIS-002 | exp §8 | — | 001-T11 | E reduced motion → animation none | Verified |
| PERF-001 | — | ADR-0005 | 001-T11 | E no canvas; no 3D dependency in package.json | Verified |

SHOULD: EXP-008 Verified (E version attribution). PERF-002 Deferred: Next 16 build output no longer
prints first-load sizes. A bundle-size check is added in slice 002, when the 3D bundle arrives.

Later slices (003–006) have briefs only. Their requirements get IDs when they reach Approved.

Slice 002 has a full Draft spec (r1, 2026-11-13). Its rows are added here when the owner approves it.
