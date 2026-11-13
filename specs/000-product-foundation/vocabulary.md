# Vocabulary

Use these terms consistently in UI, code, database and docs. Buttons use plain verbs
("Send email", "Save formation", "Invite member"), never invented mythology.

| User-facing term | Code / table | Meaning |
|---|---|---|
| Constellation | `workspaces` | Workspace holding people, agents, knowledge, connections, projects |
| Star | `agent_profiles` | One agent identity in a workspace |
| First Seven | `agent_archetypes` | The seven immutable foundational archetypes (global) |
| Room | `rooms` | Shared project conversation and work context |
| Mission | `missions` | Delegated unit of work with outcome and lifecycle |
| Plan / step | `mission_plans`, `mission_steps` | Finite directed plan; each step has one owner |
| Formation | `formations` (slice 005) | Saved, reusable, versioned workflow |
| Artifact | `artifacts`, `artifact_versions` | Editable output (brief, research note, review, draft) |
| Library | `source_documents` | Approved workspace knowledge and source material |
| Connection | `connections` (slice 005) | Authorised external service |
| Approval | `approvals` (slice 005) | Recorded human decision allowing a consequential action |
| Signal | `notifications` (slice 005) | Notification, mention, failure or request for attention |
| Orbit | (visual only) | An agent's current relationship to a room or mission |

## The First Seven (working names)

The proper names are **working names**, marked as such in the glossary until final names
are chosen. They are original and come from no existing story.

| Archetype key | Working proper name | Epithet (one-line gift) |
|---|---|---|
| navigator | Vela | Finds the line from intent to outcome |
| seer | Iris | Looks outward and brings back evidence |
| scribe | Quill | Turns findings into clear words |
| maker | Forge | Shapes specifications into usable things |
| weaver | Loom | Holds people, handoffs and follow-ups together |
| keeper | Ember | Keeps what was learned and decided |
| sentinel | Ward | Checks the work before it leaves |

Users may rename stars. The archetype stays visible and cannot be deleted.
