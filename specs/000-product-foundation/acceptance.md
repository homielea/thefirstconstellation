# MVP acceptance criteria (from build spec §19), mapped to slices

Each criterion is owned by the slice that must prove it. IDs are stable.

| ID | Criterion | Owning slice |
|---|---|---|
| ACPT-01 | A new workspace receives exactly one profile per First Seven archetype | 002 (seeding implemented in 001) |
| ACPT-02 | Rename + visual personalisation persists and renders in canvas, list, room, artifact attribution | 002 |
| ACPT-03 | Two-member workspace runs the reference mission request → reviewed artifact | 001 (fixed plan), 003 (planner) |
| ACPT-04 | Multi-agent mission exposes a finite plan and assignment before or during execution | 001 |
| ACPT-05 | Cancelling an active mission: no new step begins after the cancel is committed | 001 |
| ACPT-06 | Artifact collaboratively commented on and revised with version attribution | 001 (versions), 003 (comments) |
| ACPT-07 | Research claims link to stored citations | 001 |
| ACPT-08 | Outbound email cannot send without a valid, current human approval | 005 |
| ACPT-09 | Retrying a completed send does not send a duplicate | 005 |
| ACPT-10 | A completed mission can become a reusable versioned formation | 005 |
| ACPT-11 | Owners can export core data and request deletion | 006 |
| ACPT-12 | Core workflow usable at 320 px | 001 onward |
| ACPT-13 | Core workflow keyboard accessible and screen-reader navigable | 001 onward |
| ACPT-14 | Reduced-motion mode has no ambient orbital animation | 002 |
| ACPT-15 | Primary text and controls meet WCAG 2.2 AA contrast | 001 onward |
| ACPT-16 | Initial interactive shell loads before optional 3D bundle | 001 (no 3D), 002 |
| ACPT-17 | Constellation keeps target frame rate or reduces quality | 002 |
| ACPT-18 | Tenant isolation: direct IDs, search, embeddings, artifact links, event streams | 001 (IDs, artifacts, events), 004 (search, embeddings) |
| ACPT-19 | Worker retry: no duplicate artifacts, messages, approvals, external actions | 001 (artifacts, events), 005 (approvals, actions) |
| ACPT-20 | Dropped client does not stop a mission or lose durable events | 001 |
| ACPT-21 | Prompt-injection fixtures cannot grant tools, reveal secrets, bypass approval | 001 (tools), 004, 005 |
| ACPT-22 | Logs contain no OAuth tokens, API keys, full private documents, sensitive headers | 001 onward |
| ACPT-23 | Stuck workflows detected and surfaced to an operator | 001 (detection query), 006 (operator view) |
