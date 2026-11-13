import { wrapSource } from "@/agents/prompts";
import type { WebSearchOutput } from "@/contracts";
import { checkFindings } from "@/domain/integrity";
import { StepError, type CitationInput, type StepContext, type StepResult } from "../context";
import { invokeTool, isAllowed } from "../gateway";

export interface ResearchSource { id: string; kind: "web" | "library"; title: string; url: string | null; sourceDocumentId: string | null; excerpt: string }

export async function runSeer(ctx: StepContext): Promise<StepResult> {
  const objective = ctx.mission.objective;
  const sources: ResearchSource[] = [];

  if (isAllowed(ctx, "library.read")) {
    const lib = (await invokeTool(ctx, "library.read", { limit: 10 })) as { items: { id: string; title: string; text: string }[] };
    lib.items.forEach((it, i) => sources.push({ id: `L${i + 1}`, kind: "library", title: it.title, url: null, sourceDocumentId: it.id, excerpt: it.text.slice(0, 4000) }));
    if (lib.items.length) await ctx.event("step.tool", `${ctx.agent.config.properName} read ${lib.items.length} library item${lib.items.length === 1 ? "" : "s"}.`, { tool: "library.read", count: lib.items.length });
  }

  const q = await ctx.callModel("seer.queries@1", "fast",
    `Objective:\n${objective}\n\nLibrary items available: ${sources.map((s) => s.title).join("; ") || "none"}\n\nPropose up to three web search queries.`,
    { objective });
  const seen = new Set<string>();
  let w = 0;
  for (const query of q.queries.slice(0, 3).map((s) => s.trim()).filter(Boolean)) {
    const res = (await invokeTool(ctx, "web.search", { query: query.slice(0, 300), count: 5 })) as WebSearchOutput;
    let added = 0;
    for (const r of res.results) {
      if (seen.has(r.url) || w >= 10) continue;
      seen.add(r.url);
      sources.push({ id: `W${++w}`, kind: "web", title: r.title, url: r.url, sourceDocumentId: null, excerpt: r.snippet });
      added++;
    }
    await ctx.event("step.tool", `${ctx.agent.config.properName} searched the web for “${query.slice(0, 80)}”: ${res.results.length} results, ${added} new.`, { tool: "web.search", query, results: res.results.length });
  }
  if (sources.length === 0) throw new StepError("invalid_output", "No sources were found for this objective.", false);

  const blocks = sources.map((s) => wrapSource(s.id, s.title, `${s.url ? `URL: ${s.url}\n` : ""}${s.excerpt}`)).join("\n\n");
  const findings = await ctx.callModel("seer.findings@1", "reasoning",
    `Objective:\n${objective}\n\nSources:\n${blocks}\n\nReport findings relevant to a launch brief. Cite source ids exactly.`,
    { objective, sources: sources.map(({ id, title, excerpt }) => ({ id, title, excerpt })) });

  const check = checkFindings(findings, new Set(sources.map((s) => s.id)));
  if (!check.ok) throw new StepError("invalid_output", "The research cited sources that were not provided.", true, { errors: check.errors });

  const cited = new Set(findings.findings.flatMap((f) => f.sourceIds));
  const citations: CitationInput[] = sources.filter((s) => cited.has(s.id)).map((s) => ({
    ref: s.id, sourceKind: s.kind, url: s.url, sourceDocumentId: s.sourceDocumentId, title: s.title, excerpt: s.excerpt.slice(0, 1000), retrievedByStepId: ctx.step.id,
  }));
  return {
    output: { sources, findings },
    artifacts: [{ type: "research_note", title: "Research note", content: { version: "research-note@1", ...findings }, citations }],
    message: `${ctx.agent.config.properName} finished research: ${findings.findings.length} findings from ${cited.size} sources.`,
    data: { findings: findings.findings.length, sources: cited.size, gaps: findings.gaps.length },
  };
}
