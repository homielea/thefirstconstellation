# 002 — Experience

Revision: r1 (2026-11-13). Status: Draft, awaiting owner approval with `requirements.md`.
Copy follows `docs/design/content-style.md`: sentence case, plain verbs, no invented mythology on
controls. Tokens: `docs/design/tokens.md`.

## §1 Routes
```text
/onboarding                          create, meet, preference, first mission
/c/[slug]                            constellation home (replaces the slice 001 redirect to the first room)
/c/[slug]/stars/[id]                 star focus as a page (same content as the focus layer)
/c/[slug]/stars/[id]/personalise     Owner and Admin
/c/[slug]/glossary
/c/[slug]/settings/members           Owner and Admin
/c/[slug]/settings/constellation     name, communication preference (Owner and Admin)
/settings                            personal: still constellation, display name
/invitations/[token]                 accept an invitation
/auth/google/start, /auth/google/callback   (002b)
```

## §2 Onboarding (PROD-006..008, PROD-011..013, EXP-014)
Four screens, one decision each, with "Step 2 of 4" as text. Back is always available. State is
saved after each step, so reopening `/onboarding` resumes.

1. **Name your constellation.** Fields: "Constellation name" (required), "Who is it for?" (Just me /
   My team), "One outcome you want help with (optional)" with the hint "For example: a launch brief
   for our March beta." Under the name, the address is shown as it will be: "Address:
   /c/northlight". Button: "Create constellation".
2. **Meet the First Seven.** A heading in the display face, then the seven in archetype order.
   Each star arrives as a still image with proper name, epithet and archetype ("Iris · Seer — Looks
   outward and brings back evidence"). With motion allowed, stars fade in over 2.5 s in total. With
   reduced motion, all are present at once. "Rename" sits beside each name and edits in place.
   Text under the list: "These are working names. Keep them or change them now or later." Button:
   "Continue".
3. **How should they write to you?** Three radio options with a one-line sample each: Concise,
   Balanced (selected), Expansive. Text: "Each star can be set differently later." Button: "Continue".
4. **Begin.** If an outcome was given: the text in an editable box, "Begin a launch-brief mission"
   and "Skip for now" at equal weight, and the sentence "This drafts a launch brief. Other kinds of
   work arrive later." If no outcome was given: "Your constellation is ready." and "Go to your
   constellation". With fake providers the sample-providers label from slice 001 is shown here.

Created by another route (invitation accepted): the person skips onboarding and lands on the home.

## §3 Constellation home (EXP-009, ACC-006, ACC-008, VIS-003..005)
Order in the DOM and at 320 px: heading (constellation name), composer, star list, active missions.
From 1100 px the constellation sits in the centre with the list as a quiet rail on the left and
active missions on the right.

- **Composer:** the slice 001 composer ("What outcome do you want?", "Begin mission"). It creates the
  mission in the first room. Guests do not see it.
- **Star list (`ol`, always present):** each item is a button with the still image (decorative,
  empty alt), proper name, archetype and status text: "Available" or "Working on Draft a launch
  brief…" (truncated at 60 characters with the full text in the focus layer). A status glyph repeats
  the status: open circle (available), filled circle (working).
- **Still constellation (002a):** a server-rendered SVG of the seven in a fixed composed arrangement
  with screen-aligned labels. It is `aria-hidden`; the list carries the meaning.
- **3D constellation (002b):** replaces the SVG in place once loaded, with no layout shift. Hover or
  list focus highlights a star and freezes drift. Enter or click moves the camera closer.
- **Active missions:** links with status text. Empty state: "No missions are running."
- **Still setting:** a "Still constellation" switch under the constellation and in `/settings`.

## §4 Star focus (EXP-010)
A side layer at 720 px and above, a full-width panel below it. It is a labelled region, not a modal:
the page behind stays readable. Focus moves to the star's name heading on open and back to the list
item on close (Escape or "Close").

Order: proper name (h2) · "Seer — working name" or "Seer" · epithet · state · active missions
(links) · "Can use: web search, library" · recent artifacts (up to 5, links) · actions.
Actions: "Personalise" (Owner and Admin), "Open glossary". Empty states: "No active missions.",
"No artifacts yet."

## §5 Personalise (PROD-009, EXP-012, SEC-011)
One form, preview first in the DOM and beside the fields from 720 px.
- "Name" (text). Errors: "Use letters, numbers, spaces, hyphens and apostrophes." · "Another star
  in this constellation is already called Iris."
- "Symbol" (7 options), "Form" (4), "Rings" (0–4), "Light" (Cool / Neutral / Warm), "Motion" (Still /
  Calm / Lively), as radio groups with text labels. "Writing style": Use constellation setting /
  Concise / Balanced / Expansive.
- "Save changes", "Reset to default", "Cancel". After saving: "Saved. Version 3 by Mara." Leaving
  with unsaved changes shows, in the page: "Discard your changes to Iris?" with "Discard" and
  "Keep editing".
- Conflict (someone else saved first): "Jonas changed this star while you were editing. Review
  the current version, then save again." The form keeps the person's values.

## §6 Members and invitations (PROD-015..017, SEC-008, EXP-013)
- **Members table:** name, address, role, joined. Role is a select for rows the viewer may change.
  "Remove" asks in the page: "Remove Jonas from Northlight? They lose access immediately. Their past
  work stays." The Owner row shows "Owner" with no controls.
- **Invite:** "Email address", "Role" (Admin / Member / Guest), and for Guest a checklist "Rooms to
  share" (at least one). Button: "Create invitation link". Result: the link in a read-only field,
  "Copy link", and "No email was sent. Share this link yourself. It works once, for jonas@example.com,
  until 20 November."
- **Pending:** address, role, expires, "Revoke".
- **Accept page:** signed out: "Sign in as the invited address to continue." Signed in as the invited
  address: "Join Northlight as a member?" with "Join" and "Not now". Other states: "This invitation
  has expired. Ask the person who invited you for a new one." · "This invitation was withdrawn." ·
  "This invitation is for a different address. You are signed in as mara@example.com." · already a
  member: goes to the constellation.
- **Guest view:** navigation shows only shared rooms. Other addresses return the 404 page.

## §7 Google sign-in (PROD-014, SEC-009, EXP-013) — 002b
The sign-in page shows "Continue with Google" above the email form when configured. Failures return
to the sign-in page with one sentence: "Google sign-in was cancelled." · "Google sign-in did not
complete. Try again or use an email link." · "Google has not verified that address, so it cannot be
used to sign in."

## §8 Responsive
320 px: single column in the order of §3; the focus layer and personalise preview stack above their
fields; the members table becomes stacked cards. 720 px: side layer. 1100 px: three-region home.

## §9 Accessibility semantics
- Landmarks as in slice 001. The home adds `section[aria-label="Stars"]` and
  `section[aria-label="Active missions"]`.
- List buttons have the accessible name "Iris, Seer, available".
- The focus layer is `aside[aria-labelledby]`. Opening is not announced by a live region; focus
  moving to its heading is the announcement.
- Onboarding steps are separate pages with an h1 each, so each step is announced on arrival.
- Saves and invitation results use one polite status region per form.

## §10 Motion
Onboarding fade-in, camera travel and ambient drift are the only motion. All three are absent under
reduced motion or the still setting. Nothing depends on having seen an animation.

## §11 Open questions for the owner
See the decision table in `requirements.md` (D1–D8).
