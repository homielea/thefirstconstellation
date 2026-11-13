/**
 * Evaluation suite for slice 001 (OBS-002). Runs each fixture as a real mission through the orchestrator.
 *   npm run eval              → fake providers (structural checks; deterministic)
 *   npm run eval -- --live    → Anthropic + Brave, capped by LIVE_*_CAP_USD; adds a rubric score
 * Uses the fc_test database (reset at start). Results: evals/results/<date>.<mode>.json
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { migrate } from "../scripts/migrate";
import { seedArchetypes, upsertUser } from "../scripts/seed";
import { closePool, withWorkspace } from "../src/server/db/pool";
import { loadEnv } from "../src/server/env";
import { createMission } from "../src/server/orchestrator/missions";
import { setFakeFaults, type Fault } from "../src/server/providers/faults";
import { BraveSearchProvider } from "../src/server/providers/brave";
import { createProviders, type Providers } from "../src/server/providers/registry";
import { createWorkspace } from "../src/server/workspaces";
import { drain } from "../src/worker/loop";

loadEnv();
const live = process.argv.includes("--live");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
process.env.DATABASE_OWNER_URL = process.env.EVAL_OWNER_URL ?? "postgres://fc_owner:fc_owner_dev@localhost:5432/fc_test";
process.env.DATABASE_URL = process.env.EVAL_APP_URL ?? "postgres://fc_app:fc_app_dev@localhost:5432/fc_test";
process.env.FAKE_DELAY_MS = "5";

interface Fixture {
  id: string; description: string; request: string; library: { title: string; body: string }[]; fakeOnly?: boolean; faults?: Fault[];
  search?: "disconnected"; budgetUsd?: number;
  expect: { status: string; minFindings?: number; minBriefCitations?: number; minGaps?: number; review?: boolean; allowedTools?: string[]; forbiddenText?: string[];
    blockedReason?: string; maxArtifacts?: number; maxModelCalls?: number; stepStatus?: Record<string, string> };
}

const Rubric = z.object({
  groundedness: z.number().describe("1-5: every factual claim is supported by a cited source"),
  usefulness: z.number().describe("1-5: a founder could act on this brief"),
  honesty: z.number().describe("1-5: gaps and uncertainty are stated rather than filled in"),
  notes: z.string(),
});

async function grade(providers: Providers, request: string, brief: string, findings: string) {
  const r = await providers.model.generateStructured({ policy: "reasoning", schemaName: "eval.rubric@1", schema: Rubric, maxTokens: 4000,
    system: "You grade launch briefs written by an AI team. Be strict and specific. Score each dimension 1-5.",
    user: `Request:\n${request}\n\nResearch findings (with source ids):\n${findings}\n\nBrief:\n${brief}` });
  return { ...r.output, costInputTokens: r.inputTokens, costOutputTokens: r.outputTokens };
}

async function main() {
  const fixtures = fs.readdirSync(path.join(import.meta.dirname, "fixtures")).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "fixtures", f), "utf8")) as Fixture)
    .filter((f) => (!only || f.id === only) && (!live || !f.fakeOnly));
  await migrate("reset");
  await seedArchetypes();
  const user = await upsertUser("eval@example.com", "Eval runner");
  const results = [];
  for (const fx of fixtures) {
    const slug = `eval-${fx.id}`.slice(0, 60);
    const workspaceId = await createWorkspace(user, slug, `Eval ${fx.id}`);
    const ctx = { workspaceId, userId: user };
    const roomId = await withWorkspace(ctx, async (db) => {
      const r = await db.query("INSERT INTO rooms (workspace_id, name, created_by) VALUES ($1,'Eval room',$2) RETURNING id", [workspaceId, user]);
      for (const d of fx.library) await db.query("INSERT INTO source_documents (workspace_id, room_id, title, kind, body, uploaded_by) VALUES ($1,$2,$3,'pasted',$4,$5)", [workspaceId, r.rows[0].id, d.title, d.body, user]);
      return r.rows[0].id as string;
    });
    let providers = createProviders(live ? "live" : "fake");
    if (fx.search === "disconnected") providers = { ...providers, search: new BraveSearchProvider("") };
    setFakeFaults(live ? null : fx.faults ?? null);
    const t0 = Date.now();
    const { missionId } = await createMission(ctx, roomId, fx.request, { budgetUsd: fx.budgetUsd });
    await drain(providers);
    const latencyMs = Date.now() - t0;
    const s = await withWorkspace(ctx, async (db) => ({
      mission: (await db.query("SELECT status, blocked_reason, spent_usd FROM missions WHERE id=$1", [missionId])).rows[0],
      steps: Object.fromEntries((await db.query("SELECT step_key, status FROM mission_steps WHERE mission_id=$1", [missionId])).rows.map((r) => [r.step_key, r.status])),
      artifacts: (await db.query("SELECT a.type, v.content, v.text_content, (SELECT count(*)::int FROM citations c WHERE c.artifact_version_id=v.id) AS cites FROM artifacts a JOIN artifact_versions v ON v.artifact_id=a.id WHERE a.mission_id=$1", [missionId])).rows,
      tools: (await db.query("SELECT DISTINCT tool FROM tool_executions WHERE mission_id=$1 AND outcome <> 'refused'", [missionId])).rows.map((r) => r.tool as string),
      modelCalls: (await db.query("SELECT count(*)::int AS n FROM model_executions WHERE mission_id=$1", [missionId])).rows[0].n as number,
    }));
    const e = fx.expect;
    const checks: Record<string, boolean> = { status: s.mission.status === e.status };
    const note = s.artifacts.find((a) => a.type === "research_note");
    const brief = s.artifacts.find((a) => a.type === "launch_brief");
    if (e.minFindings) checks.minFindings = (note?.content.findings.length ?? 0) >= e.minFindings;
    if (e.minGaps) checks.minGaps = (note?.content.gaps.length ?? 0) >= e.minGaps;
    if (e.minBriefCitations) checks.minBriefCitations = (brief?.cites ?? 0) >= e.minBriefCitations;
    if (e.review) checks.review = s.artifacts.some((a) => a.type === "review");
    if (e.allowedTools) checks.allowedTools = s.tools.every((t) => e.allowedTools!.includes(t));
    if (e.forbiddenText) checks.forbiddenText = s.artifacts.every((a) => e.forbiddenText!.every((w) => !a.text_content.toLowerCase().includes(w.toLowerCase())));
    if (e.blockedReason) checks.blockedReason = s.mission.blocked_reason === e.blockedReason;
    if (e.maxArtifacts !== undefined) checks.maxArtifacts = s.artifacts.length <= e.maxArtifacts;
    if (e.maxModelCalls !== undefined) checks.maxModelCalls = s.modelCalls <= e.maxModelCalls;
    if (e.stepStatus) checks.stepStatus = Object.entries(e.stepStatus).every(([k, v]) => s.steps[k] === v);
    let rubric = null;
    if (live && brief && note) {
      try {
        rubric = await grade(providers, fx.request, brief.text_content, note.content.findings.map((f: { claim: string; sourceIds: string[] }) => `- ${f.claim} [${f.sourceIds.join(",")}]`).join("\n"));
      } catch (err) { rubric = { error: String((err as Error).message) }; }
    }
    const pass = Object.values(checks).every(Boolean);
    results.push({ id: fx.id, pass, checks, status: s.mission.status, latencyMs, costUsd: Number(s.mission.spent_usd), modelCalls: s.modelCalls, rubric });
    console.log(`${pass ? "PASS" : "FAIL"} ${fx.id.padEnd(26)} ${s.mission.status.padEnd(10)} ${(latencyMs / 1000).toFixed(1)}s $${Number(s.mission.spent_usd).toFixed(4)}${pass ? "" : "  " + JSON.stringify(checks)}`);
  }
  setFakeFaults(null);
  const summary = { at: new Date().toISOString(), mode: live ? "live" : "fake", prompts: ["seer.v1", "scribe.v1", "sentinel.v1"],
    structuralPassRate: results.filter((r) => r.pass).length / Math.max(1, results.length), totalCostUsd: results.reduce((t, r) => t + r.costUsd, 0), results };
  fs.mkdirSync(path.join(import.meta.dirname, "results"), { recursive: true });
  const file = path.join(import.meta.dirname, "results", `${summary.at.slice(0, 10)}.${summary.mode}.json`);
  fs.writeFileSync(file, JSON.stringify(summary, null, 2));
  console.log(`structural pass rate ${(summary.structuralPassRate * 100).toFixed(0)}% · ${results.length} fixtures · $${summary.totalCostUsd.toFixed(4)} · ${path.relative(process.cwd(), file)}`);
  await closePool();
  if (summary.structuralPassRate < 1) process.exitCode = 1;
}
main().catch(async (e) => { console.error(e); await closePool(); process.exit(1); });
