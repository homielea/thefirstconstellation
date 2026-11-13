import { z } from "zod";

export const ARCHETYPES = ["navigator", "seer", "scribe", "maker", "weaver", "keeper", "sentinel"] as const;
export const Archetype = z.enum(ARCHETYPES);
export type Archetype = z.infer<typeof Archetype>;

/** Source ids handed to agents: L1.. for library items, W1.. for web results. */
export const SourceId = z.string().regex(/^[LW][0-9]{1,3}$/);
