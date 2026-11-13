# 002 — Constellation and onboarding: brief and requirements

Revision: r1 (2026-11-13). Status: **Draft, awaiting owner approval.** Nothing in this slice is
implemented. Requirement IDs continue the slice 001 series and become binding at Approved.

## Brief
**Person:** someone who has just signed in for the first time, alone or as the first of a small team.
**Situation:** they have no constellation yet. They want to see who will help them and get to a
first piece of real work without configuring anything first.
**Outcome:** they create a constellation, meet the First Seven, optionally rename and restyle them,
invite a colleague, and land on a constellation home they can use with a keyboard, a screen reader,
a phone, or no canvas at all.
**Why now:** slice 001 proved the work loop with seeded data. Nobody can enter the product on their own yet.
**Success event:** `workspace.created` followed by `onboarding.completed` for the same person, and a
mission begun from the constellation home.
**Exclusions:** the general planner, direct rooms with one star ("Work with [name]"), comments
(all slice 003); library (004); email delivery of invitations, connections, approvals (005); ownership
transfer, export and deletion (006); billing; multi-constellation "galaxy" navigation; per-star
permission editing beyond viewing the grants; voice description.
**Assumptions:** the still constellation and the list are complete on their own, and 3D is an
enhancement. Invitations are delivered as a copyable link until an email transport exists.

### Delivery in two parts
- **002a (no external dependencies):** workspace creation and onboarding, personalisation, the list and
  still constellation home, star focus and glossary, invitations and roles, the still setting.
- **002b:** Google sign-in (needs Google OAuth credentials from the owner) and the lazy 3D
  constellation with adaptive quality. 002b starts only after 002a is verified.

### Owner decisions needed before approval
Each has a recommendation. The requirements below are written to the recommendation.

| # | Decision | Recommendation | Why it is the owner's |
|---|---|---|---|
| D1 | Guests in this slice | Include guests with explicit room grants now (PROD-017) | Tenancy |
| D2 | How invitations are delivered before email exists | Copyable link shown to the inviter, labelled "No email was sent" | Scope; no fake success |
| D3 | Who may rename and restyle stars | Owner and Admin only; Members and Guests see the result | Scope |
| D4 | Owners per constellation | Exactly one in this slice; transfer arrives with slice 006 | Tenancy |
| D5 | Google sign-in library | A small OpenID Connect client, not Auth.js (ADR-0008, proposed) | Provider lock-in |
| D6 | Google account linking | Link to an existing account when Google reports the same verified email | Tenancy, security |
| D7 | Renaming and history | Past progress and run history keep the name used at the time | Retention |
| D8 | Constellations per person | No limit on membership; a person may create up to 3 | Cost |

### Revision notes
- r1: first full draft from the brief, build spec §4, §7.1, §7.2, §8, §9, §10 and
  `docs/design/constellation-behavior.md`.

## Requirements

MUST = MVP acceptance, SHOULD = strong expectation (deferral needs a reason), MAY = option.
(a) and (b) mark the delivery part.

### Product (PROD)
- **PROD-006** MUST (a): A signed-in person with no constellation is taken to `/onboarding`. They
  create a constellation by giving a name (2–60 characters), individual or team use, and optionally
  one outcome they want help with (10–2000 characters). They become its Owner.
- **PROD-007** MUST (a): Creating a constellation is one transaction: the workspace, the Owner
  membership, exactly one profile per First Seven archetype (ACPT-01) and one first room. A repeated
  submission of the same form creates nothing new and returns the first result.
- **PROD-008** MUST (a): Onboarding presents all seven stars in one composed sequence, each with
  its proper name, epithet and archetype. A name that has never been changed is marked "working name"
  in the glossary.
- **PROD-009** MUST (a): An Owner or Admin can rename a star and change its symbol family, core form,
  ring density, light temperature and motion temperament, within the curated options. Each save
  creates a new immutable profile version attributed to that person. The archetype cannot be changed
  or deleted.
- **PROD-010** MUST (a): A star's current name and visual appear the same way wherever the star is
  shown: the constellation (still and 3D), the list, rooms, mission plans and artifact attribution
  (ACPT-02). Progress events and run history already recorded keep the name used at the time (D7).
- **PROD-011** MUST (a): The constellation has one communication preference (concise, balanced or
  expansive; default balanced) and each star may override it. The preference reaches an agent's prompt
  as a labelled preference. It never changes tools, plan or policy.
- **PROD-012** MUST (a): When an outcome was given, onboarding offers to begin a launch-brief mission
  with that text prefilled and editable. Nothing starts without an explicit action, and "Skip for now"
  is equally prominent.
- **PROD-013** MUST (a): Onboarding can be left at any step and resumed where it stopped. It never
  requires configuring permissions, connections or invitations. It ends on the constellation home
  with a visible "Begin a mission" action.
- **PROD-014** MUST (b): A person can sign in with Google. Only an address Google reports as verified
  is accepted. If Google sign-in is not configured for the deployment, the button is not shown.
- **PROD-015** MUST (a): An Owner or Admin can invite a person by email with a role (Admin, Member or
  Guest). The invitation is a single-use link valid for 7 days, shown to the inviter to copy, with
  the text "No email was sent. Share this link yourself." Pending invitations are listed and can be
  revoked. Accepting requires being signed in with the invited address.
- **PROD-016** MUST (a): An Owner or Admin can change a member's role and remove a member. Nobody can
  change or remove the Owner, and an Admin cannot change their own role. A removed member loses access
  on their next request.
- **PROD-017** MUST (a): A Guest sees only rooms explicitly shared with them, and the missions and
  artifacts of those rooms. A Guest cannot begin missions, save artifact versions, see the member
  list, or open settings. (D1)

### Experience (EXP)
- **EXP-009** MUST (a): The constellation home shows the seven stars with proper name and a text
  status ("Available" or "Working on …"), a composer to begin a mission without choosing a star, and
  a list of active missions.
- **EXP-010** MUST (a): Selecting a star opens a focus layer without leaving the page. It shows the
  proper name first, then archetype, epithet, current state, active missions, allowed tools and recent
  artifacts, with "Personalise" (Owner and Admin) and "Open glossary". Escape closes it and returns
  focus to the star. `/c/[slug]/stars/[id]` opens the same content directly.
- **EXP-011** MUST (a): The glossary lists the seven archetypes with responsibility, default tools,
  current proper name and working-name marker, and defines the product vocabulary.
- **EXP-012** MUST (a): Personalisation shows a preview of the star that updates before saving, offers
  "Reset to default", and warns in the page before unsaved changes are discarded.
- **EXP-013** MUST (a, b): Each failure says what happened and what to do next: name already used in
  this constellation, address taken, invitation expired, revoked or meant for another address, Google
  sign-in cancelled or failed, creation limit reached.
- **EXP-014** SHOULD (a): A new person reaches a first artifact within ten minutes. Onboarding has at
  most four screens and can be completed with only the constellation name filled in.

### Accessibility (ACC)
- **ACC-006** MUST (a): An ordered list of the seven stars is always in the DOM and carries every
  action. The canvas, when present, is `aria-hidden` and not focusable. Focus in the list drives
  highlighting in the canvas.
- **ACC-007** MUST (a, b): Onboarding, personalisation, star focus, invitations, role changes and
  Google sign-in can each be completed with the keyboard only, with a visible focus indicator
  (ACPT-13).
- **ACC-008** MUST (a): Star status is given as text and a glyph, never colour or motion alone. Star
  labels are at least 14 px and 4.5:1 against their backing.
- **ACC-009** MUST (a): Onboarding, the constellation home, star focus, personalisation and members
  need no horizontal scrolling at 320 px, and the axe scan reports no serious or critical violations
  on them (ACPT-12).
- **ACC-010** MUST (a): The opening sequence and star focus are announced to screen readers as
  ordinary headings and lists. Nothing is conveyed only by animation.

### Visual (VIS)
- **VIS-003** MUST (a, b): Under `prefers-reduced-motion`, or with the per-person "Still
  constellation" setting on, there is no ambient orbital animation and selection happens without
  camera travel (ACPT-14). The setting is stored for the person and applies on every device.
- **VIS-004** MUST (a): A star's appearance is a deterministic function of its visual configuration:
  the same configuration always gives the same still image and the same 3D recipe. Stars are abstract
  celestial forms, never faces. The seven are told apart by form, symbol and motion as well as hue,
  and all hues come from the token palette.
- **VIS-005** MUST (b): Labels are screen-aligned and never orbit or rotate. Camera movement on
  selection completes in 350–700 ms. Ambient drift is one rotation in 90–180 s and pauses when a
  panel is open or the tab is hidden.

### Performance (PERF)
- **PERF-003** MUST (b): The list, composer and navigation are usable before the 3D code loads. The
  still constellation is server-rendered. The 3D code is a separate lazy chunk outside every route's
  first-load JS. If it fails to load or WebGL is unavailable, the still constellation stays and no
  error dialog appears (ACPT-16).
- **PERF-004** MUST (b): If the median frame time exceeds 33 ms over 2 s, quality steps down in
  order: device pixel ratio cap, particle count, shader detail, then the still constellation
  (ACPT-17). Each step down is recorded once per session.
- **PERF-005** SHOULD (a): Each route's first-load JS stays under 200 kB gzipped, checked in CI from
  the build output. This replaces the deferred PERF-002.

### Security (SEC)
- **SEC-007** MUST (a): Every new read and write is authorised by role in the server and by row-level
  security in the database: invitations, membership changes, profile versions, room grants and
  settings. A request with a valid id from another constellation, or from a role without the right,
  gets 404 or 403 and changes nothing (ACPT-18).
- **SEC-008** MUST (a): Invitation tokens are 32 random bytes, stored only as a hash, single-use and
  bound to one address. The accept page reveals the constellation name only to a person signed in
  with that address.
- **SEC-009** MUST (b): Google sign-in uses the authorisation-code flow with PKCE, `state` and
  `nonce`, and verifies the ID token's signature, issuer, audience and expiry. Scopes are `openid
  email profile` only. No Google token is stored or logged (ACPT-22).
- **SEC-010** MUST (a): Creation and invitation are rate limited: 3 constellations per person (D8),
  20 invitations per constellation per hour.
- **SEC-011** MUST (a): Star names accept letters, digits, spaces, hyphens and apostrophes only, 1–40
  characters, unique within the constellation ignoring case. Names reach prompts as a labelled data
  field and are rendered as text.

### Data (DAT)
- **DAT-006** MUST (a): Profile versions are immutable. A mission step keeps the profile version it
  ran with. Renaming never rewrites a stored event, plan or artifact version.
- **DAT-007** MUST (a): Migration `0002` is reversible (up, down, up) and leaves slice 001 data valid.
  Existing workspaces get the default communication preference and completed onboarding.

### Reliability (REL)
- **REL-007** MUST (a): Accepting an invitation and saving a profile version are idempotent. Accepting
  twice gives one membership. Two people saving the same star at once produce two ordered versions or
  one clear conflict message, never a lost update.

### Observability (OBS)
- **OBS-004** MUST (a): These events are recorded per constellation with actor and time, and no
  content beyond ids and role names: `workspace.created`, `onboarding.completed`, `star.renamed`,
  `star.personalised`, `invitation.created`, `invitation.accepted`, `invitation.revoked`,
  `member.role_changed`, `member.removed`, and (b) `constellation.quality_step`.

## Acceptance criteria owned or advanced by this slice
ACPT-01 (PROD-007), ACPT-02 (PROD-009, PROD-010), ACPT-14 (VIS-003), ACPT-16 (PERF-003), ACPT-17
(PERF-004). Contributes to ACPT-12 (ACC-009), ACPT-13 (ACC-006, ACC-007), ACPT-15 (ACC-008),
ACPT-18 (SEC-007), ACPT-22 (SEC-009).
