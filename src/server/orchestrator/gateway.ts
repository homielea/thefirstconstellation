import { LibraryReadInput, LibraryReadOutput, WebSearchInput, WebSearchOutput, type ToolDefinition } from "@/contracts";
import { toolCostUsd } from "@/domain/pricing";
import { redact } from "@/domain/redact";
import { ProviderError } from "../providers/types";
import { StepError, type StepContext } from "./context";

export const TOOLS: Record<string, ToolDefinition> = {
  "library.read": { name: "library.read", version: "tool@1", description: "Read the room's library items", input: LibraryReadInput, output: LibraryReadOutput,
    permission: "library:read", riskClass: "read", retry: "safe", auditFields: ["limit"] },
  "web.search": { name: "web.search", version: "tool@1", description: "Search the public web", input: WebSearchInput, output: WebSearchOutput,
    permission: "web:search", riskClass: "read", retry: "safe", auditFields: ["query", "count"] },
  "artifact.write": { name: "artifact.write", version: "tool@1", description: "Create an artifact version for this step", input: LibraryReadInput, output: LibraryReadOutput,
    permission: "artifact:write", riskClass: "write_internal", retry: "never", auditFields: [] },
};

/** AGT-003: a tool runs only if it is in the step's allowed tools AND the agent's grants. Refusals are recorded. */
export function isAllowed(ctx: StepContext, tool: string) {
  return ctx.step.allowed_tools.includes(tool) && ctx.agent.config.toolGrants.includes(tool) && tool in TOOLS;
}

export async function invokeTool(ctx: StepContext, tool: string, rawInput: unknown): Promise<unknown> {
  const callIndex = ctx.nextCallIndex();
  const started = Date.now();
  const record = async (outcome: "ok" | "error" | "refused", summary: unknown, category: string | null, cost = 0) =>
    ctx.read(async (db) => {
      const r = await db.query(
        `INSERT INTO tool_executions (workspace_id, mission_id, step_id, attempt, call_index, tool, input, output_summary, outcome, error_category, latency_ms, cost_usd)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (step_id, attempt, call_index) DO NOTHING RETURNING id`,
        [ctx.claim.workspaceId, ctx.mission.id, ctx.step.id, ctx.step.attempt, callIndex, tool, redact(rawInput ?? {}), redact(summary ?? null), outcome, category, Date.now() - started, cost]);
      if (r.rows[0]) await ctx.ledger(db, "tool", r.rows[0].id, cost);
    });

  if (!isAllowed(ctx, tool)) {
    await record("refused", { reason: "not allowed for this step" }, "tool_refused");
    throw new StepError("tool_refused", `The tool ${tool} is not allowed for this step.`, false);
  }
  const def = TOOLS[tool]!;
  const input = def.input.safeParse(rawInput);
  if (!input.success) {
    await record("error", { reason: "invalid input" }, "invalid_output");
    throw new StepError("invalid_output", `Invalid input for ${tool}.`, true);
  }
  try {
    let output: unknown;
    if (tool === "web.search") {
      const i = input.data as { query: string; count: number };
      output = await ctx.providers.search.search(i.query, i.count, ctx.signal);
    } else if (tool === "library.read") {
      const i = input.data as { limit: number };
      output = await ctx.read(async (db) => ({
        items: (await db.query("SELECT id, title, body AS text FROM source_documents WHERE room_id=$1 OR room_id IS NULL ORDER BY created_at LIMIT $2", [ctx.mission.room_id, i.limit])).rows,
      }));
    } else {
      throw new StepError("tool_refused", `The tool ${tool} cannot be invoked directly.`, false);
    }
    const parsed = def.output.parse(output);
    const cost = ctx.providers.search.mode === "live" && tool === "web.search" ? toolCostUsd(tool) : 0;
    const summary = tool === "web.search"
      ? { results: (parsed as WebSearchOutput).results.map((r) => ({ title: r.title, url: r.url })) }
      : { items: (parsed as { items: { id: string; title: string }[] }).items.map((x) => ({ id: x.id, title: x.title })) };
    await record("ok", summary, null, cost);
    return parsed;
  } catch (e) {
    const pe = e instanceof StepError ? e : e instanceof ProviderError ? new StepError(e.category, e.message, e.retryable, e.diagnostic) : new StepError("internal", "The tool failed unexpectedly.", true, { error: String(e) });
    await record("error", { message: pe.message }, pe.category);
    throw pe;
  }
}
