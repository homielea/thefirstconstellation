# 002 — Technical design

Revision: r1 (2026-11-13). Status: Draft, awaiting owner approval with `requirements.md`.
Builds on slice 001 (`../001-vertical-launch-brief/technical-design.md`); only changes are listed.

## §1 Components
| Module | Change |
|---|---|
| `src/server/workspaces.ts` | `createConstellation` (idempotent), settings, onboarding state |
| `src/server/members.ts` (new) | invitations, accept, role change, removal, room grants |
| `src/server/stars.ts` (new) | read star view, save profile version with optimistic check |
| `src/server/audit.ts` (new) | `recordAudit(db, type, data)` inside the caller's transaction |
| `src/server/auth/google.ts` (new, 002b) | OpenID Connect client (ADR-0008) |
| `src/domain/star-visual.ts` (new) | pure: `VisualConfig` → geometry and palette recipe used by SVG and 3D |
| `src/domain/roles.ts` (new) | pure: `can(role, action)` table, the single source for server checks and tests |
| `src/app/onboarding/**`, `src/app/c/[slug]/{page,stars,glossary,settings}/**` | pages (thin) |
| `src/components/constellation/still.tsx` | server component, SVG from `star-visual` |
| `src/components/constellation/canvas.tsx` (002b) | client, `next/dynamic` with `ssr: false`, React Three Fiber |

## §2 Data model (migration `0002_constellation`)
```text
workspaces            + use_kind text CHECK IN ('individual','team') DEFAULT 'team'
                      + communication_style text CHECK IN ('concise','balanced','expansive') DEFAULT 'balanced'
                      + first_outcome text NULL (≤2000)
                      + onboarding_step int NOT NULL DEFAULT 4      -- existing rows are complete
                      + creation_key uuid NULL UNIQUE               -- idempotent creation (PROD-007)
users                 + still_constellation boolean NOT NULL DEFAULT false
                      + google_sub text NULL UNIQUE                 -- 002b
invitations (tenant)  id, workspace_id, email (lowercase), role CHECK IN ('admin','member','guest'),
                      token_hash bytea UNIQUE, room_ids uuid[] NOT NULL DEFAULT '{}',
                      invited_by, expires_at, accepted_at, accepted_by, revoked_at, created_at
                      partial UNIQUE (workspace_id, email) WHERE accepted_at IS NULL AND revoked_at IS NULL
room_grants (tenant)  workspace_id, room_id, user_id, granted_by, created_at, PRIMARY KEY (room_id, user_id)
audit_events (tenant) id, workspace_id, actor_user_id, type, data jsonb, created_at
agent_profiles        + UNIQUE index on (workspace_id, lower(current_name)); current_name text
                        maintained in the same transaction as the version insert (SEC-011)
workspace_memberships + partial UNIQUE (workspace_id) WHERE role = 'owner'   -- one owner (D4)
```
`agent-profile@1` already carries the visual configuration and communication style. Adding
"use constellation setting" makes `communicationStyle` nullable in a new `agent-profile@2`; readers
accept both (contracts.md).

## §3 Authorisation (SEC-007, PROD-016, PROD-017)
- `withWorkspace` also sets `app.role` from the resolved membership. It is set by the server from
  the database, never from the request.
- RLS policies added or tightened:
  - `invitations`, `audit_events`: select and write only when `app.role IN ('owner','admin')`;
    `audit_events` has no update or delete grant.
  - `workspace_memberships`: update and delete only for owner or admin, never on the owner row
    (`role <> 'owner'` in `USING` and `WITH CHECK`).
  - `agent_profile_versions`, `agent_profiles`: insert and update only for owner or admin.
  - `rooms`, `missions`, `messages`, `run_events`, `artifacts`, `artifact_versions`, `citations`,
    `mission_plans`, `mission_steps`: when `app.role = 'guest'`, rows are visible only where the room
    is in `room_grants` for `app.user_id`. Guests get no insert, update or delete on them.
  - `source_documents`, executions and ledgers: not visible to guests.
- The worker's scope carries the role `worker`: the access it has today on execution tables, and
  none of the owner-or-admin writes. Guest restrictions apply only when `app.role = 'guest'`.
- Server checks use `can(role, action)` before the query, so the person gets a clear 403 rather than
  an empty result. RLS is the backstop and is tested directly with the app role.
- Accepting an invitation and creating a constellation need to act before a membership exists.
  They are `SECURITY DEFINER` functions (`accept_invitation(p_user, p_token_hash)`,
  `create_constellation(...)`) that validate inputs, return ids only, and are the only such entry points.

## §4 Flows
1. **Create (PROD-007):** the form carries a `creationKey` generated when the page was rendered.
   `create_constellation` inserts workspace (with `creation_key`), owner membership, seven profiles and
   versions, the first room and `workspace.created` in one transaction. On unique violation of
   `creation_key` it returns the existing id. Slug: lowercase name, non-alphanumerics to hyphens,
   2–40 characters; on collision a numeric suffix is added and shown before submission.
2. **Save a star (PROD-009, REL-007):** request carries `baseVersion`. One transaction: lock the
   profile row, compare `current_version`, insert version `n+1`, update `current_version` and
   `current_name`, audit. A mismatch returns 409 with the current version. A duplicate name returns
   422 from the unique index.
3. **Invite and accept (PROD-015, SEC-008):** the token is generated in the server, the hash stored,
   and the link returned once in the response; it cannot be shown again (revoke and re-invite instead).
   `accept_invitation` checks hash, expiry, not revoked, and that the session user's address equals
   the invited address; it inserts membership and room grants `ON CONFLICT DO NOTHING`, marks the
   invitation accepted and writes the audit event. A second call returns the same membership.
4. **Remove a member (PROD-016):** delete membership and grants in one transaction. Sessions are per
   user, not per workspace, so access ends because `resolve_membership` finds no row on the next request.
5. **Renames and history (PROD-010, DAT-006):** pages read the current profile version for names and
   visuals. `run_events.message` and run history stay as written. Mission steps already record the
   `agent_profile_version` they ran with.
6. **Communication style (PROD-011):** `src/server/orchestrator/context.ts` already appends the
   star's name and a style line to the system prompt. It changes to resolve `star override ??
   constellation setting`. The versioned prompt files are untouched, so no new prompt version is
   needed; the evals are re-run because agent input changes. The name in that line is constrained by
   `StarName` (SEC-011).

## §5 Constellation rendering
- **`star-visual` (VIS-004):** `recipe(config) → { form, rings[], symbolPath, hue, lightness,
  driftPeriodS, phase }`, pure and seeded by `config.seed`. Hues are chosen from three palette anchors
  by `lightTemperature`; no free hue. Unit tests pin recipes for the seven defaults.
- **Still (002a):** server component renders one SVG for the home (fixed layout: seven positions on
  two ellipses from a constant table) and a per-star SVG for lists and attribution. No client JS.
- **3D (002b, PERF-003..004, VIS-005):** `canvas.tsx` is loaded with `next/dynamic({ ssr: false })`
  after first paint, only when the still setting is off, reduced motion is not requested and WebGL2
  is available. It mounts over the SVG in the same box. Labels are DOM elements positioned from
  projected coordinates (`@react-three/drei` `Html` is avoided to keep the chunk small).
  An error boundary and a load timeout of 8 s leave the SVG in place silently.
- **Adaptive quality:** a frame-time sampler keeps a 2 s window; median > 33 ms steps
  `dprCap 2 → 1.5 → 1`, then particles off, then flat shading, then unmounts the canvas. Each step posts
  `constellation.quality_step` once. `document.visibilitychange` and an open focus layer pause the loop.
- New dependencies (002b only): `three`, `@react-three/fiber`. Recorded in ADR-0005 when it becomes final.

## §6 Google sign-in (002b, ADR-0008 proposed)
`/auth/google/start` creates `state`, `nonce` and a PKCE verifier, stores them in a short-lived
HttpOnly cookie, and redirects. `/auth/google/callback` verifies `state`, exchanges the code, verifies
the ID token against Google's published keys (issuer, audience, expiry, nonce), requires
`email_verified`, then finds the user by `google_sub`, else by address (linking, D6), else creates
one, and starts the same server-side session as the magic link. Tokens are discarded after
verification. Configuration: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; absent means the route
returns 404 and the button is not rendered. Tests run against a local fake issuer that signs tokens
with a test key; the issuer URL is configuration.

## §7 Tests
- Unit: `roles` table, slug and name validation, `star-visual` recipes, quality stepper (pure state machine).
- Integration (real Postgres, app role): creation idempotency and exactly seven; RLS for every new
  table and for guests on every existing table, by direct id; invitation states (expired, revoked,
  wrong address, reuse); one-owner constraint; version conflict; migration up, down, up; OAuth callback
  cases against the fake issuer.
- e2e: onboarding by keyboard (with and without an outcome, resume mid-way); rename shows in list,
  still constellation, room, plan and artifact attribution; invitation by a second browser context;
  guest sees only granted rooms; 320 px and axe on each new view; reduced motion has no animation;
  (b) shell usable with the 3D chunk blocked; forced slow frames step quality down to the still view.
- Evals: re-run after the style resolution change in §4.6.

## §8 Risks
- Guest RLS touches every slice 001 table. It is the largest change and is tested before any guest UI exists.
- The R3F chunk size is unknown until built; PERF-005's budget excludes the lazy chunk, and the chunk
  gets its own recorded size in `verification.md`.
- Headless Chromium uses software WebGL, so frame-rate targets (60/30 fps) are verified by the
  stepper's logic in tests and by a manual check on real hardware, recorded as such.
