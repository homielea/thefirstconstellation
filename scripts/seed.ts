import pg from "pg";
import { env, loadEnv } from "../src/server/env";
import { closePool, withGlobal, withWorkspace } from "../src/server/db/pool";
import { FIRST_SEVEN } from "../src/agents/first-seven";
import { addMember, createWorkspace } from "../src/server/workspaces";

loadEnv();

/** Seeds the global archetypes (idempotent). Called by every environment, including tests. */
export async function seedArchetypes(ownerUrl = env("DATABASE_OWNER_URL")) {
  // Global reference data: written with the owner role (the app role can only read it).
  const db = new pg.Client({ connectionString: ownerUrl });
  await db.connect();
  try {
    for (const a of FIRST_SEVEN) {
      await db.query("INSERT INTO agent_archetypes (key, version, definition) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET version=EXCLUDED.version, definition=EXCLUDED.definition", [a.key, a.version, a]);
    }
  } finally {
    await db.end();
  }
}

export async function upsertUser(email: string, displayName: string): Promise<string> {
  return withGlobal(async (db) => (await db.query(
    "INSERT INTO users (email, display_name) VALUES ($1,$2) ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id", [email, displayName])).rows[0].id);
}

/** Demo data: sample information only (no real people or companies). */
export async function seedDemo() {
  await seedArchetypes();
  const founder = await upsertUser("founder@example.com", "Mara (sample founder)");
  const collaborator = await upsertUser("collaborator@example.com", "Theo (sample collaborator)");
  const exists = await withGlobal(async (db) => (await db.query("SELECT 1 FROM resolve_membership($1,'northlight')", [founder])).rows[0]);
  if (exists) { console.log("Demo workspace already exists."); return; }
  const ws = await createWorkspace(founder, "northlight", "Northlight Studio");
  await addMember(ws, founder, collaborator, "member");
  await withWorkspace({ workspaceId: ws, userId: founder }, async (db) => {
    const room = await db.query("INSERT INTO rooms (workspace_id, name, created_by) VALUES ($1,'Spring launch',$2) RETURNING id", [ws, founder]);
    const roomId = room.rows[0].id;
    await db.query("INSERT INTO source_documents (workspace_id, room_id, title, kind, body, uploaded_by) VALUES ($1,$2,$3,'pasted',$4,$5)", [ws, roomId,
      "Tidewater positioning notes (sample)",
      "Tidewater is a calm planning app for small creative studios. It turns client briefs into a shared weekly plan. Early users are two-to-ten person design and video studios. The team wants to launch in March with a public beta. Differentiator: plans are built from the brief itself, not from a blank board. Pricing is not decided.", founder]);
    await db.query("INSERT INTO source_documents (workspace_id, room_id, title, kind, body, uploaded_by) VALUES ($1,$2,$3,'pasted',$4,$5)", [ws, roomId,
      "Beta interview summary (sample)",
      "Six studio leads interviewed. Five said weekly planning takes more than two hours. Four use a general project tool they find too heavy. Two asked for client-visible plans. None wanted another chat tool.", founder]);
  });
  console.log("Seeded workspace northlight with founder@example.com and collaborator@example.com.");
}

if (import.meta.filename === process.argv[1] || process.argv[1]?.endsWith("seed.ts")) {
  seedDemo().then(closePool).catch(async (e) => { console.error(e); await closePool(); process.exit(1); });
}
