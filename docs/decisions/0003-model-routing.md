# ADR-0003: Model routing, structured output and spend caps

Status: Accepted (2026-11-13)

## Decision
- `ModelProvider` interface (structured generation, usage, cancellation via AbortSignal).
  First implementation: Anthropic via the official `@anthropic-ai/sdk`, using `messages.parse` with
  `output_config.format` (Zod schema) for structured outputs.
- Agent profiles reference **model policies**, not model ids:
  - `reasoning` → `claude-opus-5-5` (adaptive thinking, effort `medium`): Seer synthesis, Sentinel review.
  - `fast` → `claude-sonnet-5-5` (effort `low`): Seer query proposal, Scribe drafting.
  Model ids and prices live in config (`src/agents/model-policies.ts`, `src/domain/pricing.ts`).
- Refusals (`stop_reason: refusal`) map to error category `model_error/refusal` and are visible in
  run history. Server-side refusal fallbacks are not enabled in Phase 0, so that every model that
  ran is recorded explicitly. Revisit in slice 003.
- **Spend caps (owner decision 2026-11-13):** $5 per live session, $25 in total for Phase 0. These are
  enforced in the adapter layer from the `live_spend` table before each live call (SEC-005). Each
  mission also has a budget, $1.00 by default (REL-005).
- Fake providers are used for CI and e2e. When they are active, the UI says so (PROD-005).

## Credentials
`ANTHROPIC_API_KEY` is read server-side only. It is never logged (redaction test) and never sent
to the client.
