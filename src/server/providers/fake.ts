import type { z } from "zod";
import { MODEL_POLICIES } from "@/agents/model-policies";
import type { ScribeBrief, SeerFindings, SeerQueries, SentinelReview, WebSearchOutput } from "@/contracts";
import { takeFault } from "./faults";
import { ProviderError, type ModelProvider, type SearchProvider, type StructuredRequest, type StructuredResult } from "./types";

const est = (s: string) => Math.max(1, Math.ceil(s.length / 4));
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); rej(new ProviderError("internal", "The call was cancelled.", false)); }, { once: true });
});
const firstSentence = (s: string) => (s.split(/(?<=[.!?])\s/)[0] ?? s).slice(0, 220).trim();
const topicOf = (objective: string) => objective.replace(/^(please\s+)?(draft|write|create|prepare)\s+(a|an|the)?\s*(launch brief (for|about)\s+)?/i, "").replace(/[.?!]+$/, "").slice(0, 80);

interface SourceCtx { id: string; title: string; excerpt: string }

/** Deterministic test double. Reads only `context`; never claims to be a model in the UI (PROD-005). */
export class FakeModelProvider implements ModelProvider {
  readonly name = "fake";
  readonly mode = "fake" as const;
  constructor(private delayMs = Number(process.env.FAKE_DELAY_MS ?? 150)) {}

  async generateStructured<S extends z.ZodTypeAny>(req: StructuredRequest<S>): Promise<StructuredResult<z.infer<S>>> {
    const started = Date.now();
    const modelId = MODEL_POLICIES[req.policy].fake;
    const fault = takeFault(req.schemaName);
    await sleep(fault?.kind === "hang" ? (fault.ms ?? 600_000) : this.delayMs, req.signal);
    const usage = { modelId, inputTokens: est(req.system + req.user), latencyMs: 0, stopReason: "end_turn" };
    if (fault?.kind === "error") throw new ProviderError("model_error", "The model service returned an error.", true, { ...usage, outputTokens: 0, injected: true });
    if (fault?.kind === "invalid") throw new ProviderError("invalid_output", "The model's answer did not match the required format.", true, { ...usage, outputTokens: 40, injected: true });
    const output = this.produce(req.schemaName, req.context as Record<string, unknown>);
    const parsed = req.schema.parse(output);
    if (fault?.kind === "crash") {
      console.error(JSON.stringify({ msg: "fault: crashing worker after model call", schema: req.schemaName }));
      process.exit(137);
    }
    return { ...usage, output: parsed, outputTokens: est(JSON.stringify(output)), latencyMs: Date.now() - started };
  }

  private produce(schema: string, ctx: Record<string, unknown>): unknown {
    switch (schema) {
      case "seer.queries@1": {
        const t = topicOf(String(ctx.objective ?? "the launch"));
        return { queries: [t, `${t} competitors`, `${t} target audience`] } satisfies SeerQueries;
      }
      case "seer.findings@1": {
        const sources = (ctx.sources as SourceCtx[]) ?? [];
        const findings = sources.slice(0, 6).map((s, i) => ({
          claim: `${s.title}: ${firstSentence(s.excerpt) || "relevant to the launch"}`,
          sourceIds: [s.id],
          confidence: (i < 2 ? "high" : "medium") as "high" | "medium",
        }));
        return { summary: `Sample research drawn from ${sources.length} sources.`, findings, gaps: ["The sources do not state competitor pricing."] } satisfies SeerFindings;
      }
      case "scribe.brief@1": {
        const f = (ctx.findings as SeerFindings["findings"]) ?? [];
        const cite = (i: number) => (f[i % Math.max(1, f.length)]?.sourceIds[0] ? ` [${f[i % f.length]!.sourceIds[0]}]` : "");
        const claim = (i: number) => f[i % Math.max(1, f.length)]?.claim ?? "No research finding available.";
        const t = topicOf(String(ctx.objective ?? "the launch"));
        return {
          title: `Launch brief: ${t}`,
          sections: [
            { key: "overview", heading: "Overview", body: `This sample brief covers ${t}. ${claim(0)}${cite(0)}` },
            { key: "audience", heading: "Audience", body: `Primary audience inferred from the research. ${claim(1)}${cite(1)}` },
            { key: "positioning", heading: "Positioning", body: `${claim(2)}${cite(2)}` },
            { key: "key_messages", heading: "Key messages", body: `1. ${claim(0)}${cite(0)}\n2. ${claim(3)}${cite(3)}` },
            { key: "channels", heading: "Channels", body: `Owned channels first, then partner newsletters.${cite(1)}` },
            { key: "risks", heading: "Risks", body: "Competitor pricing is unknown; claims about market size need checking." },
            { key: "next_steps", heading: "Next steps", body: "Confirm the launch date, owners and budget." },
          ],
        } satisfies ScribeBrief;
      }
      case "sentinel.review@1":
        return {
          summary: "Sample review: the brief is structured and cited; one section needs evidence.",
          findings: [
            { severity: "caution", sectionKey: "channels", issue: "Channel choice is not supported by a specific finding.", rationale: "Only one source is cited and it does not discuss channels." },
            { severity: "info", sectionKey: "risks", issue: "Risks are stated without owners.", rationale: "Assigning owners makes follow-up clearer." },
          ],
        } satisfies SentinelReview;
      default:
        throw new ProviderError("internal", `Fake provider has no generator for ${schema}`, false);
    }
  }
}

export class FakeSearchProvider implements SearchProvider {
  readonly name = "fake-search";
  readonly mode = "fake" as const;
  async search(query: string, count: number): Promise<WebSearchOutput> {
    if (takeFault("web.search")?.kind === "error") throw new ProviderError("model_error", "Web search returned an error.", true, { injected: true });
    const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(-48) || "query";
    return {
      results: Array.from({ length: Math.min(count, 3) }, (_, i) => ({
        title: `Sample result ${i + 1} for “${query.slice(0, 60)}”`,
        url: `https://example.org/${slug}/${i + 1}`,
        snippet: `Sample snippet ${i + 1} about ${query.slice(0, 60)}. Generated by the test search provider.`,
      })),
    };
  }
}
