import { MissionPlan, type PlanStep } from "@/contracts";

export type PlanValidation = { ok: true; plan: MissionPlan } | { ok: false; errors: string[] };

/** AGT-002: schema + graph validation. Dependencies must reference earlier steps (acyclic by construction). */
export function validatePlan(input: unknown): PlanValidation {
  const parsed = MissionPlan.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "plan"}: ${i.message}`) };
  const plan = parsed.data;
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const step of plan.steps) {
    if (seen.has(step.id)) errors.push(`steps: duplicate step id "${step.id}"`);
    for (const dep of step.dependsOn) {
      if (dep === step.id) errors.push(`steps.${step.id}: depends on itself`);
      else if (!seen.has(dep)) errors.push(`steps.${step.id}: dependency "${dep}" is not an earlier step`);
    }
    seen.add(step.id);
  }
  return errors.length ? { ok: false, errors } : { ok: true, plan };
}

/** AGT-005: a step is ready when every dependency is completed. */
export function readySteps(steps: Pick<PlanStep, "id" | "dependsOn">[], completed: ReadonlySet<string>): string[] {
  return steps.filter((s) => !completed.has(s.id) && s.dependsOn.every((d) => completed.has(d))).map((s) => s.id);
}

export const LAUNCH_BRIEF_TEMPLATE_ID = "launch-brief@1";

/** PROD-002: the fixed Phase 0 plan template. */
export function launchBriefPlan(objective: string, budgetUsd = 1): MissionPlan {
  return {
    version: "mission-plan@1",
    templateId: LAUNCH_BRIEF_TEMPLATE_ID,
    objective,
    assumptions: [
      "Research uses the room's library items and public web search results.",
      "Nothing is sent outside this workspace.",
    ],
    inputsRequired: [{ key: "objective", description: "What the launch is and what the brief is for", required: true }],
    steps: [
      {
        id: "research",
        title: "Research the market and sources",
        agentArchetype: "seer",
        dependsOn: [],
        allowedTools: ["library.read", "web.search"],
        expectedOutput: { artifactType: "research_note", description: "Sourced findings with citations and open gaps" },
        approvalPolicy: "none",
      },
      {
        id: "draft",
        title: "Draft the launch brief",
        agentArchetype: "scribe",
        dependsOn: ["research"],
        allowedTools: ["artifact.write"],
        expectedOutput: { artifactType: "launch_brief", description: "Editable launch brief citing the research" },
        approvalPolicy: "none",
      },
      {
        id: "review",
        title: "Review the brief against the request",
        agentArchetype: "sentinel",
        dependsOn: ["draft"],
        allowedTools: ["artifact.write"],
        expectedOutput: { artifactType: "review", description: "Review notes: problems, cautions and unsupported claims" },
        approvalPolicy: "none",
      },
    ],
    estimatedUsage: { modelCalls: 4, costBand: "low" },
    budgetUsd,
  };
}
