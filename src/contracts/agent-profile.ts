import { z } from "zod";
import { Archetype } from "./common";

export const VisualConfig = z.object({
  seed: z.number().int().nonnegative(),
  symbolFamily: z.enum(["compass", "eye", "quill", "anvil", "thread", "lantern", "shield"]),
  coreForm: z.enum(["sphere", "octahedron", "torus", "prism"]),
  ringDensity: z.number().int().min(0).max(4),
  lightTemperature: z.enum(["cool", "neutral", "warm"]),
  motionTemperament: z.enum(["still", "calm", "lively"]),
});

export const AgentProfileConfig = z.object({
  version: z.literal("agent-profile@1"),
  archetype: Archetype,
  properName: z.string().min(1).max(40),
  nameIsWorking: z.boolean(),
  epithet: z.string().max(120),
  pronouns: z.string().max(30).nullable(),
  communicationStyle: z.enum(["concise", "balanced", "expansive"]),
  visual: VisualConfig,
  toolGrants: z.array(z.string()),
});
export type AgentProfileConfig = z.infer<typeof AgentProfileConfig>;
