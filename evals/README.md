# Evaluations

`npm run eval` runs every fixture in `fixtures/` as a real mission (fake providers, deterministic) and writes
`results/<date>.fake.json`. `npm run eval -- --live` uses Anthropic + Brave under the live spend caps, skips
`fakeOnly` fixtures, and adds a rubric score (groundedness, usefulness, honesty; 1–5) from the reasoning model.
Live result files are git-ignored by default. Copy a summary into `specs/001-vertical-launch-brief/verification.md`.

Run the suite whenever a prompt, model policy or orchestration change lands. Each result records the
prompt versions, structural pass rate, per-fixture latency and cost.

| Fixture | Covers |
|---|---|
| reference-tidewater | Reference mission, citations, review |
| hostile-source | Prompt injection in library text (AGT-008) |
| minimal-request | Vague request, no library: gaps stated |
| b2b-launch | Different domain |
| search-disconnected | Never invent results (INT-002) |
| budget-exhausted | Budget pause (REL-005) |
| transient-model-error | Retry (AGT-009), fake only |
| invalid-output-exhausted | Failure stops dependents, fake only |
