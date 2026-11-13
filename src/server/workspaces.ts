import { FIRST_SEVEN, defaultProfileConfig } from "@/agents/first-seven";
import { AgentProfileConfig } from "@/contracts";
import { withGlobal, withWorkspace, type Db } from "./db/pool";

/** PROD-004: creating a workspace creates exactly one profile per First Seven archetype. */
export async function createWorkspace(userId: string, slug: string, name: string): Promise<string> {
  const workspaceId = await withGlobal(async (db) => (await db.query("SELECT create_workspace($1,$2,$3) AS id", [userId, slug, name])).rows[0].id as string);
  await withWorkspace({ workspaceId, userId }, async (db) => {
    for (const def of FIRST_SEVEN) {
      const cfg = AgentProfileConfig.parse(defaultProfileConfig(def));
      const p = await db.query("INSERT INTO agent_profiles (workspace_id, archetype) VALUES ($1,$2) RETURNING id", [workspaceId, def.key]);
      await db.query("INSERT INTO agent_profile_versions (workspace_id, agent_profile_id, version, config, created_by) VALUES ($1,$2,1,$3,$4)", [workspaceId, p.rows[0].id, cfg, userId]);
    }
  });
  return workspaceId;
}

export async function addMember(workspaceId: string, actingUserId: string, userId: string, role: "admin" | "member" | "guest") {
  await withWorkspace({ workspaceId, userId: actingUserId }, (db) =>
    db.query("INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [workspaceId, userId, role]));
}

export interface AgentRow { id: string; archetype: string; version: number; config: AgentProfileConfig }
export async function listAgents(db: Db): Promise<AgentRow[]> {
  const r = await db.query(
    `SELECT p.id, p.archetype, v.version, v.config FROM agent_profiles p
     JOIN agent_profile_versions v ON v.agent_profile_id = p.id AND v.version = p.current_version ORDER BY p.created_at`);
  return r.rows.map((x) => ({ id: x.id, archetype: x.archetype, version: x.version, config: AgentProfileConfig.parse(x.config) }));
}
