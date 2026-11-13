import "./setup";
import { describe, expect, it } from "vitest";
import pg from "pg";
import { migrate } from "../../scripts/migrate";
import { seedArchetypes } from "../../scripts/seed";
import { issueLoginLink, resolveMembership, userForSession, verifyLoginLink } from "../../src/server/auth/auth";
import { withGlobal, withWorkspace } from "../../src/server/db/pool";
import { listAgents } from "../../src/server/workspaces";
import { makeWorkspace, TEST_APP_URL, TEST_OWNER_URL } from "../helpers/db";

describe("migrations (001-T03)", () => {
  it("are reversible: down then up leaves a working schema", async () => {
    await migrate("down", TEST_OWNER_URL);
    await migrate("up", TEST_OWNER_URL);
    await seedArchetypes(TEST_OWNER_URL);
    const f = await makeWorkspace("mig");
    expect(f.workspaceId).toBeTruthy();
  });
  it("every tenant table has a non-null workspace_id and forced RLS (DAT-001, SEC-001)", async () => {
    const c = new pg.Client({ connectionString: TEST_OWNER_URL });
    await c.connect();
    const r = await c.query(`SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
        (SELECT a.attnotnull FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='workspace_id') AS ws_not_null
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relname NOT IN ('users','sessions','login_tokens','agent_archetypes','live_spend','schema_migrations')`);
    await c.end();
    expect(r.rows.length).toBeGreaterThanOrEqual(17);
    for (const row of r.rows) {
      expect(row, row.relname).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true, ws_not_null: true });
    }
  });
  it("the app role cannot bypass RLS", async () => {
    const c = new pg.Client({ connectionString: TEST_APP_URL });
    await c.connect();
    const r = await c.query("SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user");
    const rows = await c.query("SELECT count(*)::int AS n FROM missions"); // no app.workspace_id set
    await c.end();
    expect(r.rows[0].rolbypassrls).toBe(false);
    expect(rows.rows[0].n).toBe(0);
  });
});

describe("workspace creation (PROD-004)", () => {
  it("creates exactly one profile per First Seven archetype", async () => {
    const f = await makeWorkspace("seven");
    const agents = await withWorkspace({ workspaceId: f.workspaceId, userId: f.userId }, listAgents);
    expect(agents.map((a) => a.archetype).sort()).toEqual(["keeper", "maker", "navigator", "scribe", "seer", "sentinel", "weaver"]);
    expect(agents.every((a) => a.config.nameIsWorking)).toBe(true);
  });
});

describe("magic-link auth (PROD-003, SEC-004, SEC-006)", () => {
  it("issues a single-use, hashed token that creates a session", async () => {
    const link = await issueLoginLink("new-person@example.com");
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    const stored = await withGlobal(async (db) => (await db.query("SELECT token_hash FROM login_tokens WHERE email='new-person@example.com'")).rows[0]);
    expect(Buffer.from(stored.token_hash).toString("base64url")).not.toBe(link.token);
    expect(Buffer.from(link.token, "base64url").length).toBeGreaterThanOrEqual(32);
    const v = await verifyLoginLink(link.token);
    expect(v.ok).toBe(true);
    if (v.ok) expect((await userForSession(v.sessionToken))?.email).toBe("new-person@example.com");
    expect(await verifyLoginLink(link.token)).toEqual({ ok: false, reason: "used" });
    expect(await verifyLoginLink("nonsense")).toEqual({ ok: false, reason: "invalid" });
  });
  it("rejects expired links", async () => {
    const link = await issueLoginLink("late@example.com");
    if (!link.ok) throw new Error("rate limited");
    await withGlobal((db) => db.query("UPDATE login_tokens SET expires_at = now() - interval '1 minute' WHERE email='late@example.com'"));
    expect(await verifyLoginLink(link.token)).toEqual({ ok: false, reason: "expired" });
  });
  it("rate-limits to 5 links per 15 minutes", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await issueLoginLink("busy@example.com")).ok);
    expect(results).toEqual([true, true, true, true, true, false]);
  });
  it("resolves membership only for members (SEC-002)", async () => {
    const a = await makeWorkspace("mem-a");
    const b = await makeWorkspace("mem-b");
    expect(await resolveMembership(a.userId, a.slug)).toMatchObject({ workspaceId: a.workspaceId, role: "owner" });
    expect(await resolveMembership(b.userId, a.slug)).toBeNull();
  });
});
