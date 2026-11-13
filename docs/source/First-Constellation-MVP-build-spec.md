# First Constellation — MVP product and technical specification

**Status:** Build handoff  
**Audience:** Claude or another implementation team  
**Version:** 1.0  
**Date:** 12 November 2026  
**Brand:** Parent brand name is intentionally TBD. “The First Constellation” is the first product experience, not the company name.

**Build protocol:** `Spec-driven-design-and-development.md` is a required companion document. It governs how every slice is specified, designed, implemented, traced, and verified.

## 1. Product definition

Build a multi-tenant web product where a person or small team receives seven foundational AI coworkers, personalizes them, gives them knowledge and connected tools, and delegates real work in shared rooms. The product must make the agents’ work visible, editable, and controllable. It must feel like entering a living constellation rather than configuring a conventional automation dashboard.

The founding story is original: everyone begins beneath the same seven lights. Each has a distinct gift. As the system learns the user’s work, those lights become personalized and new agents can eventually be created from the seven foundational archetypes.

This release is called **The First Constellation**. It establishes the product’s visual world and proves the core work loop. It is not a game, although its spatial model and agent identities should be reusable in a later exploratory world.

### Product promise

> Meet your first seven intelligences. Give them context, work with them individually or together, and turn finished work into capabilities your constellation can use again.

### MVP success event

A new user creates a workspace, meets and personalizes the seven agents, gives the workspace source material, delegates a real project in a room, watches agents complete a visible sequence of work, edits or comments on the result, approves any external action, and saves the successful workflow for reuse.

## 2. Product principles

1. **Useful before magical.** The constellation metaphor must clarify the system rather than hide its state.
2. **Seven identities, one controlled runtime.** The seven agents are distinct profiles with different instructions, tools, memory views, and visual identities. A single orchestration service routes and sequences work. Do not create uncontrolled agent-to-agent conversations.
3. **Names first, details on approach.** At galaxy scale, show only agent names and state. Reveal role, capabilities, current work, and glossary information as the user focuses or zooms in.
4. **Work remains inspectable.** Every run shows its plan, current step, tool activity, outputs, sources, cost, and failures in plain language.
5. **People control consequences.** Sending messages, publishing, spending money, deleting data, or modifying external systems requires an explicit approval policy. High-impact actions default to approval every time.
6. **Personalization changes behavior.** Renaming or tuning an agent must affect its visible identity and future behavior, not merely its profile card.
7. **Calm spatial design.** The visual world is dark, spacious, slow, and precise. Avoid game HUD clutter, cartoon mascots, stock nebula photography, dashboard card grids, and constant decorative motion.

## 3. Target user and initial use case

### Primary user

A founder, creative operator, consultant, agency lead, or small team that repeatedly researches, plans, writes, coordinates, reviews, and sends work across several tools.

### First demonstrated workflow

Two people in one workspace create a project room. One delegates a launch brief. The Navigator defines a plan, the Seer researches from uploaded and approved web sources, the Scribe produces an editable proposal, the Sentinel reviews it against the brief, and the human approves the final outbound email. The completed sequence can be saved as a reusable formation.

This workflow tests shared context, specialized agents, delegation, artifacts, review, approval, and reuse without requiring full browser or desktop automation.

## 4. The First Seven

Use working archetype labels internally until final proper names are selected. Each agent has a user-facing proper name, short epithet, capability profile, symbol, color/material signature, and default model instructions. Users may change the proper name, pronouns, voice description, visual seed, communication style, and selected permissions. The underlying archetype remains visible in the glossary and cannot be deleted in the MVP.

| Archetype | Default responsibility | Default tools | MVP output examples |
|---|---|---|---|
| Navigator | Clarify outcomes, break work into steps, route work | Tasks, room context, agent delegation | Plan, assignment map, progress summary |
| Seer | Research, compare, find patterns, cite evidence | Web search, workspace knowledge, file reading | Sourced research note, comparison |
| Scribe | Draft and revise clear communication | Documents, room context, style memory | Brief, proposal, email draft |
| Maker | Turn specifications into concrete assets | Structured artifact tools; optional code sandbox later | Checklist, structured content, simple page spec |
| Weaver | Coordinate people, agents, dependencies, and follow-ups | Tasks, comments, notifications | Handoff, meeting preparation, dependency map |
| Keeper | Organize knowledge and maintain continuity | Knowledge library, memory candidates, retrieval | Decision log, summary, reusable context |
| Sentinel | Review work against requirements, risks, and quality rubrics | Artifacts, sources, policies, approval rules | Review, flagged claims, release checklist |

### Runtime model

- Agent identity is a versioned configuration, not a separate always-running process.
- The Navigator acts as the default planner when a request involves more than one agent.
- The orchestrator creates a finite directed plan of steps. Each step has one owner, inputs, allowed tools, expected output, and completion criteria.
- Agents may hand off structured outputs. They do not hold free-form background conversations.
- Maximum automatic steps per run: 12. Maximum retries per step: 2. Both are configurable at workspace level later.
- A run pauses when it reaches an approval, missing information, exhausted budget, repeated tool failure, or ambiguous external target.
- The Sentinel can review an artifact but cannot approve an external action on behalf of a person.

## 5. Core vocabulary

Use these terms consistently in UI, code, database, and documentation.

| User-facing term | Meaning |
|---|---|
| Constellation | A workspace containing people, agents, knowledge, connections, and projects |
| Star | An individual agent identity |
| First Seven | The seven immutable foundational archetypes |
| Room | A shared project conversation and work context |
| Mission | A delegated unit of work with an outcome and lifecycle |
| Formation | A saved, reusable workflow connecting agents and steps |
| Artifact | An editable output such as a brief, research note, table, or message draft |
| Library | Approved workspace knowledge and uploaded source material |
| Connection | An authorized external service or communication channel |
| Approval | A recorded human decision allowing a consequential action |
| Signal | A notification, mention, failure, or request for attention |
| Orbit | An agent’s current relationship to a room or mission; primarily a visual concept |

Avoid replacing common actions with mythology when clarity would suffer. Buttons should say “Send email,” “Save formation,” and “Invite member,” rather than invented verbs.

## 6. MVP scope

### Required

- Passwordless email and OAuth sign-in.
- Workspace creation, invitation, and member roles.
- Automatic creation of the First Seven for each workspace.
- Guided onboarding and lightweight personalization of all seven.
- Interactive 3D constellation home with an accessible 2D/list fallback.
- Agent focus view and on-screen glossary.
- Rooms with people and selected agents.
- Missions with plans, steps, status, cancellation, retry, and visible logs.
- Streaming chat and agent responses.
- Editable text artifacts with version history and comments.
- File upload and retrieval over workspace knowledge.
- Web research with saved source URLs and citations.
- Human approval queue for outbound actions.
- One real outbound action: send an email through a connected account or product-managed sending address.
- Saved formations created from a successful mission.
- Basic usage and cost display.
- Settings for memory, connections, members, agent personalization, and data deletion.
- Responsive desktop/tablet experience; a simplified mobile layout.

### Designed now, implemented after the MVP

- Dedicated email address per agent.
- Telegram, WhatsApp, SMS, and phone calling.
- Full browser/computer use.
- Voice conversations and avatar speech.
- Public marketplace for agents or formations.
- New custom stars derived from the First Seven.
- Real-time multi-user editing with presence.
- Fully embodied game world.
- Native mobile applications.
- Billing beyond an internal usage ledger and optional plan gates.

Channel adapters must be modeled in the architecture so email, Telegram, WhatsApp, and phone can later map an inbound identity to the correct workspace, room, agent, and permission context. Do not build placeholder buttons for unavailable channels.

## 7. Primary user journeys

### 7.1 Enter the constellation

1. User signs in and creates a constellation.
2. Ask for workspace name, individual/team use, and one real outcome they want help with.
3. Reveal the seven stars in one composed sequence, with names and one-line gifts.
4. User may keep suggested proper names or rename each star.
5. User sets communication preference once: concise, balanced, or expansive. Each agent can later override it.
6. Offer one sample mission using the outcome supplied in step 2.
7. Finish at the constellation home with a clear “Begin a mission” action.

Target: reach a useful first artifact within ten minutes. Do not force users to configure every permission or connection before starting.

### 7.2 Explore a star

1. Hover/focus highlights a star and freezes unnecessary camera drift.
2. Click or keyboard-select moves the camera closer.
3. Show proper name first; then archetype, gift, current state, active missions, allowed tools, recent artifacts, and memory summary.
4. “Work with [name]” opens a direct room or adds the agent to an existing room.
5. “Personalize” opens behavior, visual, and permission settings with a preview.

### 7.3 Delegate a mission

1. In a room, user describes an outcome in natural language and optionally adds files, due date, and desired format.
2. Navigator returns a short proposed plan if multiple agents or an external action are needed.
3. User can edit agent assignments, remove steps, set a budget, or start.
4. The mission view streams progress by step. Each step names its agent, action, input, and output.
5. Agents create or revise artifacts rather than burying final work inside chat.
6. A failed step offers retry, edit instructions, reassign, or cancel.
7. The final view shows artifacts, sources, cost, unresolved caveats, and the option to save the sequence as a formation.

### 7.4 Review and approve

1. Consequential action creates an approval request containing exact payload, destination, initiating person, responsible agent, and reason.
2. Approver can edit the payload, approve once, reject with feedback, or cancel the mission.
3. The external side effect uses an idempotency key and is recorded with provider response.
4. Approval never authorizes a materially changed payload; a changed payload creates a new approval version.

### 7.5 Reuse a formation

1. User chooses “Save as formation” after a successful mission.
2. System extracts the ordered steps, agent archetypes, required inputs, connected tools, and approval points.
3. User names the formation and marks input fields as reusable variables.
4. A later room can start it, supply new inputs, review the generated plan, and run it.
5. Saved formations contain configuration and prompts, never copied private source data unless explicitly included.

## 8. Information architecture and screens

### Global navigation

- Constellation
- Rooms
- Missions
- Library
- Formations
- Signals
- Workspace settings

Use a restrained edge navigation that can collapse. The constellation remains spatially dominant.

### Required routes

```text
/                         marketing or sign-in
/onboarding
/c/[workspaceSlug]        constellation home
/c/[workspaceSlug]/stars/[agentId]
/c/[workspaceSlug]/rooms
/c/[workspaceSlug]/rooms/[roomId]
/c/[workspaceSlug]/missions/[missionId]
/c/[workspaceSlug]/artifacts/[artifactId]
/c/[workspaceSlug]/library
/c/[workspaceSlug]/formations
/c/[workspaceSlug]/formations/[formationId]
/c/[workspaceSlug]/signals
/c/[workspaceSlug]/settings/*
```

### Constellation home

The central canvas shows the seven agents in a slowly rotating, nonliteral orbital formation. A quiet status rail shows active missions and approvals. A single composer lets the user begin a mission without first choosing an agent. Selecting a star opens the focus layer without navigating away immediately.

At default zoom:

- Show proper name.
- Encode status with movement and a small accessible status label, not color alone.
- Show active relationships as temporary lines only when relevant.
- Keep decorative particles extremely sparse.

At close zoom:

- Reveal epithet and archetype.
- Show current mission or availability.
- Reveal glossary and capability controls in a side layer.
- Provide direct actions.

At far zoom in future versions, multiple constellations can become a galaxy. Do not implement multi-constellation navigation in the MVP.

## 9. Visual identity specification

### Design character

Quiet cosmic intelligence: dark, sculptural, precise, and subtly spiritual through geometry, proportion, rhythm, and light. It must feel premium and alive without resembling an astrology app, fantasy game menu, or generic dark SaaS dashboard.

### The memorable element

The living orbital system is the singular visual gesture. All surrounding interface should be flatter, quieter, and highly legible.

### Color tokens

Use these as an initial calibrated system; adjust after testing contrast on the actual canvas.

```css
--void: #050609;          /* primary spatial background */
--eclipse: #0C0E14;       /* panels and editor surfaces */
--slate-light: #A9AFBD;   /* secondary text */
--starlight: #F2F1EB;     /* primary text and focal light */
--aurora-blue: #8AA7FF;   /* selection and links */
--veil-violet: #A98DDA;   /* secondary agent energy */
--solar-amber: #DAB77A;   /* approvals and human attention */
--signal-coral: #E6877F;  /* errors and blocked work */
--success-mist: #8FC5B0;  /* completed work */
```

Each archetype receives a constrained material/light recipe derived from this palette. Do not assign seven rainbow colors. Differentiate with shape, orbital motion, symbol, and material as well as hue.

### Typography

- Interface and reading: **Söhne**, **Suisse International**, or a metrically similar licensed grotesk. If no commercial font license is available, use **Manrope** or **Inter** temporarily and keep font tokens replaceable.
- Mythic/display moments: a restrained high-contrast serif such as **Canela** if licensed, or **Cormorant Garamond** only for the opening story and major chapter title. Do not use it for controls.
- Sentence case throughout. Avoid tracked all-caps labels and monospace metadata as decoration.

### Geometry and avatars

- Agent avatars are generative abstract celestial forms, not human faces.
- MVP forms are deterministic combinations of a core mesh, halo/ring structure, surface shader, symbol glyph, and visual seed.
- Each agent has a static image fallback generated from the same seed.
- Personalization controls: name, symbol family, core form, ring density, light temperature, and motion temperament. Keep combinations curated so the world remains coherent.
- Store avatar configuration as JSON rather than a rendered image alone.

### Motion

- Default orbital drift: one full rotation in 90–180 seconds, with individual variance.
- User navigation and selection should complete in 350–700 ms with eased camera movement.
- Stop or greatly reduce ambient motion when a panel is open, the tab is hidden, reduced motion is enabled, or device performance drops.
- Do not make interface text orbit or rotate.
- Motion always communicates identity, relationship, state, or navigation.

### Accessibility and performance

- Every 3D action must be available through keyboard and the list fallback.
- Respect `prefers-reduced-motion` and offer a permanent “Still constellation” setting.
- Maintain WCAG 2.2 AA contrast for text and controls.
- Canvas must not block screen-reader navigation.
- Target 60 fps on a modern laptop and 30 fps minimum on supported mobile devices.
- Lazy-load the 3D bundle after core navigation. Render a static constellation immediately while it loads.
- Cap device pixel ratio and adapt particle count/shader quality based on frame rate.

## 10. Functional requirements

### Authentication and tenancy

- Email magic link and Google OAuth.
- Every domain object includes `workspace_id` except global archetype definitions.
- Membership roles: Owner, Admin, Member, Guest.
- Guests only access explicitly shared rooms and artifacts.
- Owners manage billing/data deletion; Admins manage members, agents, connections, and policies; Members create work; Guests comment and view within grants.
- Enforce authorization in the database and server layer. Never rely on hidden UI controls.

### Rooms and messages

- Room types: project and direct-agent.
- Messages support plain text, mentions, file attachments, artifact references, citations, and streaming status blocks.
- Mentioning an agent does not immediately create an external side effect.
- Store messages separately from run events. A run can produce summarized user-facing messages while retaining a detailed event log.
- A room has an explicit context set: selected library items, pinned decisions, participating agents, and connected project metadata.

### Missions and execution

- States: draft, awaiting_plan_approval, queued, running, awaiting_approval, blocked, completed, failed, cancelled.
- Step states: pending, ready, running, awaiting_approval, completed, failed, skipped, cancelled.
- Persist plans before execution.
- Worker execution must be durable, resumable, idempotent, and cancellable.
- All model and tool calls record latency, token counts, estimated cost, and error category.
- Stream events to the UI, but write the durable event first.
- Summarize noisy technical logs into plain-language events while preserving raw diagnostic metadata for Admins.

### Artifacts

- MVP artifact types: rich text document, research note with citations, checklist, structured table, and outbound message draft.
- Store canonical content as JSON plus a searchable text representation.
- Autosave drafts; create immutable versions at meaningful agent or human edits.
- Comment threads can anchor to a document selection or the artifact as a whole.
- Record author as human or agent profile and link agent edits to the originating mission step.
- Export rich text as Markdown and PDF after the core editor works; Markdown is required, PDF may follow in the next increment.

### Library and retrieval

- File types for MVP: PDF, DOCX, TXT, Markdown, and pasted text.
- Pipeline: upload → malware/type check → extract → normalize → chunk → embed → index → ready/failed state.
- Preserve source, page/section location, uploader, timestamp, workspace, and visibility.
- Retrieval must filter by workspace and user access before similarity search.
- Agent outputs cite retrieved chunks with navigable source locations where possible.
- Users choose whether a room message, artifact, or decision enters durable shared memory. Do not silently treat all conversation as permanent knowledge.

### Memory

Use three layers:

1. **Run context:** temporary inputs and state for a mission.
2. **Room memory:** summaries, pinned decisions, and artifacts relevant to one room.
3. **Workspace library:** explicitly approved durable knowledge.

Agent personalization has a fourth, limited profile memory containing communication preferences and user-approved behavioral notes. Show and allow deletion of these notes. Do not create opaque psychological profiles.

### Connections and tools

MVP tool registry:

- Workspace search/retrieval
- Web search and page reading
- Artifact create/read/update
- Task/mission read and update
- Email draft and send

Every tool declares input schema, output schema, required permission, risk class, retry behavior, and audit fields. Tool results are structured JSON and may include a human-readable summary.

### Email

- Connect Google/Microsoft mail via OAuth if practical, or begin with a product-managed transactional provider and verified sender identity.
- Sending always requires approval in the MVP.
- Store the exact approved subject, body, recipients, attachments, and provider idempotency key.
- Record delivery provider response. Do not claim open/read state unless the provider reliably supplies it and the user enables tracking.
- Incoming agent email addresses are a post-MVP channel adapter; preserve `channel_identity` and `conversation_binding` abstractions now.

### Formations

- A formation is a versioned workflow definition with typed inputs, ordered or dependent steps, archetype assignment, tool requirements, output types, and approval points.
- Saving from a mission produces a draft formation. The user reviews it before publishing to the workspace.
- Running a formation creates a new mission with a snapshot of the chosen formation version.
- Editing a formation never changes missions already in progress.

### Notifications/signals

- Signal types: mention, approval required, mission blocked, mission complete, invitation, connection failure.
- In-app signal center is required.
- Email notifications are configurable and should default to approvals, blocked missions, and invitations, not every agent event.

## 11. Suggested technical architecture

Keep provider boundaries replaceable. Equivalent technologies are acceptable if they preserve the contracts and requirements below.

### Frontend

- Next.js with TypeScript and React.
- React Three Fiber/Three.js for the constellation canvas.
- A mature accessible component primitive layer such as Radix UI, styled with project-owned design tokens rather than a default component theme.
- TipTap or Lexical for editable artifacts and anchored comments.
- TanStack Query for server state where useful; keep streamed run state reconciled against durable server state.
- Zod schemas shared across client/server boundaries.

### Backend

- Next.js server routes or a small TypeScript API service for synchronous product APIs.
- PostgreSQL as canonical application database.
- Object storage for uploads and rendered exports.
- `pgvector` or a managed vector index for embeddings, with strict tenant filtering.
- A durable workflow service such as Trigger.dev, Temporal, or Inngest for mission execution. Select one and write a thin adapter so mission semantics do not depend on vendor-specific event shapes.
- Redis only if required for rate limiting, ephemeral streaming coordination, or queues; do not introduce it solely by convention.
- Server-sent events for one-way run streaming. Use WebSockets only when real-time presence or bidirectional collaboration actually requires them.

### AI layer

- Provider adapter interface for chat completion, structured output, embeddings, token usage, and cancellation.
- Begin with one high-quality reasoning model and one faster, lower-cost model. Route planning/review to the reasoning model and routine drafting/summarization to the faster model.
- Agent profiles reference model policies rather than hard-coded model names.
- Use structured outputs for plans, tool calls, reviews, formation extraction, and memory proposals.
- Prompt templates are versioned and referenced on every mission step.
- Cache source extraction and embeddings. Do not cache personalized final responses across workspaces.

### Deployment

- Vercel or equivalent for the web application.
- Managed PostgreSQL/object storage.
- Separate durable worker runtime if the workflow provider does not host workers.
- Development, staging, and production environments with distinct credentials and databases.
- Infrastructure configuration committed as code where supported.

## 12. System components

```text
Web client
  ├─ Constellation renderer
  ├─ Rooms and mission UI
  ├─ Artifact editor
  └─ Settings and approvals
        │
Application API
  ├─ Auth and authorization
  ├─ Workspace/agent/room APIs
  ├─ Artifact and library APIs
  ├─ Approval/action APIs
  └─ Event stream
        │
Mission orchestrator
  ├─ Plan compiler
  ├─ Step scheduler
  ├─ Agent runner
  ├─ Tool gateway
  ├─ Policy/approval gate
  └─ Usage recorder
        │
Provider adapters
  ├─ Model providers
  ├─ Embeddings
  ├─ Web research
  ├─ Email
  ├─ Object storage
  └─ Future channel adapters
```

### Orchestration sequence

```text
Request
→ normalize mission input
→ retrieve authorized context
→ create structured plan
→ optional human plan review
→ execute ready step
→ persist result and event
→ validate expected output
→ unlock dependent steps
→ pause at approval gates
→ assemble artifacts
→ Sentinel review when configured
→ complete mission
→ propose reusable formation and memory updates
```

Each transition is persisted. Retrying a worker must not duplicate an email, artifact version, or other side effect.

## 13. Core data model

Use UUID primary keys, UTC timestamps, soft deletion where recovery is valuable, and explicit version columns for mutable definitions.

### Identity and tenancy

- `users`
- `workspaces`
- `workspace_memberships`
- `invitations`
- `roles` or fixed role enum plus policy checks

### Agents

- `agent_archetypes`: the global First Seven definitions
- `agent_profiles`: workspace-specific name, persona, avatar config, model policy, status
- `agent_profile_versions`: immutable configuration snapshots
- `agent_tool_grants`: allowed tool and scope by agent
- `agent_memory_notes`: user-visible personalization notes

### Collaboration

- `rooms`
- `room_members`
- `room_agents`
- `messages`
- `message_attachments`
- `room_context_items`

### Execution

- `missions`
- `mission_plans`
- `mission_steps`
- `step_dependencies`
- `run_events`
- `tool_executions`
- `model_executions`
- `approvals`
- `external_actions`
- `usage_ledger`

### Knowledge and outputs

- `files`
- `source_documents`
- `document_chunks` with embedding
- `artifacts`
- `artifact_versions`
- `artifact_comments`
- `citations`
- `memory_proposals`

### Reuse and integrations

- `formations`
- `formation_versions`
- `connections`
- `connection_grants`
- `channel_identities`
- `conversation_bindings`
- `notifications`

### Critical invariants

- All tenant-owned tables carry `workspace_id` directly, even when it could be inferred through joins.
- A mission references immutable snapshots of agent and formation versions.
- Secrets never live in agent configuration, prompts, tool logs, or client-visible payloads.
- Approved action payload hash must match the payload executed.
- Citation records reference exact source chunks or URLs used during the relevant step.

## 14. API contracts

Use REST or typed server actions for CRUD and SSE for mission events. Names may change, but these capabilities must exist.

```text
POST   /api/workspaces
POST   /api/workspaces/:id/invitations
GET    /api/workspaces/:id/agents
PATCH  /api/agents/:id
POST   /api/rooms
POST   /api/rooms/:id/messages
POST   /api/missions
POST   /api/missions/:id/plan
POST   /api/missions/:id/start
POST   /api/missions/:id/cancel
POST   /api/mission-steps/:id/retry
GET    /api/missions/:id/events        (SSE)
POST   /api/approvals/:id/approve
POST   /api/approvals/:id/reject
POST   /api/artifacts
PATCH  /api/artifacts/:id
POST   /api/library/uploads
POST   /api/formations/from-mission/:id
POST   /api/formations/:id/run
GET    /api/usage/summary
```

### Structured plan shape

```ts
type MissionPlan = {
  objective: string;
  assumptions: string[];
  inputsRequired: Array<{ key: string; description: string; required: boolean }>;
  steps: Array<{
    id: string;
    title: string;
    agentArchetype: 'navigator' | 'seer' | 'scribe' | 'maker' | 'weaver' | 'keeper' | 'sentinel';
    dependsOn: string[];
    allowedTools: string[];
    expectedOutput: { artifactType?: string; description: string };
    approvalPolicy: 'none' | 'before_external_action';
  }>;
  estimatedUsage: { modelCalls: number; costBand: 'low' | 'medium' | 'high' };
};
```

## 15. Security, privacy, and trust

- Apply database row-level security or equivalent tenant enforcement and test it directly.
- Encrypt provider credentials using a managed key service. Store refresh tokens server-side only.
- Apply least-privilege OAuth scopes and show them before connection.
- Keep an immutable audit record of membership changes, permission changes, approvals, and external actions.
- Sanitize and scan uploads; validate MIME type independently from file extension.
- Treat retrieved documents, websites, emails, and tool results as untrusted data that cannot override system or workspace policies.
- Isolate tool instructions from retrieved content to limit prompt injection.
- Redact secrets and sensitive headers from logs and model prompts.
- Rate-limit auth, invitations, uploads, web research, model requests, and outbound messages.
- Provide workspace export and deletion. Deletion should revoke connections, schedule object/vector deletion, and produce an audit record.
- Do not train shared models on workspace content through product behavior. Document provider retention settings.
- Add configurable model/tool budgets per mission and workspace.
- Display uncertainty and sources for factual research. Do not imply that Sentinel review guarantees correctness.

## 16. Observability and evaluation

### Operational telemetry

- Request and workflow traces with workspace-safe identifiers.
- Mission/step duration, retries, cancellation, failure category, tool latency, model latency, token use, and cost.
- Worker heartbeat and stuck-run detection.
- Error reporting with secret redaction.
- Admin-only diagnostic view for one mission’s timeline.

### Product events

- Workspace created
- Onboarding completed
- First mission started/completed
- First artifact accepted or substantially edited
- Approval requested/resolved
- Formation saved/reused
- Member invited/active
- Agent personalized

### Quality measures

- Time to first useful artifact.
- Mission completion rate.
- Percentage of completed artifacts accepted without major rewrite.
- Human interventions per completed mission.
- Citation validity for research missions.
- External-action error/duplicate rate.
- Cost per accepted artifact.
- Formation reuse rate.

Create a small evaluation suite of at least 20 representative mission fixtures covering research, drafting, coordination, review, missing inputs, hostile source instructions, tool failure, and approval boundaries. Store expected structural outcomes and rubric scores. Run it when prompts, models, or orchestration change.

## 17. Failure and empty states

- No rooms: “Begin with a real outcome. The constellation will suggest who should help.”
- Agent unavailable: explain whether the model, connection, or permission is blocking work and offer a relevant action.
- Missing context: list the exact information needed and preserve the mission as blocked.
- Failed tool call: show what was attempted, whether anything changed externally, and safe retry options.
- Budget reached: pause before another model/tool call and allow the user to raise the limit or finish manually.
- Lost event stream: reconnect and hydrate from durable events without restarting the mission.
- 3D failure or low-performance device: automatically use the fully functional still/list constellation.

## 18. Build phases

Every phase below follows the required spec-driven lifecycle: brief → requirements → experience specification → technical design → contracts → tasks → implementation → verification. A phase does not advance merely because code exists; its in-scope MUST requirements need traceable evidence.

### Phase 0 — foundation and vertical prototype

- Repository, environments, design tokens, auth, database migration system, CI.
- Manual end-to-end prototype: one user asks for a sourced launch brief; a fixed plan invokes Seer, Scribe, and Sentinel; output appears as an artifact.
- Validate output quality and record baseline latency/cost before general orchestration.

**Exit:** One representative workflow produces an inspectable artifact with sources and a persisted run history.

### Phase 1 — constellation shell

- Workspace and membership.
- Seed the First Seven.
- Onboarding and personalization.
- 3D home plus accessible fallback.
- Agent focus/glossary.

**Exit:** A new user can create a workspace, meet all seven, personalize names/visuals, and navigate without a mouse or 3D canvas.

### Phase 2 — rooms, missions, and artifacts

- Rooms/messages.
- Mission planner, durable steps, event stream, cancellation/retry.
- Artifact editor/versioning/comments.
- Usage ledger.

**Exit:** Two users can delegate, inspect progress, edit an output, and recover from an injected step failure.

### Phase 3 — knowledge, research, and review

- Upload/extraction/embedding/retrieval.
- Web research and citations.
- Memory proposals and explicit promotion.
- Sentinel review rubrics.

**Exit:** Research output cites only authorized workspace sources and web pages, and malicious document instructions cannot change tool policy.

### Phase 4 — approvals, email, and formations

- Connection framework and email provider.
- Approval queue and payload hashes.
- External action audit.
- Save/run formations.
- In-app and essential email signals.

**Exit:** An approved email is sent exactly once, a changed draft requires new approval, and the workflow can be reused with new inputs.

### Phase 5 — hardening and pilot

- Evaluation suite, accessibility review, performance budgets, security review, exports/deletion, onboarding analytics, admin diagnostics.
- Pilot with 5–10 users completing real work.

**Exit:** Acceptance criteria below pass in staging, and pilot users complete the reference workflow without developer assistance.

## 19. MVP acceptance criteria

### Product

- A new workspace always receives exactly one profile for each of the First Seven archetypes.
- A user can rename and visually personalize every star; changes persist and render consistently in canvas, list, room, and artifact attribution.
- A two-member workspace can run the reference mission from request through reviewed artifact.
- Every multi-agent mission exposes a finite plan and agent assignment before or during execution according to policy.
- Users can cancel an active mission and no new step begins after cancellation is committed.
- At least one artifact can be collaboratively commented on and revised with version attribution.
- Research claims link to stored citations.
- An outbound email cannot send without a valid, current human approval.
- Retrying a completed send does not send a duplicate.
- A completed mission can become a reusable versioned formation.
- Workspace owners can export core workspace data and request deletion.

### Experience

- Core workflow is usable at 320 px width, though the mobile constellation may use the still/list treatment.
- Core workflow is fully keyboard accessible and screen-reader navigable.
- Reduced-motion mode contains no ambient orbital animation.
- Primary text and controls meet WCAG 2.2 AA contrast.
- Initial interactive shell loads before the optional 3D bundle.
- The constellation maintains target frame rates or automatically reduces quality.

### Reliability and security

- Tenant-isolation tests prevent cross-workspace reads through direct IDs, search, embeddings, artifact links, and event streams.
- Worker retry tests produce no duplicate artifacts, messages, approvals, or external actions.
- A dropped client connection does not stop a mission or lose durable events.
- Prompt-injection fixtures cannot grant tools, reveal secrets, or bypass approval.
- Logs contain no OAuth tokens, API keys, full private documents, or sensitive email headers.
- Stuck workflows are detected and surfaced to an operator.

## 20. Testing strategy

- Unit-test policy evaluation, plan validation, dependency unlocking, payload hashing, cost calculation, and formation compilation.
- Integration-test row-level authorization, mission state transitions, vector retrieval filters, file pipeline, email idempotency, and event reconnection.
- End-to-end test onboarding, invite, reference mission, artifact revision, approval/send, formation reuse, reduced motion, and keyboard-only navigation.
- Use provider fakes for deterministic CI and a small, budget-capped live-provider suite in staging.
- Add visual regression captures for constellation default, focus, active mission, approval state, reduced motion, and low-performance fallback.
- Test representative low-end devices and browsers before pilot.

Do not write tests that merely mirror implementation details. Prioritize tenant boundaries, irreversible actions, workflow recovery, and the user’s main journey.

## 21. Explicit non-goals and constraints

- Do not fork or rebrand Bops. Its source license restricts substantially similar competing commercial use.
- Do not reproduce Lucinda Riley’s characters, titles, plot, family relationships, or terminology. The product uses an original celestial mythology.
- Do not market the product as associated with *The Seven Sisters*, Zelda, or any referenced property.
- Do not build a simulated agent conversation for entertainment. Every agent step must advance a user-visible outcome.
- Do not make the 3D canvas the only way to navigate.
- Do not give agents unrestricted credentials or broad external action rights.
- Do not implement phone, WhatsApp, Telegram, browser automation, marketplace, billing complexity, or a game world before the reference workflow is reliable.
- Do not lock the application to one model, email, workflow, storage, or search provider.

## 22. Decisions Claude may make without further approval

- Exact folder structure and naming conventions.
- Choice between equivalent accessible UI primitives.
- Choice of durable workflow provider after a short written comparison.
- Choice of rich-text editor after validating comments/version serialization.
- Exact shader and mesh implementation within the visual/performance constraints.
- Exact model versions through configuration.
- Minor copy needed to complete clear flows.

Claude should record major architectural decisions in `/docs/decisions/` as short ADRs. It should stop and surface a decision when it materially changes product scope, tenancy, approval behavior, data retention, provider lock-in, or monthly operating cost.

## 23. Required implementation deliverables

- Running application and setup instructions.
- Database schema and migrations.
- Seed data for the First Seven.
- Environment-variable template with no secrets.
- Architecture diagram and provider boundaries.
- ADRs for auth/database, workflow engine, model routing, retrieval, email, and 3D approach.
- Prompt and agent-profile versions stored in source control or a versioned registry.
- Evaluation fixtures and results.
- Automated tests for critical acceptance criteria.
- Staging deployment.
- Short operator guide for diagnosing a failed mission and revoking a connection.
- Known limitations and post-MVP backlog.

## 24. Handoff instruction for Claude

Read this specification and `Spec-driven-design-and-development.md` completely before editing code. Start by returning:

1. A concise playback of the product and the reference user journey.
2. Any contradictions or missing prerequisites that truly block implementation.
3. A proposed repository structure and concrete technology choices.
4. A phase-by-phase implementation plan mapped to the acceptance criteria.
5. The first vertical slice you will build and how it will be demonstrated.

Create the required `/specs` structure and the initial traceability matrix as part of Phase 0. Write and review the specification for the active vertical slice before implementing it. Every implementation task must cite requirement IDs, and every completed MUST requirement must have verification evidence.

Then implement Phase 0 as a working vertical slice before expanding the architecture. Keep the application runnable after every phase. Use real product copy and the seven seeded identities, even if their proper names are initially marked as working names. Do not fill unavailable capabilities with fake success states. Represent integrations and model calls behind typed adapters, persist mission state before streaming it, and enforce workspace authorization at every data access boundary.

The finished MVP should make this demonstration possible:

> A founder enters a dark, living constellation and meets seven distinct intelligences. She invites a collaborator, opens a room, and asks for a launch brief. The constellation proposes a short formation. Research, writing, and review happen visibly. She edits the result, approves the exact email, sends it once, and saves the formation to use again.
