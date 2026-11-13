/** USD per million tokens (Anthropic first-party list prices, cached 2026-11-03). */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "fake-reasoning": { input: 4, output: 20 },
  "fake-fast": { input: 2, output: 10 },
};
/** Brave Search: USD per request (Data for AI / Base plan list price, configurable). */
export const TOOL_PRICES: Record<string, number> = { "web.search": 0.005, "library.read": 0, "artifact.write": 0 };

export function modelCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICES[modelId];
  if (!p) throw new Error(`No price configured for model ${modelId}`);
  return roundUsd((inputTokens * p.input + outputTokens * p.output) / 1_000_000);
}
export function toolCostUsd(tool: string, calls = 1): number {
  return roundUsd((TOOL_PRICES[tool] ?? 0) * calls);
}
export const roundUsd = (n: number) => Math.round(n * 1e6) / 1e6;
export const formatUsd = (n: number) => (n < 0.01 && n > 0 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
