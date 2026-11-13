import { BriefContent, type SeerFindings } from "@/contracts";
import { checkReview } from "@/domain/integrity";
import { StepError, type StepContext, type StepResult } from "../context";
import type { ResearchSource } from "./seer";

export async function runSentinel(ctx: StepContext): Promise<StepResult> {
  const research = (await ctx.dependencyOutput("research")) as { sources: ResearchSource[]; findings: SeerFindings };
  const brief = await ctx.read(async (db) => {
    const r = await db.query(
      `SELECT a.id, a.current_version, v.content FROM artifacts a JOIN artifact_versions v ON v.artifact_id=a.id AND v.version=a.current_version
       WHERE a.mission_id=$1 AND a.type='launch_brief'`, [ctx.mission.id]);
    if (!r.rows[0]) throw new StepError("internal", "The brief to review was not found.", false);
    return { id: r.rows[0].id as string, version: r.rows[0].current_version as number, content: BriefContent.parse(r.rows[0].content) };
  });
  const briefText = brief.content.sections.map((s) => `[section ${s.key}] ${s.heading}\n${s.body}`).join("\n\n");
  const findingsText = research.findings.findings.map((f) => `- ${f.claim} [${f.sourceIds.join("][")}]`).join("\n");
  const review = await ctx.callModel("sentinel.review@1", "reasoning",
    `Request:\n${ctx.mission.objective}\n\nResearch findings the brief may cite:\n${findingsText}\n\nBrief (version ${brief.version}):\n${briefText}\n\nReview the brief using the rubric.`,
    { objective: ctx.mission.objective, sections: brief.content.sections });
  const check = checkReview(review, new Set(brief.content.sections.map((s) => s.key)));
  if (!check.ok) throw new StepError("invalid_output", "The review referred to sections that are not in the brief.", true, { errors: check.errors });
  const count = (sev: string) => review.findings.filter((f) => f.severity === sev).length;
  const parts = [["problem", count("problem")], ["caution", count("caution")], ["note", count("info")]].filter(([, n]) => (n as number) > 0).map(([w, n]) => `${n} ${w}${n === 1 ? "" : "s"}`);
  return {
    output: { reviewedArtifactId: brief.id, reviewedVersion: brief.version, problems: count("problem"), cautions: count("caution") },
    artifacts: [{ type: "review", title: "Review notes", content: { version: "sentinel-review@1", ...review, reviewedArtifactId: brief.id, reviewedVersion: brief.version }, citations: [], reviewsArtifactId: brief.id }],
    message: `${ctx.agent.config.properName} reviewed the brief (version ${brief.version}): ${parts.join(", ") || "no findings"}.`,
    data: { problems: count("problem"), cautions: count("caution"), info: count("info") },
  };
}
