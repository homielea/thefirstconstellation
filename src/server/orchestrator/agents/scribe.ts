import { BRIEF_SECTION_KEYS, type SeerFindings } from "@/contracts";
import { checkBrief, citedMarkers } from "@/domain/integrity";
import { StepError, type CitationInput, type StepContext, type StepResult } from "../context";
import type { ResearchSource } from "./seer";

export async function runScribe(ctx: StepContext): Promise<StepResult> {
  const research = (await ctx.dependencyOutput("research")) as { sources: ResearchSource[]; findings: SeerFindings; __stepId: string };
  const findingsText = research.findings.findings.map((f, i) => `${i + 1}. ${f.claim} [${f.sourceIds.join("][")}] (confidence: ${f.confidence})`).join("\n");
  const brief = await ctx.callModel("scribe.brief@1", "fast",
    `Objective:\n${ctx.mission.objective}\n\nResearch summary: ${research.findings.summary}\n\nFindings:\n${findingsText}\n\nGaps the research could not answer:\n${research.findings.gaps.map((g) => `- ${g}`).join("\n") || "- none"}\n\nWrite the launch brief.`,
    { objective: ctx.mission.objective, findings: research.findings.findings }, 12000);

  const available = new Set(research.findings.findings.flatMap((f) => f.sourceIds));
  const check = checkBrief(brief, available);
  if (!check.ok) throw new StepError("invalid_output", "The draft cited sources that are not in the research.", true, { errors: check.errors });

  const order = new Map(BRIEF_SECTION_KEYS.map((k, i) => [k, i]));
  const sections = [...brief.sections].sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
  const used = new Set(sections.flatMap((s) => citedMarkers(s.body)));
  const byId = new Map(research.sources.map((s) => [s.id, s]));
  const citations: CitationInput[] = [...used].map((id) => byId.get(id)!).map((s) => ({
    ref: s.id, sourceKind: s.kind, url: s.url, sourceDocumentId: s.sourceDocumentId, title: s.title, excerpt: s.excerpt.slice(0, 1000), retrievedByStepId: research.__stepId,
  }));
  return {
    output: { sectionCount: sections.length, citations: used.size },
    artifacts: [{ type: "launch_brief", title: brief.title.slice(0, 200), content: { version: "launch-brief@1", title: brief.title.slice(0, 200), sections }, citations }],
    message: `${ctx.agent.config.properName} drafted the launch brief: ${sections.length} sections, ${used.size} sources cited.`,
    data: { sections: sections.length, citations: used.size },
  };
}
