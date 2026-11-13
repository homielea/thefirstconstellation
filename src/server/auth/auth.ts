import { withGlobal } from "../db/pool";
import { hashToken, newToken } from "./tokens";

export const SESSION_COOKIE = "fc_session";
const LINK_TTL_MIN = 15;
const SESSION_TTL_DAYS = 14;
const RATE_LIMIT = { count: 5, windowMin: 15 }; // SEC-006

export type LinkResult = { ok: true; token: string } | { ok: false; reason: "rate_limited" };

export async function issueLoginLink(email: string): Promise<LinkResult> {
  return withGlobal(async (db) => {
    const recent = await db.query("SELECT count(*)::int AS n FROM login_tokens WHERE email=$1 AND created_at > now() - make_interval(mins => $2)", [email, RATE_LIMIT.windowMin]);
    if (recent.rows[0].n >= RATE_LIMIT.count) return { ok: false, reason: "rate_limited" } as const;
    const token = newToken();
    await db.query("INSERT INTO login_tokens (email, token_hash, expires_at) VALUES ($1,$2, now() + make_interval(mins => $3))", [email, hashToken(token), LINK_TTL_MIN]);
    return { ok: true, token } as const;
  });
}

export type VerifyResult = { ok: true; sessionToken: string; userId: string } | { ok: false; reason: "invalid" | "expired" | "used" };

/** Single-use: the token is consumed atomically. Unknown emails get a user record on first sign-in. */
export async function verifyLoginLink(token: string): Promise<VerifyResult> {
  return withGlobal(async (db) => {
    const r = await db.query("SELECT id, email, expires_at < now() AS expired, used_at FROM login_tokens WHERE token_hash=$1 FOR UPDATE", [hashToken(token)]);
    const row = r.rows[0];
    if (!row) return { ok: false, reason: "invalid" } as const;
    if (row.used_at) return { ok: false, reason: "used" } as const;
    if (row.expired) return { ok: false, reason: "expired" } as const;
    await db.query("UPDATE login_tokens SET used_at = now() WHERE id=$1", [row.id]);
    const u = await db.query(
      "INSERT INTO users (email, display_name) VALUES ($1, split_part($1,'@',1)) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id",
      [row.email]);
    const sessionToken = newToken();
    await db.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2, now() + make_interval(days => $3))", [u.rows[0].id, hashToken(sessionToken), SESSION_TTL_DAYS]);
    return { ok: true, sessionToken, userId: u.rows[0].id } as const;
  });
}

export interface SessionUser { id: string; email: string; displayName: string }
export async function userForSession(sessionToken: string | undefined): Promise<SessionUser | null> {
  if (!sessionToken) return null;
  return withGlobal(async (db) => {
    const r = await db.query("SELECT u.id, u.email, u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()", [hashToken(sessionToken)]);
    const x = r.rows[0];
    return x ? { id: x.id, email: x.email, displayName: x.display_name } : null;
  });
}

export async function endSession(sessionToken: string) {
  await withGlobal((db) => db.query("DELETE FROM sessions WHERE token_hash=$1", [hashToken(sessionToken)]));
}

export interface Membership { workspaceId: string; role: string; workspaceName: string }
export async function resolveMembership(userId: string, slug: string): Promise<Membership | null> {
  return withGlobal(async (db) => {
    const r = await db.query("SELECT * FROM resolve_membership($1,$2)", [userId, slug]);
    const x = r.rows[0];
    return x ? { workspaceId: x.workspace_id, role: x.role, workspaceName: x.workspace_name } : null;
  });
}
export async function listMyWorkspaces(userId: string) {
  return withGlobal(async (db) => (await db.query("SELECT * FROM list_my_workspaces($1)", [userId])).rows as { slug: string; name: string; role: string }[]);
}
