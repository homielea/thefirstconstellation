import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import * as c from "../src/contracts";

const out = path.resolve(import.meta.dirname, "../src/contracts/generated");
fs.mkdirSync(out, { recursive: true });
const schemas: Record<string, z.ZodTypeAny> = {
  "mission-plan": c.MissionPlan, "seer.queries": c.SeerQueries, "seer.findings": c.SeerFindings, "scribe.brief": c.ScribeBrief,
  "sentinel.review": c.SentinelReview, "launch-brief": c.BriefContent, "run-event": c.RunEvent, "agent-profile": c.AgentProfileConfig,
  "api.create-mission": c.CreateMissionRequest, "api.save-artifact-version": c.SaveArtifactVersionRequest,
};
for (const [name, s] of Object.entries(schemas)) fs.writeFileSync(path.join(out, `${name}.schema.json`), JSON.stringify(z.toJSONSchema(s, { io: "input" }), null, 2) + "\n");
console.log(`wrote ${Object.keys(schemas).length} schemas to ${path.relative(process.cwd(), out)}`);
