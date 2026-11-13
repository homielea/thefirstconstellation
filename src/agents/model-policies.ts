/** ADR-0003: profiles reference policies; ids are configuration. */
export type ModelPolicy = "reasoning" | "fast";
export const MODEL_POLICIES: Record<ModelPolicy, { live: string; fake: string; effort: "low" | "medium" | "high" }> = {
  reasoning: { live: "claude-opus-5-5", fake: "fake-reasoning", effort: "medium" },
  fast: { live: "claude-sonnet-5-5", fake: "fake-fast", effort: "low" },
};
