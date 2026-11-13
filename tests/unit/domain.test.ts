import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { launchBriefPlan, readySteps, validatePlan } from "@/domain/plan";
import { canMission, canStep } from "@/domain/state";
import { modelCostUsd } from "@/domain/pricing";
import { redact, redactString } from "@/domain/redact";
import { checkBrief, checkFindings, checkReview, citedMarkers } from "@/domain/integrity";
import { contrastRatio } from "@/domain/contrast";
import { colors, textOnSurfacePairs } from "@/styles/tokens";

const fx = (n: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "../../src/contracts/fixtures", n), "utf8"));

describe("plan validation (AGT-002, PROD-002)", () => {
  it("accepts the launch-brief template", () => {
    const v = validatePlan(launchBriefPlan("Draft a launch brief for Tidewater"));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.plan.steps.map((s) => s.agentArchetype)).toEqual(["seer", "scribe", "sentinel"]);
  });
  it("accepts the valid fixture", () => expect(validatePlan(fx("plan.valid.launch-brief.json")).ok).toBe(true));
  it.each(["plan.invalid.cycle.json", "plan.invalid.too-many-steps.json", "plan.invalid.unknown-archetype.json"])("rejects %s", (f) => {
    const v = validatePlan(fx(f));
    expect(v.ok).toBe(false);
  });
  it("rejects forward and self dependencies", () => {
    const p = launchBriefPlan("x".repeat(20));
    p.steps[0]!.dependsOn = ["draft"];
    expect(validatePlan(p).ok).toBe(false);
    p.steps[0]!.dependsOn = ["research"];
    expect(validatePlan(p).ok).toBe(false);
  });
});

describe("dependency unlocking (AGT-005)", () => {
  const steps = [{ id: "a", dependsOn: [] }, { id: "b", dependsOn: ["a"] }, { id: "c", dependsOn: ["a", "b"] }];
  it("unlocks only steps whose dependencies are complete", () => {
    expect(readySteps(steps, new Set())).toEqual(["a"]);
    expect(readySteps(steps, new Set(["a"]))).toEqual(["b"]);
    expect(readySteps(steps, new Set(["a", "b"]))).toEqual(["c"]);
  });
});

describe("state machine", () => {
  it("allows only defined transitions", () => {
    expect(canMission("queued", "running")).toBe(true);
    expect(canMission("completed", "running")).toBe(false);
    expect(canMission("cancelled", "running")).toBe(false);
    expect(canStep("completed", "ready")).toBe(false);
    expect(canStep("failed", "ready")).toBe(true);
  });
});

describe("cost calculation (OBS-001)", () => {
  it("prices tokens per million", () => {
    expect(modelCostUsd("claude-opus-5-5", 1_000_000, 0)).toBe(4);
    expect(modelCostUsd("claude-sonnet-5-5", 10_000, 2_000)).toBeCloseTo(0.04, 6);
  });
  it("refuses unknown models rather than guessing", () => expect(() => modelCostUsd("unknown-model", 1, 1)).toThrow());
});

describe("redaction (SEC-003)", () => {
  it("redacts secret keys and values", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-0123456789abcdef";
    const out = redact({ headers: { authorization: "Bearer abcdefghijkl", "x-api-key": "x" }, note: "key sk-ant-test-0123456789abcdef here", nested: [{ token: "t" }] });
    expect(JSON.stringify(out)).not.toMatch(/sk-ant|abcdefghijkl/);
    expect(out.headers.authorization).toBe("[redacted]");
    expect(redactString("fc_session=abc123def456")).toBe("[redacted]");
    delete process.env.ANTHROPIC_API_KEY;
  });
});

describe("citation integrity (AGT-006)", () => {
  it("rejects findings that cite unknown sources", () => {
    expect(checkFindings(fx("seer.findings.valid.json"), new Set(["W1", "W2", "L1"])).ok).toBe(true);
    expect(checkFindings(fx("seer.findings.invalid.unknown-source.json"), new Set(["W1", "L1"])).ok).toBe(false);
  });
  it("rejects brief markers not in the research", () => {
    const b = fx("scribe.brief.valid.json");
    expect(checkBrief(b, new Set(["W1", "L1"])).ok).toBe(true);
    expect(checkBrief(b, new Set(["W1"])).ok).toBe(false);
    expect(citedMarkers("a [W1] b [L12] [W1] [X3]")).toEqual(["W1", "L12"]);
  });
  it("rejects review findings for missing sections", () => {
    const r = fx("sentinel.review.valid.json");
    expect(checkReview(r, new Set(["overview", "risks", "channels"])).ok).toBe(true);
    expect(checkReview(r, new Set(["overview"])).ok).toBe(false);
  });
});

describe("token contrast (ACC-003)", () => {
  it.each(textOnSurfacePairs)("%s on %s meets %s:1", (fg, bg, min) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });
});
