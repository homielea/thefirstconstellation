import type { z } from "zod";
import type { ModelPolicy } from "@/agents/model-policies";
import type { ErrorCategory } from "@/contracts";
import type { WebSearchOutput } from "@/contracts";

export class ProviderError extends Error {
  constructor(public category: ErrorCategory, message: string, public retryable: boolean, public diagnostic: Record<string, unknown> = {}) {
    super(message);
  }
}

export interface StructuredRequest<S extends z.ZodTypeAny> {
  policy: ModelPolicy;
  schemaName: string;
  schema: S;
  system: string;
  user: string;
  maxTokens: number;
  signal?: AbortSignal;
  /** Typed inputs the prompt was built from. Only fakes read this; live providers see the prompt text. */
  context?: unknown;
}

export interface StructuredResult<T> {
  output: T;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  stopReason: string | null;
}

/** On failure the provider throws ProviderError carrying any usage already incurred. */
export interface ModelProvider {
  readonly name: string;
  readonly mode: "fake" | "live";
  generateStructured<S extends z.ZodTypeAny>(req: StructuredRequest<S>): Promise<StructuredResult<z.infer<S>>>;
}

export interface SearchProvider {
  readonly name: string;
  readonly mode: "fake" | "live";
  search(query: string, count: number, signal?: AbortSignal): Promise<WebSearchOutput>;
}
