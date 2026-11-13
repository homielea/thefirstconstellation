import fs from "node:fs";
import path from "node:path";

/** Fault injection for fakes (tests and demos only). FAKE_FAULTS env holds a JSON array. */
export interface Fault { schema: string; kind: "error" | "invalid" | "hang" | "crash"; times: number; ms?: number }

let programmatic: Fault[] | null = null;
const used = new Map<number, number>();

export function setFakeFaults(f: Fault[] | null) {
  programmatic = f;
  used.clear();
}

function faults(): Fault[] {
  if (programmatic) return programmatic;
  const raw = process.env.FAKE_FAULTS;
  if (!raw) return [];
  try { return JSON.parse(raw) as Fault[]; } catch { return []; }
}

/** Returns the fault to apply for this call, if any. Crash faults fire once per marker directory. */
export function takeFault(schema: string): Fault | null {
  const list = faults();
  for (let i = 0; i < list.length; i++) {
    const f = list[i]!;
    if (f.schema !== schema) continue;
    if (f.kind === "crash") {
      const dir = process.env.FAULT_MARKER_DIR;
      if (!dir) continue;
      const marker = path.join(dir, `crash-${schema}`);
      if (fs.existsSync(marker)) continue;
      fs.writeFileSync(marker, String(Date.now()));
      return f;
    }
    const n = used.get(i) ?? 0;
    if (n < f.times) { used.set(i, n + 1); return f; }
  }
  return null;
}
