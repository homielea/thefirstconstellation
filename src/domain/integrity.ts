import type { SeerFindings, ScribeBrief, SentinelReview } from "@/contracts";
import { BRIEF_SECTION_KEYS } from "@/contracts";

export type IntegrityResult = { ok: true } | { ok: false, errors: string[] };
const ok = (errors: string[]): IntegrityResult => (errors.length ? { ok: false, errors } : { ok: true });

/** AGT-006: findings cite only sources the step received; every finding has a source. */
export function checkFindings(f: SeerFindings, providedSourceIds: ReadonlySet<string>): IntegrityResult {
  const errors: string[] = [];
  if (f.findings.length === 0) errors.push("no findings");
  f.findings.forEach((x, i) => {
    if (x.sourceIds.length === 0) errors.push(`finding ${i + 1} has no source`);
    for (const id of x.sourceIds) if (!providedSourceIds.has(id)) errors.push(`finding ${i + 1} cites unknown source ${id}`);
  });
  return ok(errors);
}

export const MARKER_RE = /\[([LW][0-9]{1,3})\]/g;
export function citedMarkers(text: string): string[] {
  return [...new Set([...text.matchAll(MARKER_RE)].map((m) => m[1]!))];
}

/** AGT-006: brief markers must reference sources present in the findings; brief must cite something. */
export function checkBrief(b: ScribeBrief, findingsSourceIds: ReadonlySet<string>): IntegrityResult {
  const errors: string[] = [];
  if (b.sections.length < 3) errors.push("brief needs at least 3 sections");
  const keys = new Set<string>();
  for (const s of b.sections) {
    if (keys.has(s.key)) errors.push(`duplicate section ${s.key}`);
    keys.add(s.key);
    for (const m of citedMarkers(s.body)) if (!findingsSourceIds.has(m)) errors.push(`section ${s.key} cites ${m}, which is not in the research`);
  }
  if (b.sections.every((s) => citedMarkers(s.body).length === 0)) errors.push("brief cites no sources");
  return ok(errors);
}

export function checkReview(r: SentinelReview, briefSectionKeys: ReadonlySet<string>): IntegrityResult {
  const errors: string[] = [];
  for (const f of r.findings) if (!briefSectionKeys.has(f.sectionKey)) errors.push(`review refers to missing section ${f.sectionKey}`);
  return ok(errors);
}

export const SECTION_ORDER = BRIEF_SECTION_KEYS;
