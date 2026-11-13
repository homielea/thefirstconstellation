# 002 — Contracts and fixtures

Revision: r1 (2026-11-13). Status: Draft, awaiting owner approval with `requirements.md`.
Rules from slice 001 apply: Zod is the source of truth, JSON Schemas are generated and checked in
CI, stored JSON is validated on read, and breaking changes add a new version beside the old one.

| Contract | File | Version | Note |
|---|---|---|---|
| `AgentProfileConfig` | `agent-profile.ts` | `agent-profile@2` | `communicationStyle` becomes nullable (null = use the constellation setting). `@1` stays readable. |
| `VisualConfig` | `agent-profile.ts` | unchanged | Already holds symbol family, core form, ring density, light temperature, motion temperament, seed |
| `StarName` | `agent-profile.ts` | new | `^[\p{L}\p{N}][\p{L}\p{N} '\-]{0,39}$`, trimmed, single spaces |
| `AuditEvent` (discriminated union by `type`) | `audit.ts` | `audit-event@1` | Ids and role names only, never content |
| `Role`, `InvitableRole` | `common.ts` | new | `owner / admin / member / guest`; invitable excludes `owner` |
| API shapes below | `api.ts` | `api@2` (additive) | |

## API (slice 002)
```text
POST   /api/constellations                 {creationKey, name, useKind, outcome?}      → 201 {slug}   (200 on repeat)
PATCH  /api/constellations/:slug           {name?, communicationStyle?}                → 200
PATCH  /api/constellations/:slug/onboarding {step}                                     → 200
PATCH  /api/stars/:id                      {baseVersion, config: AgentProfileConfig@2} → 200 {version}
                                           409 {error, currentVersion} · 422 name taken or invalid
POST   /api/constellations/:slug/invitations {email, role, roomIds?}                   → 201 {id, link, expiresAt}
DELETE /api/invitations/:id                                                            → 204
POST   /api/invitations/accept             {token}                                     → 200 {slug}
                                           403 wrong address · 410 expired or revoked
PATCH  /api/constellations/:slug/members/:userId {role}                                → 200
DELETE /api/constellations/:slug/members/:userId                                       → 204
PATCH  /api/me                             {stillConstellation?, displayName?}         → 200
POST   /api/constellations/:slug/quality-step {step}                                   → 204   (002b)
GET    /auth/google/start · GET /auth/google/callback                                  (002b)
```
All mutating routes require a same-origin `Origin` and a session, as in slice 001. Errors keep the
shape `{error: {code, message}}`. New codes: `name_taken`, `name_invalid`, `version_conflict`,
`invitation_expired`, `invitation_revoked`, `invitation_wrong_address`, `creation_limit`,
`rate_limited`, `forbidden_role`.

## Fixtures
- `agent-profile.valid.v1.json`, `agent-profile.valid.v2.json`, `agent-profile.invalid.name.json`
  (control characters, 41 characters, leading punctuation, instruction-like text with a colon).
- `audit-event.valid.*.json` one per type; `audit-event.invalid.content.json` (carries free text).
- `star-visual.defaults.json`: the pinned recipe for each of the seven default configurations.
