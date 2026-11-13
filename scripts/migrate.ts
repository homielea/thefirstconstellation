import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { env } from "../src/server/env";

const dir = path.resolve(import.meta.dirname, "../migrations");

export async function migrate(cmd: "up" | "down" | "reset", url = env("DATABASE_OWNER_URL")) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const all = fs.readdirSync(dir).filter((f) => f.endsWith(".up.sql")).map((f) => f.replace(".up.sql", "")).sort();
    const applied = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name as string));
    const run = async (name: string, kind: "up" | "down") => {
      const sql = fs.readFileSync(path.join(dir, `${name}.${kind}.sql`), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        if (kind === "up") await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        else await client.query("DELETE FROM schema_migrations WHERE name = $1", [name]);
        await client.query("COMMIT");
        console.log(`${kind} ${name}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    };
    if (cmd === "down" || cmd === "reset") {
      const toRevert = all.filter((n) => applied.has(n)).reverse();
      for (const n of cmd === "down" ? toRevert.slice(0, 1) : toRevert) { await run(n, "down"); applied.delete(n); }
    }
    if (cmd === "up" || cmd === "reset") for (const n of all) if (!applied.has(n)) await run(n, "up");
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  const cmd = (process.argv[2] ?? "up") as "up" | "down" | "reset";
  migrate(cmd).catch((e) => { console.error(e.message); process.exit(1); });
}
