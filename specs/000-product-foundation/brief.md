# 000 — Product foundation brief

Revision: r1 (2026-11-13). Sources: `First-Constellation-MVP-build-spec.md` v1.0 and
`Spec-driven-design-and-development.md`, supplied by the owner and kept verbatim in `/docs/source/`.

## Person and situation
A founder, consultant, agency lead or small team who repeatedly researches, writes, reviews
and sends work across several tools, and who wants AI help without losing sight of what the
help is doing or what it will send on their behalf.

## Outcome
In one shared workspace (a **constellation**) they delegate real work to seven foundational
AI coworkers (**the First Seven**). They can watch every step and edit every output.
Nothing leaves the workspace without an explicit, recorded human approval of the exact
payload, and a successful sequence becomes a reusable **formation**.

## Why it is the MVP
It proves the core loop: shared context → specialised agents → visible plan → inspectable
execution → editable artifacts → human approval of consequences → reuse.

## Success event (MVP)
A two-member workspace runs the reference mission end to end: a launch brief is researched
with citations, drafted, reviewed, and edited. The exact email is approved and sent once, and
the sequence is saved as a formation and run again with new inputs.

## Explicit exclusions (MVP)
Per-agent email addresses, Telegram/WhatsApp/SMS/phone, browser or computer use, voice, a
marketplace, custom stars, real-time co-editing, a game world, native apps, and billing beyond
an internal usage ledger. The architecture keeps `channel_identity` and `conversation_binding`
seams; the UI shows no placeholder buttons for these.

## Brand
The parent brand is unresolved. "The First Constellation" is the first product experience
and release. All brand strings live in `src/brand.ts`.

## Dependencies and assumptions
- Anthropic API for models; Brave Search for web research (ADR-0004). Both sit behind adapters.
- Live spend cap: $5 per live session, $25 in total for Phase 0 (ADR-0003).
- Staging hosting is decided at the end of Phase 0.
- Agent proper names are **working names** until final names are chosen (see vocabulary.md).
