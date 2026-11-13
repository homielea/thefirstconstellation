import { z } from "zod";
import { BriefSectionKey, SeerFindings, SentinelReview } from "./agent-outputs";

export const BriefContent = z.object({
  version: z.literal("launch-brief@1"),
  title: z.string().min(1).max(200),
  sections: z.array(z.object({ key: BriefSectionKey, heading: z.string().min(1).max(120), body: z.string().max(20000) })).min(1).max(20),
});
export type BriefContent = z.infer<typeof BriefContent>;

export const ResearchNoteContent = SeerFindings.extend({ version: z.literal("research-note@1") });
export type ResearchNoteContent = z.infer<typeof ResearchNoteContent>;

export const ReviewContent = SentinelReview.extend({
  version: z.literal("sentinel-review@1"),
  reviewedArtifactId: z.string().uuid(),
  reviewedVersion: z.number().int().positive(),
});
export type ReviewContent = z.infer<typeof ReviewContent>;

export const ARTIFACT_TYPES = ["launch_brief", "research_note", "review"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export function parseArtifactContent(type: ArtifactType, content: unknown) {
  switch (type) {
    case "launch_brief":
      return { type, content: BriefContent.parse(content) } as const;
    case "research_note":
      return { type, content: ResearchNoteContent.parse(content) } as const;
    case "review":
      return { type, content: ReviewContent.parse(content) } as const;
  }
}

/** Searchable text representation (DAT-002). */
export function artifactText(type: ArtifactType, content: unknown): string {
  const p = parseArtifactContent(type, content);
  if (p.type === "launch_brief") return [p.content.title, ...p.content.sections.map((s) => `${s.heading}\n${s.body}`)].join("\n\n");
  if (p.type === "research_note") return [p.content.summary, ...p.content.findings.map((f) => f.claim)].join("\n");
  return [p.content.summary, ...p.content.findings.map((f) => `${f.issue} ${f.rationale}`)].join("\n");
}
