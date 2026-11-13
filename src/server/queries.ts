import { AgentProfileConfig, BriefContent, ResearchNoteContent, ReviewContent, type ArtifactType } from "@/contracts";
import { withWorkspace, type Db, type WorkspaceCtx } from "./db/pool";
import { appendEvent } from "./orchestrator/events";
import { Conflict, NotFound } from "./orchestrator/missions";
import { citedMarkers } from "@/domain/integrity";
import { artifactText } from "@/contracts";

const agentNames = async (db: Db) => {
  const r = await db.query("SELECT p.id, v.config FROM agent_profiles p JOIN agent_profile_versions v ON v.agent_profile_id=p.id AND v.version=p.current_version");
  return new Map(r.rows.map((x) => [x.id as string, AgentProfileConfig.parse(x.config)]));
};

export async function getRoomView(ctx: WorkspaceCtx, roomId: string) {
  return withWorkspace(ctx, async (db) => {
    const room = (await db.query("SELECT id, name FROM rooms WHERE id=$1", [roomId])).rows[0];
    if (!room) return null;
    const missions = (await db.query("SELECT id, objective, status, created_at FROM missions WHERE room_id=$1 ORDER BY created_at DESC", [roomId])).rows;
    const library = (await db.query("SELECT id, title FROM source_documents WHERE room_id=$1 OR room_id IS NULL ORDER BY created_at", [roomId])).rows;
    return { room, missions, library };
  });
}

export async function listRooms(ctx: WorkspaceCtx) {
  return withWorkspace(ctx, async (db) => (await db.query("SELECT id, name FROM rooms ORDER BY created_at")).rows as { id: string; name: string }[]);
}

export async function getMissionView(ctx: WorkspaceCtx, missionId: string) {
  return withWorkspace(ctx, async (db) => {
    const mission = (await db.query("SELECT * FROM missions WHERE id=$1", [missionId])).rows[0];
    if (!mission) return null;
    const names = await agentNames(db);
    const steps = (await db.query("SELECT id, step_key, title, archetype, agent_profile_id, allowed_tools, expected_output, status, attempt, max_attempts, last_error, prompt_version FROM mission_steps WHERE mission_id=$1 ORDER BY position", [missionId])).rows
      .map((s) => ({ ...s, agentName: names.get(s.agent_profile_id)?.properName ?? s.archetype }));
    const events = (await db.query("SELECT seq, type, created_at, step_key, agent_name, message, data FROM run_events WHERE mission_id=$1 ORDER BY seq", [missionId])).rows
      .map((e) => ({ seq: e.seq as number, type: e.type as string, at: (e.created_at as Date).toISOString(), stepKey: e.step_key, agentName: e.agent_name, message: e.message as string, data: e.data }));
    const models = (await db.query("SELECT step_id, attempt, 'model' AS kind, model_id AS name, latency_ms, input_tokens, output_tokens, cost_usd, outcome, error_category, created_at, schema_name AS detail FROM model_executions WHERE mission_id=$1", [missionId])).rows;
    const tools = (await db.query("SELECT step_id, attempt, 'tool' AS kind, tool AS name, latency_ms, 0 AS input_tokens, 0 AS output_tokens, cost_usd, outcome, error_category, created_at, NULL AS detail FROM tool_executions WHERE mission_id=$1", [missionId])).rows;
    const stepById = new Map(steps.map((s) => [s.id, s]));
    const history = [...models, ...tools].sort((a, b) => +a.created_at - +b.created_at).map((h) => ({
      ...h, stepTitle: stepById.get(h.step_id)?.title ?? "", agentName: stepById.get(h.step_id)?.agentName ?? "",
    }));
    const totals = history.reduce((t, h) => ({ cost: t.cost + Number(h.cost_usd), input: t.input + Number(h.input_tokens), output: t.output + Number(h.output_tokens), latency: t.latency + Number(h.latency_ms) }), { cost: 0, input: 0, output: 0, latency: 0 });
    const artifacts = (await db.query("SELECT id, type, title, current_version FROM artifacts WHERE mission_id=$1 ORDER BY created_at", [missionId])).rows;
    return { mission, steps, events, history, totals, artifacts };
  });
}

export async function getArtifactView(ctx: WorkspaceCtx, artifactId: string, version?: number) {
  return withWorkspace(ctx, async (db) => {
    const a = (await db.query("SELECT * FROM artifacts WHERE id=$1", [artifactId])).rows[0];
    if (!a) return null;
    const names = await agentNames(db);
    const versions = (await db.query(
      `SELECT v.id, v.version, v.author_kind, v.author_agent_profile_id, v.created_at, u.display_name, s.title AS step_title
       FROM artifact_versions v LEFT JOIN users u ON u.id=v.author_user_id LEFT JOIN mission_steps s ON s.id=v.produced_by_step_id
       WHERE v.artifact_id=$1 ORDER BY v.version DESC`, [artifactId])).rows.map((v) => ({
        id: v.id as string, version: v.version as number, createdAt: (v.created_at as Date).toISOString(),
        author: v.author_kind === "user" ? (v.display_name as string) : `${names.get(v.author_agent_profile_id)?.properName ?? "Agent"} (${v.step_title ?? "mission step"})`,
      }));
    const shown = version ?? a.current_version;
    const ver = (await db.query("SELECT id, content FROM artifact_versions WHERE artifact_id=$1 AND version=$2", [artifactId, shown])).rows[0];
    if (!ver) return null;
    const citations = (await db.query("SELECT ref, source_kind, url, source_document_id, title, excerpt FROM citations WHERE artifact_version_id=$1 ORDER BY source_kind DESC, ref", [ver.id])).rows;
    let review = null;
    if (a.type === "launch_brief") {
      const r = (await db.query(
        `SELECT v.content, a.id FROM artifacts a JOIN artifact_versions v ON v.artifact_id=a.id AND v.version=a.current_version
         WHERE a.reviews_artifact_id=$1 ORDER BY a.created_at DESC LIMIT 1`, [artifactId])).rows[0];
      if (r) review = { id: r.id as string, content: ReviewContent.parse(r.content) };
    }
    const content = a.type === "launch_brief" ? BriefContent.parse(ver.content) : a.type === "research_note" ? ResearchNoteContent.parse(ver.content) : ReviewContent.parse(ver.content);
    return { artifact: a as { id: string; type: ArtifactType; title: string; current_version: number; mission_id: string | null }, shownVersion: shown as number, content, versions, citations, review };
  });
}

/** EXP-005, DAT-002: a person's edit creates a new immutable version. Citations carry over for markers that remain. */
export async function saveBriefVersion(ctx: WorkspaceCtx & { userId: string }, artifactId: string, baseVersion: number, content: BriefContent) {
  return withWorkspace(ctx, async (db) => {
    const a = (await db.query("SELECT id, type, current_version, mission_id FROM artifacts WHERE id=$1 FOR UPDATE", [artifactId])).rows[0];
    if (!a || a.type !== "launch_brief") throw new NotFound("artifact");
    if (a.current_version !== baseVersion) throw new Conflict(`This brief changed since you opened it (now version ${a.current_version}). Reload to see the latest.`);
    const prev = (await db.query("SELECT id FROM artifact_versions WHERE artifact_id=$1 AND version=$2", [artifactId, baseVersion])).rows[0];
    const next = baseVersion + 1;
    const v = await db.query(
      "INSERT INTO artifact_versions (workspace_id, artifact_id, version, content, text_content, author_kind, author_user_id) VALUES ($1,$2,$3,$4,$5,'user',$6) RETURNING id",
      [ctx.workspaceId, artifactId, next, content, artifactText("launch_brief", content), ctx.userId]);
    const markers = new Set(content.sections.flatMap((s) => citedMarkers(s.body)));
    await db.query(
      `INSERT INTO citations (workspace_id, artifact_version_id, ref, source_kind, url, source_document_id, title, excerpt, retrieved_by_step_id)
       SELECT workspace_id, $2, ref, source_kind, url, source_document_id, title, excerpt, retrieved_by_step_id FROM citations WHERE artifact_version_id=$1 AND ref = ANY($3)`,
      [prev.id, v.rows[0].id, [...markers]]);
    await db.query("UPDATE artifacts SET current_version=$2, title=$3, updated_at=now() WHERE id=$1", [artifactId, next, content.title]);
    return { version: next };
  });
}

export async function getSourceDocument(ctx: WorkspaceCtx, id: string) {
  return withWorkspace(ctx, async (db) => (await db.query("SELECT id, title, body, created_at FROM source_documents WHERE id=$1", [id])).rows[0] ?? null);
}

export { appendEvent };
