import { z } from "zod";

/** Schemas sent to the model as structured-output formats. Keep them within the JSON Schema
 * subset supported by structured outputs: further integrity rules live in src/domain/integrity.ts. */
export const SeerQueries = z.object({
  queries: z.array(z.string()).describe("One to three web search queries, most useful first."),
});
export type SeerQueries = z.infer<typeof SeerQueries>;

export const SeerFindings = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({
      claim: z.string().describe("One factual finding, stated plainly."),
      sourceIds: z.array(z.string()).describe("Ids of the sources that support this claim, e.g. W1 or L2."),
      confidence: z.enum(["low", "medium", "high"]),
    }),
  ),
  gaps: z.array(z.string()).describe("Questions the sources could not answer."),
});
export type SeerFindings = z.infer<typeof SeerFindings>;

export const BRIEF_SECTION_KEYS = ["overview", "audience", "positioning", "key_messages", "channels", "risks", "next_steps"] as const;
export const BriefSectionKey = z.enum(BRIEF_SECTION_KEYS);

export const ScribeBrief = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      key: BriefSectionKey,
      heading: z.string(),
      body: z.string().describe("Plain text. Cite sources inline with markers like [W1] or [L2]."),
    }),
  ),
});
export type ScribeBrief = z.infer<typeof ScribeBrief>;

export const SentinelReview = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({
      severity: z.enum(["info", "caution", "problem"]),
      sectionKey: BriefSectionKey,
      issue: z.string(),
      rationale: z.string(),
    }),
  ),
});
export type SentinelReview = z.infer<typeof SentinelReview>;

export const outputSchemas = {
  "seer.queries@1": SeerQueries,
  "seer.findings@1": SeerFindings,
  "scribe.brief@1": ScribeBrief,
  "sentinel.review@1": SentinelReview,
} as const;
export type OutputSchemaName = keyof typeof outputSchemas;
export type OutputOf<N extends OutputSchemaName> = z.infer<(typeof outputSchemas)[N]>;
