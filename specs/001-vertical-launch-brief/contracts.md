# 001 — Contracts and fixtures

The Zod schemas in `src/contracts/` are the source of truth. `npm run contracts:export`
writes JSON Schema to `src/contracts/generated/*.schema.json`. TypeScript types are
`z.infer` of the same schemas, so producer and consumer cannot drift. Valid and invalid fixtures
live in `src/contracts/fixtures/` and are asserted by `tests/unit/contracts.test.ts`.

| Contract | File | Version |
|---|---|---|
| `MissionPlan` (build spec §14 shape + `templateId`, `budgetUsd`) | `plan.ts` | `mission-plan@1` |
| `SeerQueries`, `SeerFindings` | `agent-outputs.ts` | `seer.queries@1`, `seer.findings@1` |
| `ScribeBrief` | `agent-outputs.ts` | `scribe.brief@1` |
| `SentinelReview` | `agent-outputs.ts` | `sentinel.review@1` |
| `BriefContent` (artifact canonical JSON) | `artifact.ts` | `launch-brief@1` |
| `RunEvent` (discriminated union by `type`) | `events.ts` | `run-event@1` |
| `ToolDefinition` + `web_search` I/O | `tools.ts` | `tool@1` |
| `AgentProfileConfig` | `agent-profile.ts` | `agent-profile@1` |
| API: `CreateMissionRequest`, `SaveArtifactVersionRequest`, `RequestLinkRequest` | `api.ts` | `api@1` |

## Versioning
- Each contract carries a literal version string. A breaking change creates `@2` alongside `@1`,
  and readers must accept every version still present in stored data.
- Stored JSON (plans, artifact content, event data) is validated on read. Unknown versions are
  rejected with an explicit error, never silently coerced.

## API (slice 001)
```text
POST /api/auth/request-link        {email}                → 202 {devNotice?}
GET  /auth/verify?token=…          → 303 to /c/<slug> (sets session cookie)
POST /api/auth/sign-out            → 303 /
POST /api/missions                 {workspaceSlug, roomId, request} → 201 {missionId}
POST /api/missions/:id/cancel      → 200 {status}
POST /api/mission-steps/:id/retry  → 200 {status}
GET  /api/missions/:id/events      (SSE; id = seq; supports Last-Event-ID / ?after=)
PATCH /api/artifacts/:id           {baseVersion, content: BriefContent} → 200 {version}
                                   409 if baseVersion is not current
```
All mutating routes require same-origin `Origin` and a session. Errors use the shape
`{error: {code, message}}`.

## Fixtures
- `plan.valid.launch-brief.json`, `plan.invalid.cycle.json`, `plan.invalid.too-many-steps.json`,
  `plan.invalid.unknown-archetype.json`
- `seer.findings.valid.json`, `seer.findings.invalid.unknown-source.json`
- `scribe.brief.valid.json`, `sentinel.review.valid.json`
- Eval fixtures: `evals/fixtures/*.json` (see `evals/README.md`)
