import os from "node:os";
import crypto from "node:crypto";
import { log } from "@/domain/redact";
import type { Providers } from "@/server/providers/registry";
import { executeStep, type StepOutcome } from "@/server/orchestrator/runner";
import { postgresScheduler, type StepScheduler } from "@/server/orchestrator/scheduler";

export const newWorkerId = () => `${os.hostname()}:${process.pid}:${crypto.randomBytes(3).toString("hex")}`;

/** Runs claimable steps until none remain (used by tests and the eval runner). */
export async function drain(providers: Providers, opts: { workerId?: string; scheduler?: StepScheduler; maxSteps?: number } = {}): Promise<StepOutcome[]> {
  const workerId = opts.workerId ?? newWorkerId();
  const scheduler = opts.scheduler ?? postgresScheduler;
  const outcomes: StepOutcome[] = [];
  for (let i = 0; i < (opts.maxSteps ?? 50); i++) {
    const claim = await scheduler.claim(workerId);
    if (!claim) break;
    outcomes.push(await executeStep(claim, workerId, providers, scheduler, 500));
  }
  return outcomes;
}

/** Long-running poll loop with bounded concurrency. */
export async function runWorker(providers: Providers, opts: { concurrency?: number; pollMs?: number; signal?: AbortSignal } = {}) {
  const workerId = newWorkerId();
  const concurrency = opts.concurrency ?? 2;
  let active = 0;
  log("info", "worker started", { workerId, mode: providers.mode, concurrency });
  while (!opts.signal?.aborted) {
    if (active >= concurrency) { await new Promise((r) => setTimeout(r, 100)); continue; }
    let claim = null;
    try { claim = await postgresScheduler.claim(workerId); } catch (e) { log("error", "claim failed", e); }
    if (!claim) { await new Promise((r) => setTimeout(r, opts.pollMs ?? 500)); continue; }
    active++;
    executeStep(claim, workerId, providers, postgresScheduler)
      .then((o) => log("info", "step finished", { stepId: claim.stepId, outcome: o }))
      .catch((e) => log("error", "step crashed", e))
      .finally(() => { active--; });
  }
  while (active > 0) await new Promise((r) => setTimeout(r, 100));
  log("info", "worker stopped", { workerId });
}
