# Design tokens

Source of truth: `src/styles/tokens.css`, with the colour values mirrored in `src/styles/tokens.ts`
for contrast tests. `tests/unit/contrast.test.ts` checks every text/surface pair listed below against
WCAG 2.2 AA. Changing a value without passing the test fails CI.

## Colour (build spec §9, uncalibrated r1)
| Token | Value | Use |
|---|---|---|
| `--void` | #050609 | spatial background, page background |
| `--eclipse` | #0C0E14 | panels, editor surfaces |
| `--eclipse-raised` | #141821 | inputs, hover surfaces (added r1) |
| `--line` | #2A3040 | hairlines, non-text boundaries (decorative only; control borders use `--line-strong`) |
| `--line-strong` | #6B7386 | input and button borders (≥3:1 on `--eclipse`) (added r1) |
| `--slate-light` | #A9AFBD | secondary text |
| `--starlight` | #F2F1EB | primary text |
| `--aurora-blue` | #8AA7FF | links, focus, selection |
| `--veil-violet` | #A98DDA | secondary agent energy |
| `--solar-amber` | #DAB77A | approvals, human attention, "blocked" |
| `--signal-coral` | #E6877F | errors, failed |
| `--success-mist` | #8FC5B0 | completed |

Checked pairs: starlight, slate-light, aurora-blue, solar-amber, signal-coral and success-mist on
void, eclipse and eclipse-raised (≥4.5:1); line-strong on eclipse (≥3:1).

## Type
`--font-ui`: Inter (temporary; replaceable). `--font-display`: Cormorant Garamond (opening story only).
Scale (rem): 0.8125 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.25. Line height 1.5 body, 1.2 headings.
Sentence case. No tracked capitals and no decorative monospace.

## Space, radius, motion
Space: 4px base (`--s-1`…`--s-8` = 4, 8, 12, 16, 24, 32, 48, 64). Radius: 6px controls, 10px panels.
Motion: `--t-quick` 150ms, `--t-nav` 500ms (camera, slice 002), easing `cubic-bezier(.2,.7,.2,1)`.
Under `prefers-reduced-motion: reduce`, all durations are 0.
