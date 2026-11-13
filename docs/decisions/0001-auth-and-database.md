# ADR-0001: Auth and database

Status: Accepted (2026-11-13)

## Decision
- **PostgreSQL 16** is the canonical store. Tenant isolation is enforced by **row-level security**
  on every tenant table. The app and worker use role `fc_app` (no BYPASSRLS), with
  `FORCE ROW LEVEL SECURITY`. Each request runs in a transaction that sets `app.workspace_id`.
- **Plain SQL migrations** (`migrations/NNNN_name.up.sql` / `.down.sql`) run by `scripts/migrate.ts`.
  Queries use `pg` with hand-written SQL in small repository modules. No ORM: the RLS policies,
  guarded state transitions and `SECURITY DEFINER` functions are explicit SQL either way, and an
  ORM schema would be a second source of truth for the same tables.
- **Auth:** we implement the magic link ourselves (hashed single-use tokens, 15 min expiry,
  server-side sessions, an opaque HttpOnly cookie). **Google OAuth is moved to slice 002** (scope
  decision: Phase 0 needs only one sign-in path to prove the loop). When OAuth arrives we will
  evaluate Auth.js against a small OAuth client, and keep the `users`/`sessions` tables.

## Alternatives
- Drizzle/Prisma: better typing, but they duplicate the schema and handle RLS awkwardly.
- Auth.js now: adds a large dependency before we need OAuth, and its email provider needs a real
  mail transport.
- Supabase/Neon auth: provider lock-in before staging hosting is decided.

## Consequences
Repositories must type their rows by hand (validated in tests). OAuth work is explicit in slice 002.
