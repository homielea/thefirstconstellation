import { z } from "zod";
import { Archetype } from "./common";

export const PlanStep = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/),
  title: z.string().min(1).max(120),
  agentArchetype: Archetype,
  dependsOn: z.array(z.string()),
  allowedTools: z.array(z.string()),
  expectedOutput: z.object({ artifactType: z.string().optional(), description: z.string().min(1) }),
  approvalPolicy: z.enum(["none", "before_external_action"]),
});
export type PlanStep = z.infer<typeof PlanStep>;

/** Build spec §14 shape, plus template id, version and budget. */
export const MissionPlan = z.object({
  version: z.literal("mission-plan@1"),
  templateId: z.string().optional(),
  objective: z.string().min(1).max(4000),
  assumptions: z.array(z.string()),
  inputsRequired: z.array(z.object({ key: z.string(), description: z.string(), required: z.boolean() })),
  steps: z.array(PlanStep).min(1).max(12),
  estimatedUsage: z.object({ modelCalls: z.number().int().nonnegative(), costBand: z.enum(["low", "medium", "high"]) }),
  budgetUsd: z.number().positive().max(100),
});
export type MissionPlan = z.infer<typeof MissionPlan>;
