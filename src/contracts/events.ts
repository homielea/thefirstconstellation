import { z } from "zod";

export const RUN_EVENT_TYPES = [
  "plan.saved",
  "step.started",
  "step.tool",
  "step.attempt_failed",
  "step.completed",
  "step.failed",
  "step.cancelled",
  "step.retried",
  "mission.running",
  "mission.blocked",
  "mission.completed",
  "mission.failed",
  "mission.cancelled",
] as const;
export const RunEventType = z.enum(RUN_EVENT_TYPES);
export type RunEventType = z.infer<typeof RunEventType>;

export const ErrorCategory = z.enum(["model_error", "invalid_output", "timeout", "connection_missing", "budget_reached", "spend_cap", "tool_refused", "internal"]);
export type ErrorCategory = z.infer<typeof ErrorCategory>;

/** Client-visible event (run-event@1). `diagnostic` is never sent to non-admin clients. */
export const RunEvent = z.object({
  seq: z.number().int().positive(),
  type: RunEventType,
  at: z.string(),
  stepKey: z.string().nullable(),
  agentName: z.string().nullable(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()),
});
export type RunEvent = z.infer<typeof RunEvent>;
