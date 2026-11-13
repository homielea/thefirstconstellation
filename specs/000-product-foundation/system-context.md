# System context

```text
Browser ──HTTPS──► Next.js app (pages + /api routes + SSE)
                     │  every DB access: withWorkspace(user, workspace) → RLS-scoped txn
                     ▼
                 PostgreSQL 16 (canonical state, RLS, durable step queue, run events)
                     ▲
                     │  claim_next_step() lease → RLS-scoped txn per step
                 Worker process (orchestrator: scheduler, agent runner, tool gateway,
                     │            usage recorder, spend guard)
                     ▼
                 Provider adapters ── ModelProvider ── Anthropic | Fake
                                   ── SearchProvider ── Brave | Fake
                                   ── (slice 005) EmailProvider, ChannelAdapter
```

## Boundaries
- **App ↔ DB:** the app connects as role `fc_app` (no BYPASSRLS). Every request runs
  inside a transaction that sets `app.user_id` and `app.workspace_id`. Migrations run as the owner role.
- **Worker ↔ DB:** same role. Cross-tenant work discovery happens only through the
  `SECURITY DEFINER` function `claim_next_step`, which returns ids and nothing else. All
  subsequent reads and writes are workspace-scoped.
- **Orchestrator ↔ providers:** typed adapter interfaces only. Provider-specific shapes never
  leave `src/server/providers/*`.
- **Retrieved content ↔ instructions:** library text and web results reach the model only inside
  `<untrusted_source>` data blocks, after policy and tool grants are fixed.

## Environments
- `development`: local Postgres, providers `fake` or `live` per `PROVIDER_MODE`.
- `test`: separate database `fc_test`; fake providers only.
- `staging` / `production`: decided at the end of Phase 0 (see HANDOFF.md).

## Phase map
| Slice | Capability | Build phase |
|---|---|---|
| 001 | Vertical launch-brief loop | Phase 0 |
| 002 | Constellation and onboarding | Phase 1 |
| 003 | Rooms, missions, artifacts (general) | Phase 2 |
| 004 | Library, research, memory | Phase 3 |
| 005 | Approvals, email, formations | Phase 4 |
| 006 | Pilot hardening | Phase 5 |
