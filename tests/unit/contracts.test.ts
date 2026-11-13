import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BriefContent, MissionPlan, ScribeBrief, SeerFindings, SentinelReview, AgentProfileConfig, parseArtifactContent } from "@/contracts";
import { FIRST_SEVEN, defaultProfileConfig } from "@/agents/first-seven";
import { PROMPTS, promptRef } from "@/agents/prompts";

const fx = (n: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "../../src/contracts/fixtures", n), "utf8"));

describe("contracts and fixtures", () => {
  it("valid fixtures parse", () => {
    expect(MissionPlan.safeParse(fx("plan.valid.launch-brief.json")).success).toBe(true);
    expect(SeerFindings.safeParse(fx("seer.findings.valid.json")).success).toBe(true);
    expect(ScribeBrief.safeParse(fx("scribe.brief.valid.json")).success).toBe(true);
    expect(SentinelReview.safeParse(fx("sentinel.review.valid.json")).success).toBe(true);
  });
  it("invalid schema fixtures fail", () => {
    expect(MissionPlan.safeParse(fx("plan.invalid.too-many-steps.json")).success).toBe(false);
    expect(MissionPlan.safeParse(fx("plan.invalid.unknown-archetype.json")).success).toBe(false);
  });
  it("rejects unknown content versions instead of coercing", () => {
    expect(() => parseArtifactContent("launch_brief", { version: "launch-brief@2", title: "x", sections: [] })).toThrow();
    expect(BriefContent.safeParse({ version: "launch-brief@1", title: "t", sections: [{ key: "overview", heading: "O", body: "b" }] }).success).toBe(true);
  });
  it("First Seven: seven distinct archetypes with valid default profiles (PROD-004)", () => {
    expect(new Set(FIRST_SEVEN.map((a) => a.key)).size).toBe(7);
    for (const a of FIRST_SEVEN) expect(AgentProfileConfig.safeParse(defaultProfileConfig(a)).success).toBe(true);
    // Sentinel has no tool that changes external systems (AGT-007)
    expect(FIRST_SEVEN.find((a) => a.key === "sentinel")!.defaultTools.every((t) => !t.startsWith("email") && t !== "web.search")).toBe(true);
  });
  it("prompt versions are content-addressed", () => {
    expect(promptRef("seer.v1")).toMatch(/^seer\.v1#[0-9a-f]{12}$/);
    expect(Object.keys(PROMPTS)).toEqual(["seer.v1", "scribe.v1", "sentinel.v1"]);
  });
});
