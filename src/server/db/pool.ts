import pg from "pg";
import { env } from "../env";

// numeric → JS number (amounts are small; values are rounded to 1e-6 in code).
pg.types.setTypeParser(1700, (v) => parseFloat(v));

const g = globalThis as unknown as { __fcPool?: pg.Pool };
export function pool(): pg.Pool {
  if (!g.__fcPool) g.__fcPool = new pg.Pool({ connectionString: env("DATABASE_URL"), max: 10 });
  return g.__fcPool;
}
export async function closePool() {
  await g.__fcPool?.end();
  g.__fcPool = undefined;
}

export type Db = pg.PoolClient;
export interface WorkspaceCtx { workspaceId: string; userId: string | null; }

/** The only way tenant data is read or written (SEC-001): one transaction, RLS scoped to the workspace. */
export async function withWorkspace<T>(ctx: WorkspaceCtx, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.workspace_id', $1, true), set_config('app.user_id', $2, true)", [ctx.workspaceId, ctx.userId ?? ""]);
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Global (non-tenant) queries: users, sessions, login tokens, security-definer entry points. */
export async function withGlobal<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
