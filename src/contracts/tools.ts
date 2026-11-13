import { z } from "zod";

export const WebSearchInput = z.object({ query: z.string().min(1).max(300), count: z.number().int().min(1).max(10) });
export const WebSearchOutput = z.object({
  results: z.array(z.object({ title: z.string(), url: z.string().url(), snippet: z.string() })),
});
export type WebSearchInput = z.infer<typeof WebSearchInput>;
export type WebSearchOutput = z.infer<typeof WebSearchOutput>;

export const LibraryReadInput = z.object({ limit: z.number().int().min(1).max(20) });
export const LibraryReadOutput = z.object({
  items: z.array(z.object({ id: z.string().uuid(), title: z.string(), text: z.string() })),
});

export type RiskClass = "read" | "write_internal" | "external";

export interface ToolDefinition<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  version: "tool@1";
  description: string;
  input: I;
  output: O;
  permission: string;
  riskClass: RiskClass;
  retry: "safe" | "never";
  auditFields: string[];
}
