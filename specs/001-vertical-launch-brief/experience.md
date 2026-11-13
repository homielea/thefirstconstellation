# 001 — Experience specification

Revision: r1. A plain, restrained shell. The constellation proper starts in slice 002.

## §1 Entry and exit
- Entry: `/` → sign-in (if no session) → `/c/[slug]` (redirects to the first room in this slice).
- Rooms: `/c/[slug]/rooms/[roomId]` → submitting a request goes to `/c/[slug]/missions/[id]`.
- Mission → "Open brief" → `/c/[slug]/artifacts/[id]`; artifact → "Back to mission".
- Exit: "Sign out" in the edge navigation.

## §2 Layout and hierarchy
```text
┌ edge nav (collapsible at <720px into a top bar with a menu button) ┐
│ [brand mark] Constellation name                                    │
│ Rooms · Missions (current workspace)          Sign out             │
└────────────────────────────────────────────────────────────────────┘
 main (max 72ch for reading text, 1100px for mission view)
```
**Room view (§2.1)**: H1 room name → composer (labelled textarea "What outcome do you want?",
helper text, "Begin mission" button) → H2 "Missions in this room" list (title, status text,
created time) or the empty-state text.

**Mission view (§2.2)**: H1 objective (truncated to 2 lines with full text available) → status
line ("Running · step 2 of 3") → actions (Cancel mission / Retry step / Open brief) →
H2 "Plan" ordered list of steps (agent proper name + "· Seer" archetype, title, tools,
expected output, status chip with text) → H2 "Progress" event list (time, agent, sentence)
→ H2 "Run history" table (agent, step, kind, model/tool, latency, tokens in/out, cost,
outcome) with totals row. At <720px the table becomes stacked definition lists.

**Artifact view (§2.3)**: H1 artifact title → version selector ("Version 3 · edited by
Founder · 14:02") → sections, each with H2 heading + textarea (auto-height) → "Save version"
→ H2 "Sources" numbered list (S1… with title, kind, link/excerpt) → H2 "Review notes"
(Ward · Sentinel; "Review applies to version N"; findings list with severity as text label).

## §3 State inventory
| Screen | States |
|---|---|
| Sign-in | idle, sending, link-issued (dev console notice), rate-limited, invalid/expired link |
| Room | empty, populated, submitting, submit error (validation / server) |
| Mission | queued, running (per-step running), blocked (budget reached / connection missing), failed (with step error), cancelled, completed; stream reconnecting; sample-provider label |
| Artifact | loading, populated, editing (unsaved changes notice), saving, saved, save error, viewing old version (read-only, "Viewing version N") |

## §4 Actions and keyboard
- All actions are native `<button>` or `<a>` elements in DOM order. There are no custom key handlers
  in this slice.
- Composer: `Ctrl/Cmd+Enter` submits. The button is the primary path.
- Cancel mission → an in-page confirmation region ("Cancel this mission? Steps already
  finished stay finished. The step in progress will be discarded.") with "Cancel mission" and
  "Keep running". Focus moves to the confirmation, and back to the trigger on dismiss.
- After navigation, focus goes to the page H1 (`tabindex=-1`).
- Skip link "Skip to content" is the first focusable element.

## §5 Content and terminology
- Sentence case. Plain verbs: "Begin mission", "Retry step", "Cancel mission", "Save version".
- Event sentences (examples):
  - "Plan saved: 3 steps." · "Iris (Seer) started research." · "Iris searched the web: 5 results."
  - "Iris finished research: 6 findings from 4 sources." · "Quill (Scribe) drafted the launch brief."
  - "Ward (Sentinel) reviewed the brief: 1 problem, 2 cautions." · "Mission complete."
  - Failures: "Iris's attempt 1 failed: the model's answer did not match the required format. Retrying."
- Error categories (plain words): `model_error` "the model service returned an error",
  `invalid_output` "the answer did not match the required format", `connection_missing`
  "web search is not connected", `budget_reached` "the mission budget was reached",
  `spend_cap` "the live spend cap was reached", `timeout` "the call took too long".
- Sentinel disclaimer under review notes: "Review notes help you check the work. They do not
  guarantee it is correct."

## §6 Responsive
Breakpoints: 320, 720, 1100 px. Below 720 px the nav collapses, the run-history table stacks,
and step cards go full width. No horizontal page scroll at 320 px.

## §7 Accessibility semantics
- Landmarks: `header`, `nav[aria-label="Workspace"]`, `main#content`.
- Progress list: `ol` with one live region (`role=status`, polite) that announces only step
  transitions and the final state ("Quill finished drafting. Step 3 of 3 started.").
- Status chips contain text ("Running", "Completed", "Failed") and a shape glyph. Colour is
  never the only signal.
- Citations: markers `[S1]` in the text are plain text. The source list uses `id="source-S1"`
  anchors, and the section footer lists linked markers.

## §8 Motion
The only motion is a 150 ms opacity transition on newly arrived events, plus focus rings. Under
reduced motion: none. There is no ambient animation in this slice.

## §9 Failure and recovery
- Stream lost: "Reconnecting to live progress…" appears. On reconnect it hydrates from the last
  event id. After 3 failed attempts: "Live progress paused. Reload to see the latest state."
  The mission itself is unaffected.
- Step failed: see requirement EXP-004.
- Blocked (budget): "Paused: this mission reached its $1.00 budget. Nothing outside this
  workspace was changed." Raising the budget is slice 003. This slice offers "Cancel mission".
- Connection missing: "Web search is not connected. Ask an admin to connect it, then retry the step."
