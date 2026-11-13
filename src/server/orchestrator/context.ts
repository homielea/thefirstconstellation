import type { z } from "zod";
import type { ModelPolicy } from "@/agents/model-policies";
import { PROMPTS, styleLine } from "@/agents/prompts";
import { type AgentProfileConfig, type ErrorCategory, outputSchemas, type OutputSchemaName, type OutputOf } from "@/contracts";
import { modelCostUsd, roundUsd } from "@/domain/pricing";
import { withWorkspace, type Db } from "../db/pool";
import type { Providers } from "../providers/registry";
import { ProviderError } from "../providers/types";
import type { StepClaim } from "./scheduler";
import { appendEvent } from "./events";

export class StepError extends Error {
  constructor(public category: ErrorCategory, message: string, public retryable: boolean, public diagnostic: Record<string, unknown> = {}) {
    super(message);
  }
}

export interface StepRow {
  id: string; mission_id: string; step_key: string; position: number; title: string; archetype: string;
  agent_profile_id: string; agent_profile_version: number; prompt_version: string; depends_on: string[];
  allowed_tools: string[]; attempt: number; max_attempts: number; status: string;
}
export interface MissionRow { id: string; room_id: string; objective: string; status: string; budget_usd: number; spent_usd: number; provider_mode: "fake" | "live" }
export interface AgentRef { id: string; version: number; config: AgentProfileConfig }

export interface CitationInput { ref: string; sourceKind: "web" | "library"; url: string | null; sourceDocumentId: string | null; title: string; excerpt: string; retrievedByStepId: string }
export interface NewArtifact { type: "launch_brief" | "research_note" | "review"; title: string; content: unknown; citations: CitationInput[]; reviewsArtifactId?: string | null }
export interface StepResult { output: Record<string, unknown>; artifacts: NewArtifact[]; message: string; data?: Record<string, unknown> }

export class StepContext {
  private callIndex = 0;
  constructor(
    public claim: StepClaim,
    public workerId: string,
    public step: StepRow,
    public mission: MissionRow,
    public agent: AgentRef,
    public providers: Providers,
    public signal: AbortSignal,
  ) {}

  get agentName() { return `${this.agent.config.properName} (${this.step.archetype[0]!.toUpperCase()}${this.step.archetype.slice(1)})`; }
  get scope() { return { workspaceId: this.claim.workspaceId, userId: null }; }
  nextCallIndex() { return this.callIndex++; }

  read<T>(fn: (db: Db) => Promise<T>): Promise<T> { return withWorkspace(this.scope, fn); }

  systemPrompt(): string {
    const id = this.step.prompt_version.split("#")[0]!;
    const p = PROMPTS[id];
    if (!p) throw new StepError("internal", `Prompt ${id} is not registered`, false);
    return `${p.system}\n\nYour name in this workspace is ${this.agent.config.properName}. ${styleLine(this.agent.config.communicationStyle)}`;
  }

  async event(type: "step.tool", message: string, data: Record<string, unknown>) {
    const idx = this.callIndex;
    await this.read((db) => appendEvent(db, { workspaceId: this.claim.workspaceId, missionId: this.mission.id, type, stepId: this.step.id, stepKey: this.step.step_key,
      agentName: this.agent.config.properName, message, data, dedupeKey: `step.tool:${this.step.id}:${this.step.attempt}:${idx}` }));
  }

  /** REL-005 budget check, structured call, OBS-001 recording (also on failure). */
  async callModel<N extends OutputSchemaName>(schemaName: N, policy: ModelPolicy, user: string, context: unknown, maxTokens = 8000): Promise<OutputOf<N>> {
    const m = await this.read(async (db) => (await db.query("SELECT spent_usd, budget_usd FROM missions WHERE id=$1", [this.mission.id])).rows[0]);
    if (m.spent_usd >= m.budget_usd) throw new StepError("budget_reached", `The mission budget of $${Number(m.budget_usd).toFixed(2)} was reached.`, false, { spent: m.spent_usd });
    const callIndex = this.nextCallIndex();
    const schema = outputSchemas[schemaName] as z.ZodTypeAny;
    try {
      const r = await this.providers.model.generateStructured({ policy, schemaName, schema, system: this.systemPrompt(), user, context, maxTokens, signal: this.signal });
      await this.recordModel(callIndex, policy, schemaName, r.modelId, r.inputTokens, r.outputTokens, r.latencyMs, "ok", null, r.stopReason);
      return r.output as OutputOf<N>;
    } catch (e) {
      const pe = e instanceof ProviderError ? e : new ProviderError("internal", "The model call failed unexpectedly.", true, { error: String(e) });
      const d = pe.diagnostic as { modelId?: string; inputTokens?: number; outputTokens?: number; latencyMs?: number; stopReason?: string };
      await this.recordModel(callIndex, policy, schemaName, d.modelId ?? "unknown", d.inputTokens ?? 0, d.outputTokens ?? 0, d.latencyMs ?? 0, "error", pe.category, d.stopReason ?? null);
      throw new StepError(pe.category, pe.message, pe.retryable, pe.diagnostic);
    }
  }

  private async recordModel(callIndex: number, policy: string, schemaName: string, modelId: string, inTok: number, outTok: number, latencyMs: number, outcome: "ok" | "error", category: string | null, stopReason: string | null) {
    let cost = 0;
    try { cost = modelId === "unknown" ? 0 : modelCostUsd(modelId, inTok, outTok); } catch { cost = 0; }
    await this.read(async (db) => {
      const r = await db.query(
        `INSERT INTO model_executions (workspace_id, mission_id, step_id, attempt, call_index, provider, provider_mode, policy, model_id, prompt_version, schema_name,
           input_tokens, output_tokens, cost_usd, latency_ms, outcome, error_category, stop_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (step_id, attempt, call_index) DO NOTHING RETURNING id`,
        [this.claim.workspaceId, this.mission.id, this.step.id, this.step.attempt, callIndex, this.providers.model.name, this.providers.mode, policy, modelId,
         this.step.prompt_version, schemaName, inTok, outTok, cost, latencyMs, outcome, category, stopReason]);
      if (r.rows[0]) await this.ledger(db, "model", r.rows[0].id, cost);
    });
  }

  async ledger(db: Db, kind: "model" | "tool", executionId: string, cost: number) {
    await db.query("INSERT INTO usage_ledger (workspace_id, mission_id, step_id, kind, execution_id, cost_usd) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (execution_id) DO NOTHING",
      [this.claim.workspaceId, this.mission.id, this.step.id, kind, executionId, cost]);
    if (cost > 0) await db.query("UPDATE missions SET spent_usd = spent_usd + $2 WHERE id=$1", [this.mission.id, roundUsd(cost)]);
  }

  async dependencyOutput(stepKey: string): Promise<Record<string, unknown>> {
    return this.read(async (db) => {
      const r = await db.query("SELECT id, output, status FROM mission_steps WHERE mission_id=$1 AND step_key=$2", [this.mission.id, stepKey]);
      if (r.rows[0]?.status !== "completed") throw new StepError("internal", `Dependency ${stepKey} is not complete`, false);
      return { ...r.rows[0].output, __stepId: r.rows[0].id };
    });
  }
}
