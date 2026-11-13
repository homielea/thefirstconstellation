import fs from "node:fs";
import path from "node:path";

let loaded = false;
/** Loads .env.local for scripts and the worker (Next.js loads it for the app itself). */
export function loadEnv() {
  if (loaded) return;
  loaded = true;
  if (process.env.NEXT_RUNTIME) return; // Next.js loads .env.local itself
  for (const f of [".env.local", ".env"]) {
    const p = path.resolve(/*turbopackIgnore: true*/ process.cwd(), f);
    if (fs.existsSync(p)) process.loadEnvFile(p);
  }
}

export function env(name: string, fallback?: string): string {
  loadEnv();
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const providerMode = (): "fake" | "live" => (env("PROVIDER_MODE", "fake") === "live" ? "live" : "fake");
