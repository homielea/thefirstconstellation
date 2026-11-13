import crypto from "node:crypto";
import { migrate } from "../../scripts/migrate";
import { seedArchetypes, upsertUser } from "../../scripts/seed";
import { withWorkspace } from "../../src/server/db/pool";
import { addMember, createWorkspace } from "../../src/server/workspaces";

export const TEST_OWNER_URL = "postgres://fc_owner:fc_owner_dev@localhost:5432/fc_test";
export const TEST_APP_URL = "postgres://fc_app:fc_app_dev@localhost:5432/fc_test";

export function useTestEnv() {
  process.env.DATABASE_OWNER_URL = TEST_OWNER_URL;
  process.env.DATABASE_URL = TEST_APP_URL;
  process.env.PROVIDER_MODE = "fake";
  process.env.FAKE_DELAY_MS = "5";
}

export async function resetDb() {
  useTestEnv();
  await migrate("reset", TEST_OWNER_URL);
  await seedArchetypes(TEST_OWNER_URL);
}

export interface Fixture { workspaceId: string; slug: string; userId: string; otherUserId: string; roomId: string }

/** A workspace with an owner, a second member, a room and one library item. */
export async function makeWorkspace(label = crypto.randomBytes(3).toString("hex")): Promise<Fixture> {
  const slug = `ws-${label}`;
  const userId = await upsertUser(`owner-${label}@example.com`, `Owner ${label}`);
  const otherUserId = await upsertUser(`member-${label}@example.com`, `Member ${label}`);
  const workspaceId = await createWorkspace(userId, slug, `Workspace ${label}`);
  await addMember(workspaceId, userId, otherUserId, "member");
  const roomId = await withWorkspace({ workspaceId, userId }, async (db) => {
    const r = await db.query("INSERT INTO rooms (workspace_id, name, created_by) VALUES ($1,'Launch room',$2) RETURNING id", [workspaceId, userId]);
    await db.query("INSERT INTO source_documents (workspace_id, room_id, title, kind, body, uploaded_by) VALUES ($1,$2,'Positioning notes','pasted','Tidewater plans studio weeks from client briefs. Launch in March.',$3)", [workspaceId, r.rows[0].id, userId]);
    return r.rows[0].id as string;
  });
  return { workspaceId, slug, userId, otherUserId, roomId };
}
