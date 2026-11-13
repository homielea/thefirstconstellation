# Spec-driven design and development protocol

**Applies to:** The First Constellation MVP  
**Primary product specification:** `First-Constellation-MVP-build-spec.md`

## Purpose

The product must be built from explicit, reviewable specifications rather than from an expanding sequence of chat instructions. The specification describes intended behavior; the implementation demonstrates it; verification proves the two agree.

This protocol is mandatory for product design, interaction design, architecture, data changes, agent behavior, and implementation. It should create useful clarity without producing documents that merely repeat one another.

## Governing principles

1. **The repository is the source of truth.** Decisions made during implementation must be written into the relevant repository specification or ADR.
2. **Behavior comes before components.** Specify what a person can accomplish and observe before selecting UI components or internal abstractions.
3. **One vertical slice at a time.** Design, build, and verify a complete user outcome before expanding the platform horizontally.
4. **Every requirement is testable.** A requirement must describe observable behavior or an enforceable constraint.
5. **Trace work in both directions.** Every implementation task points to a requirement; every MVP requirement points to a design, implementation task, and verification result.
6. **Design is part of the specification.** Layout, hierarchy, interaction, motion, accessibility, and responsive behavior are requirements, not decorative work applied after engineering.
7. **Changed understanding changes the spec first.** When evidence invalidates a requirement, update the specification and record the reason before changing implementation.
8. **Proof is required for completion.** Passing compilation is insufficient. A slice is complete only when its behavior, visual states, accessibility, recovery, and material risks have been verified.

## Repository structure

Create this structure near the start of Phase 0:

```text
/specs
  /000-product-foundation
    brief.md
    vocabulary.md
    system-context.md
    acceptance.md
  /001-vertical-launch-brief
    requirements.md
    experience.md
    technical-design.md
    contracts.md
    tasks.md
    verification.md
  /002-constellation-onboarding
  /003-rooms-missions-artifacts
  /004-library-research-memory
  /005-approvals-email-formations
  /006-pilot-hardening
/docs/decisions
/docs/design
  tokens.md
  constellation-behavior.md
  content-style.md
/evals
/tests
```

Use numeric prefixes to preserve build order. A specification folder represents a user-visible capability, not a technical layer.

## Requirement identifiers

Assign stable IDs so requirements can be traced without relying on section headings.

| Prefix | Area |
|---|---|
| `PROD` | Product behavior and scope |
| `EXP` | User journey and interaction |
| `VIS` | Visual system and motion |
| `ACC` | Accessibility |
| `AGT` | Agent and orchestration behavior |
| `DAT` | Data and memory |
| `SEC` | Security, privacy, and permissions |
| `REL` | Reliability and recovery |
| `INT` | External integrations |
| `OBS` | Observability and evaluation |
| `PERF` | Performance |

Example:

```text
AGT-014: The system MUST persist a mission plan before executing its first step.

Verification:
- Integration test: mission worker receives a start event only after plan persistence.
- Recovery test: worker restart resumes from the persisted plan without replanning.
```

Use **MUST** for MVP acceptance, **SHOULD** for a strong expectation that can be deferred with a recorded reason, and **MAY** for an intentional option. Avoid vague words such as intuitive, seamless, robust, beautiful, or fast without observable criteria.

## Lifecycle for each product slice

### 1. Brief

Define:

- The person and situation.
- The outcome they need.
- Why this slice belongs in the MVP.
- What observable event means the slice succeeded.
- Explicit exclusions.
- Dependencies and unresolved assumptions.

The brief should fit on one page.

### 2. Requirements

Write atomic requirements with stable IDs. Include:

- Happy path.
- Permission boundaries.
- Loading, empty, error, blocked, cancelled, and recovery behavior.
- Data retention and deletion behavior.
- Responsive and reduced-motion behavior.
- Usage/cost behavior where model calls are involved.
- Analytics and audit events.

Represent critical flows as scenarios:

```gherkin
Scenario: Edited email requires a new approval
  Given an email payload has been approved
  When its recipient, subject, body, or attachment set changes
  Then the previous approval becomes inapplicable
  And the email cannot be sent until the new payload is approved
```

### 3. Experience specification

Define the complete interaction before implementation:

- Entry and exit points.
- Information hierarchy.
- Screen and state inventory.
- Actions and keyboard behavior.
- Content and terminology.
- Responsive transformations.
- Accessibility semantics and announcements.
- Motion purpose, timing, and reduced-motion alternative.
- Data shown at each zoom level.
- Failure and recovery experience.

Use compact wireframes where they clarify hierarchy. Each meaningful state should have a named frame or reference image. Do not approve only the ideal desktop state.

For the constellation, specify behavior independently of rendering technology:

- Star selection and focus.
- Camera and zoom boundaries.
- Label collision and legibility.
- Status representation without color alone.
- Keyboard/list equivalence.
- Reduced-motion behavior.
- Low-performance fallback.
- Loading and WebGL failure.

### 4. Technical design

Define:

- Component and service boundaries.
- Data model and migrations.
- API and event contracts.
- Authorization checks.
- State machine transitions.
- Idempotency and recovery strategy.
- Model/tool contracts and prompt versioning.
- Expected load, latency, and cost bands.
- Telemetry and diagnostic fields.
- Alternatives considered when the decision is material.

Create an ADR when the choice affects multiple slices, introduces provider lock-in, changes security posture, or is costly to reverse.

### 5. Contracts and fixtures

Create machine-readable schemas before integrating producer and consumer code:

- API request/response schemas.
- Mission plan schema.
- Tool input/output schemas.
- Workflow events.
- Agent-profile configuration.
- Formation versions.
- Approval payload and payload hash.
- Evaluation fixtures.

Include valid examples, invalid examples, and versioning behavior. Generate TypeScript types from schemas or validate both against a shared schema to prevent drift.

### 6. Tasks

Break work into demonstrable units. Each task must include:

- Requirement IDs covered.
- Files or subsystem expected to change.
- Demonstration or test proving completion.
- Dependencies.
- Whether it changes schema, permissions, providers, or cost.

Do not create tasks such as “build backend” or “improve UI.” A good task produces a reviewable behavior.

### 7. Implementation

- Implement only approved requirements for the active slice.
- Keep feature work behind a route or flag until its vertical journey is coherent.
- Persist durable state before streaming transient state.
- Use fixtures and provider fakes until contracts pass.
- Record newly discovered edge cases in the spec before implementing their resolution.
- Keep the application runnable and migrations reversible after each task.

### 8. Verification

Verification must include the relevant subset of:

- Automated unit, integration, end-to-end, authorization, recovery, and evaluation tests.
- Screenshot comparison across named visual states.
- Keyboard-only and screen-reader review.
- Reduced-motion and still-constellation review.
- Responsive review at agreed breakpoints.
- Live-provider staging test with a capped budget.
- Failure injection for workers, model calls, connections, and dropped streams.
- Traceability audit confirming every MUST requirement has evidence.

Write results in `verification.md` with evidence, date, environment, unresolved limitations, and the exact requirement IDs verified. A failing criterion remains open; it must not be rewritten as a success.

## Design specification protocol

### Design tokens first

Keep color, typography, spacing, radii, elevation, motion, layer depth, and 3D material values in centralized tokens. The product specification supplies the starting palette. Claude must calibrate tokens against real screens and record any changes.

### Required state matrix

For every major screen or component, specify and review:

| State | Required review |
|---|---|
| Initial/loading | Skeleton or meaningful immediate fallback |
| Empty | Clear next action |
| Populated | Realistic product content |
| Hover/focus/selected | Mouse and keyboard behavior |
| Running | Stable progress without layout thrash |
| Blocked/approval | Reason and next action |
| Error | What happened, impact, safe recovery |
| Completed | Result and next useful action |
| Reduced motion | No ambient motion dependency |
| Narrow viewport | Preserved task completion |
| Low graphics capability | Still/list constellation |

### Visual review loop

For each slice:

1. Implement the real screen with realistic seeded data.
2. Capture the named states at desktop and mobile widths.
3. Compare them with the experience specification.
4. Review hierarchy, legibility, density, motion, and brand character.
5. Update the design spec when the implementation reveals a better solution.
6. Repeat until acceptance criteria pass.

The 3D constellation should receive particular review for label collisions, camera comfort, motion fatigue, frame rate, and whether the work state remains understandable.

## Agent specification protocol

Each First Seven profile requires a versioned specification containing:

- Archetype purpose.
- Tasks it should accept and refuse.
- Required inputs.
- Default tools and permissions.
- Expected output schemas.
- Handoff conditions.
- Quality rubric.
- Failure and uncertainty behavior.
- Memory access and write policy.
- Representative evaluation fixtures.

Do not rely on personality prose alone. Agent differences must appear in tool access, context selection, output contracts, evaluation rubrics, or workflow responsibility.

Every prompt change creates a new prompt version and runs the relevant evaluations. Record model, prompt version, fixture set, structural pass rate, quality score, latency, and cost.

## Traceability matrix

Maintain `/specs/traceability.md` with one row per MUST requirement:

| Requirement | Experience/design | Technical design | Task/commit | Test or review evidence | Status |
|---|---|---|---|---|---|
| AGT-014 | 001/experience §4 | 001/technical-design §6 | 001-T08 | mission-recovery integration | Verified |

Allowed status values: Draft, Approved, Implementing, Implemented, Verified, Deferred, Rejected.

Deferring or rejecting a MUST requirement requires a written scope decision. It cannot happen silently because implementation is difficult.

## Change protocol

When a requirement changes:

1. Update the relevant specification and its revision note.
2. Identify affected requirement IDs, contracts, migrations, tests, screens, analytics, and documentation.
3. Add or update an ADR if the change is architectural.
4. Update tasks and traceability.
5. Implement the change.
6. Re-run affected verification.

If implementation and specification disagree, either correct the implementation or explicitly revise and approve the specification. The code does not silently redefine the product.

## Definition of ready

A slice is ready to implement when:

- The brief and boundaries are clear.
- MUST requirements have stable IDs.
- The primary flow and material non-happy paths are specified.
- Designs include responsive, accessibility, and reduced-motion behavior.
- Contracts for cross-boundary data exist.
- Security and approval implications are stated.
- Tasks map to requirements.
- No unresolved question blocks the first task.

## Definition of done

A slice is done when:

- All in-scope MUST requirements are implemented.
- Traceability is complete.
- Automated critical-path tests pass.
- Visual states match the approved experience specification.
- Accessibility and reduced-motion checks pass.
- Tenant isolation, approval, recovery, and idempotency checks pass where applicable.
- Model evaluation remains within the accepted quality, latency, and cost bands.
- Migrations and rollback/recovery behavior are documented.
- Staging demonstration succeeds using realistic data.
- Known limitations are explicit and linked to backlog items.

## First required slice

Start with `/specs/001-vertical-launch-brief`. It must prove:

1. A user enters a room and asks for a launch brief.
2. A persisted plan assigns research to Seer, drafting to Scribe, and review to Sentinel.
3. The system executes those steps through typed adapters.
4. The user sees durable progress events.
5. The result is an editable artifact with citations and review notes.
6. Run history, model usage, and cost are inspectable.
7. Restarting the worker does not lose or duplicate work.

Use a simple non-3D shell for this first proof if necessary. Begin the constellation experience only after the vertical AI-work loop is real and measurable.
