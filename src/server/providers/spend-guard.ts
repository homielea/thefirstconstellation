import crypto from "node:crypto";
import { env } from "../env";
import { withGlobal } from "../db/pool";
import { ProviderError } from "./types";

/** SEC-005: live spend caps, checked before every live call and recorded after. */
const processSession = `${process.pid}-${crypto.randomBytes(4).toString("hex")}`;

export async function assertWithinCaps(provider: string) {
  const sessionCap = Number(env("LIVE_SESSION_CAP_USD", "5"));
  const totalCap = Number(env("LIVE_TOTAL_CAP_USD", "25"));
  const r = await withGlobal((db) =>
    db.query("SELECT coalesce(sum(amount_usd),0) AS total, coalesce(sum(amount_usd) FILTER (WHERE process_session=$1),0) AS session FROM live_spend", [processSession]));
  const { total, session } = r.rows[0] as { total: number; session: number };
  if (session >= sessionCap || total >= totalCap) {
    throw new ProviderError("spend_cap", `The live spend cap was reached (${provider}).`, false, { session, total, sessionCap, totalCap });
  }
}

export async function recordLiveSpend(provider: string, amountUsd: number, ref: string) {
  await withGlobal((db) => db.query("INSERT INTO live_spend (provider, process_session, amount_usd, ref) VALUES ($1,$2,$3,$4)", [provider, processSession, amountUsd, ref]));
}
