import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { MODEL_POLICIES } from "@/agents/model-policies";
import { modelCostUsd } from "@/domain/pricing";
import { env } from "../env";
import { assertWithinCaps, recordLiveSpend } from "./spend-guard";
import { ProviderError, type ModelProvider, type StructuredRequest, type StructuredResult } from "./types";

export class AnthropicProvider implements ModelProvider {
  readonly name = "anthropic";
  readonly mode = "live" as const;
  private client: Anthropic;
  constructor(apiKey = env("ANTHROPIC_API_KEY", "")) {
    if (!apiKey) throw new ProviderError("connection_missing", "The model provider is not connected (ANTHROPIC_API_KEY is not set).", false);
    this.client = new Anthropic({ apiKey, maxRetries: 1, timeout: 240_000 });
  }

  async generateStructured<S extends z.ZodTypeAny>(req: StructuredRequest<S>): Promise<StructuredResult<z.infer<S>>> {
    const policy = MODEL_POLICIES[req.policy];
    const model = policy.live;
    await assertWithinCaps(this.name);
    const started = Date.now();
    try {
      const res = await this.client.messages.parse(
        {
          model,
          max_tokens: req.maxTokens,
          thinking: { type: "adaptive" },
          system: req.system,
          messages: [{ role: "user", content: req.user }],
          output_config: { effort: policy.effort, format: zodOutputFormat(req.schema) },
        },
        { signal: req.signal },
      );
      const inputTokens = res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
      const outputTokens = res.usage.output_tokens;
      await recordLiveSpend(this.name, modelCostUsd(model, inputTokens, outputTokens), `${req.schemaName}:${res.id}`);
      const base = { modelId: model, inputTokens, outputTokens, latencyMs: Date.now() - started, stopReason: res.stop_reason ?? null };
      if (res.stop_reason === "refusal") {
        throw new ProviderError("model_error", "The model declined this request.", false, { ...base, refusal: true });
      }
      if (res.stop_reason === "max_tokens" || res.parsed_output == null) {
        throw new ProviderError("invalid_output", "The model's answer did not match the required format.", true, base);
      }
      return { ...base, output: res.parsed_output as z.infer<S> };
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if (req.signal?.aborted) throw new ProviderError("internal", "The call was cancelled.", false);
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new ProviderError("timeout", "The model call took too long.", true, { latencyMs: Date.now() - started });
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
        throw new ProviderError("connection_missing", "The model provider rejected the credentials.", false, { status: e.status });
      }
      if (e instanceof Anthropic.BadRequestError) throw new ProviderError("model_error", "The model service rejected the request.", false, { status: e.status, requestId: e.requestID });
      if (e instanceof Anthropic.APIError) throw new ProviderError("model_error", "The model service returned an error.", true, { status: e.status, requestId: e.requestID });
      throw new ProviderError("model_error", "The model call failed.", true, { error: String(e) });
    }
  }
}
