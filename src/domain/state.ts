export const MISSION_STATUSES = ["draft", "awaiting_plan_approval", "queued", "running", "awaiting_approval", "blocked", "completed", "failed", "cancelled"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];
export const STEP_STATUSES = ["pending", "ready", "running", "awaiting_approval", "completed", "failed", "skipped", "cancelled"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

const missionTransitions: Record<MissionStatus, MissionStatus[]> = {
  draft: ["awaiting_plan_approval", "queued", "cancelled"],
  awaiting_plan_approval: ["queued", "cancelled"],
  queued: ["running", "cancelled", "blocked", "failed"],
  running: ["running", "completed", "failed", "cancelled", "blocked", "awaiting_approval"],
  awaiting_approval: ["running", "cancelled"],
  blocked: ["running", "cancelled"],
  failed: ["running", "cancelled"],
  completed: [],
  cancelled: [],
};

const stepTransitions: Record<StepStatus, StepStatus[]> = {
  pending: ["ready", "cancelled", "skipped"],
  ready: ["running", "cancelled"],
  running: ["completed", "failed", "ready", "cancelled", "awaiting_approval"],
  awaiting_approval: ["running", "cancelled"],
  failed: ["ready", "cancelled"],
  completed: [],
  skipped: [],
  cancelled: [],
};

export function canMission(from: MissionStatus, to: MissionStatus): boolean {
  return missionTransitions[from].includes(to);
}
export function canStep(from: StepStatus, to: StepStatus): boolean {
  return stepTransitions[from].includes(to);
}
/** Statuses from which a mission may be cancelled (EXP-007). */
export const CANCELLABLE: MissionStatus[] = ["queued", "running", "blocked", "awaiting_approval", "failed"];
export const isTerminalMission = (s: MissionStatus) => s === "completed" || s === "cancelled";
export const MAX_ATTEMPTS = 3; // AGT-009: 1 + 2 retries
