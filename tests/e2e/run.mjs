// Browser e2e for slice 001. Needs a build (`npm run build`), local Postgres, and Playwright+Chromium.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import pg from "pg";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "tests/e2e/output");
fs.mkdirSync(out, { recursive: true });
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const OWNER = "postgres://fc_owner:fc_owner_dev@localhost:5432/fc_test";
const APP = "postgres://fc_app:fc_app_dev@localhost:5432/fc_test";
const env = { ...process.env, DATABASE_URL: APP, DATABASE_OWNER_URL: OWNER, PROVIDER_MODE: "fake", APP_ORIGIN: BASE, NODE_ENV: "production" };
const procs = [];
const results = [];
let failed = 0;

function start(cmd, args, extra = {}, name = cmd) {
  const p = spawn(cmd, args, { cwd: root, env: { ...env, ...extra }, stdio: ["ignore", "pipe", "pipe"] });
  const log = fs.createWriteStream(path.join(out, `${name}.log`));
  p.stdout.pipe(log); p.stderr.pipe(log);
  procs.push(p);
  return p;
}
const stop = async (p) => { if (p.exitCode === null) { p.kill("SIGTERM"); await new Promise((r) => p.on("exit", r)); } };
const tsx = (script, extra, name) => start(process.execPath, ["--import", "tsx", script], extra, name);
async function run(script) {
  const p = tsx(script, {}, path.basename(script));
  const code = await new Promise((r) => p.on("exit", r));
  if (code !== 0) throw new Error(`${script} exited ${code}`);
}
async function waitFor(fn, ms = 30000, label = "condition") {
  const end = Date.now() + ms;
  for (;;) { try { const v = await fn(); if (v) return v; } catch {} if (Date.now() > end) throw new Error(`Timed out waiting for ${label}`); await new Promise((r) => setTimeout(r, 200)); }
}
async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; results.push({ name, ok: false, error: String(e?.message ?? e) }); console.log(`  ✗ ${name}\n    ${String(e?.stack ?? e).split("\n").slice(0, 4).join("\n    ")}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
/** Events are matched inside the progress list (the live region repeats some of them). */
const ev = (page, text) => page.locator("ol.events").getByText(text).first();

async function signIn(context, email) {
  const token = crypto.randomBytes(32).toString("base64url");
  const db = new pg.Client({ connectionString: APP });
  await db.connect();
  await db.query("INSERT INTO login_tokens (email, token_hash, expires_at) VALUES ($1,$2, now() + interval '15 minutes')", [email, crypto.createHash("sha256").update(token).digest()]);
  await db.end();
  const page = await context.newPage();
  await page.goto(`${BASE}/auth/verify?token=${token}`);
  return page;
}
async function axe(page, label) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const r = await page.evaluate(async () => await window.axe.run(document, { resultTypes: ["violations"] }));
  const bad = r.violations.filter((v) => ["serious", "critical"].includes(v.impact));
  fs.writeFileSync(path.join(out, `axe-${label}.json`), JSON.stringify(r.violations, null, 2));
  assert(bad.length === 0, `axe ${label}: ${bad.map((v) => `${v.id} (${v.nodes.length})`).join(", ")}`);
}
/** Presses Tab until the focused element matches; fails if it is never reached. Returns the focus description. */
async function tabTo(page, match, label, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const a = await page.evaluate(() => { const e = document.activeElement; return { id: e?.id ?? "", tag: e?.tagName ?? "", text: (e?.textContent ?? "").trim() }; });
    if (match(a)) return a;
  }
  throw new Error(`could not reach ${label} with the Tab key`);
}
/** ACC-001: the keyboard-focused element shows a visible focus indicator. */
async function assertFocusVisible(page, label) {
  const o = await page.evaluate(() => { const c = getComputedStyle(document.activeElement); return { style: c.outlineStyle, width: parseFloat(c.outlineWidth) }; });
  assert(o.style !== "none" && o.width >= 2, `no visible focus indicator on ${label}: ${JSON.stringify(o)}`);
}
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
async function noHorizontalScroll(page) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert(w[0] <= w[1], `horizontal scroll: ${w[0]} > ${w[1]}`);
}

try {
  console.log("e2e: preparing database and servers");
  await run("tests/e2e/prepare.ts");
  const web = start("node_modules/.bin/next", ["start", "-p", String(PORT)], {}, "next");
  await waitFor(async () => (await fetch(BASE)).status === 200, 60000, "next start");
  let worker = tsx("src/worker/main.ts", { FAKE_DELAY_MS: "700", FAKE_FAULTS: JSON.stringify([{ schema: "scribe.brief@1", kind: "invalid", times: 3 }]) }, "worker-faults");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let missionUrl = "";

  await test("sign-in page shows development notice, never claims an email was sent (PROD-003)", async () => {
    const page = await ctx.newPage();
    await page.goto(BASE);
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByRole("button", { name: "Send sign-in link" }).click();
    // production build: no email transport is configured, so the page must say so
    await page.getByText("Email sign-in is not available yet on this deployment.").waitFor();
    await shot(page, "signin-no-email-transport");
    await page.close();
  });

  await test("keyboard-only: request a sign-in link, with a visible focus indicator (ACC-001)", async () => {
    const page = await ctx.newPage();
    await page.goto(BASE);
    await tabTo(page, (a) => a.id === "email", "the email field");
    await assertFocusVisible(page, "email field");
    await page.keyboard.type("someone@example.com");
    await tabTo(page, (a) => a.tag === "BUTTON" && a.text === "Send sign-in link", "the send button", 3);
    await assertFocusVisible(page, "send button");
    await page.keyboard.press("Enter");
    await page.getByRole("status").getByText("Email sign-in is not available yet on this deployment.").waitFor();
    await page.close();
  });

  const page = await signIn(ctx, "founder@example.com");

  await test("room empty state, landmarks and axe (EXP-001, ACC-002, ACC-005)", async () => {
    await page.getByRole("heading", { level: 1, name: "Spring launch" }).waitFor();
    await page.getByText("Begin with a real outcome. The constellation will suggest who should help.").waitFor();
    assert(await page.locator("main#content").count() === 1, "main landmark");
    assert(await page.locator("canvas").count() === 0, "no canvas (PERF-001)");
    await axe(page, "room");
    await shot(page, "room-empty");
  });

  await test("failed step shows what happened and offers retry; retry completes without re-running research (EXP-004, REL-004)", async () => {
    await page.getByLabel("What outcome do you want?").fill("Draft a launch brief for Tidewater's March public beta.");
    await page.getByRole("button", { name: "Begin mission" }).click();
    await page.waitForURL(/\/missions\//);
    missionUrl = page.url();
    await ev(page, "Iris (Seer) started").waitFor({ timeout: 20000 });
    await ev(page, /could not finish “Draft the launch brief”/).waitFor({ timeout: 30000 });
    await page.getByText("Nothing outside this workspace was changed.").first().waitFor();
    await page.getByRole("button", { name: "Retry step" }).waitFor();
    await shot(page, "mission-failed");
    await stop(worker);
    worker = tsx("src/worker/main.ts", { FAKE_DELAY_MS: "700" }, "worker");
    await page.getByRole("button", { name: "Retry step" }).click();
    await ev(page, "Mission complete. The brief is ready to edit.").waitFor({ timeout: 30000 });
    assert((await page.locator("ol.events").getByText("Iris finished research").count()) === 1, "research ran once");
  });

  await test("keyboard-only: begin a mission, watch live progress without reload, one announcement per transition (ACC-001, ACC-002, EXP-002, EXP-003, PROD-005)", async () => {
    await page.goto(`${BASE}/c/northlight`);
    await page.getByRole("heading", { level: 1, name: "Spring launch" }).waitFor();
    await page.keyboard.press("Tab"); // skip link
    let focused = "";
    for (let i = 0; i < 25 && focused !== "request"; i++) { await page.keyboard.press("Tab"); focused = await page.evaluate(() => document.activeElement?.id ?? ""); }
    assert(focused === "request", "reached the composer by keyboard");
    await page.keyboard.type("Draft a launch brief for Tidewater, our studio planning app, for the March beta.");
    await page.keyboard.press("Control+Enter");
    await page.waitForURL(/\/missions\//);
    missionUrl = page.url();
    await page.locator("[aria-live=polite] .visually-hidden").waitFor({ state: "attached" });
    await page.evaluate(() => {
      const el = document.querySelector("[aria-live=polite] .visually-hidden");
      window.__announced = el.textContent ? [el.textContent] : [];
      new MutationObserver(() => { if (el.textContent) window.__announced.push(el.textContent); }).observe(el, { childList: true, characterData: true, subtree: true });
    });
    await page.getByText("Sample providers: output is generated by test fakes, not a model.").waitFor();
    for (const n of ["Iris · Seer", "Quill · Scribe", "Ward · Sentinel"]) await page.getByText(n).waitFor();
    await ev(page, "Iris (Seer) started").waitFor({ timeout: 20000 });
    await shot(page, "mission-running");
    await ev(page, "Mission complete. The brief is ready to edit.").waitFor({ timeout: 30000 });
    await page.getByRole("link", { name: "Open brief" }).waitFor();
    const announced = await page.evaluate(() => window.__announced);
    const listed = await page.locator("ol.events li").count();
    assert(announced.length >= 1 && announced.at(-1) === "Mission complete. The brief is ready to edit.", `live region: ${JSON.stringify(announced)}`);
    assert(new Set(announced).size === announced.length, `a transition was announced more than once: ${JSON.stringify(announced)}`);
    assert(announced.length <= listed, `more announcements (${announced.length}) than progress events (${listed})`);
    const rows = await page.locator("table.history tbody tr").count();
    assert(rows >= 8, `run history rows: ${rows}`);
    await axe(page, "mission");
    await shot(page, "mission-completed");
  });

  await test("edit the brief, save a version attributed to the person; review names the reviewed version (EXP-005, EXP-008, DAT-002)", async () => {
    await page.getByRole("link", { name: "Open brief" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/artifacts\//);
    await page.getByRole("heading", { name: "Review notes" }).waitFor();
    assert(await page.locator("ol.sources li").count() > 0, "sources listed");
    const box = page.getByLabel("Risks");
    await box.focus();
    await page.keyboard.press("End");
    await page.keyboard.type(" Owner for pricing risk: Mara.");
    await tabTo(page, (a) => a.tag === "BUTTON" && a.text === "Save version", "the save button", 3);
    await assertFocusVisible(page, "save button");
    await page.keyboard.press("Enter");
    await page.getByText("Saved as version 2.").waitFor();
    await page.getByRole("navigation", { name: "Versions" }).getByRole("paragraph").getByText(/Version 2 · Mara \(sample founder\)/).waitFor();
    await page.getByText("Review applies to version 1; the brief is now version 2.").waitFor();
    await page.getByText("Review notes help you check the work. They do not guarantee it is correct.").waitFor();
    await axe(page, "artifact");
    await shot(page, "artifact-edited");
  });

  await test("keyboard-only: inspect version history and open an earlier version (ACC-001)", async () => {
    await page.reload();
    await page.getByRole("heading", { name: "Review notes" }).waitFor();
    await tabTo(page, (a) => a.tag === "SUMMARY" && a.text.startsWith("All versions (2)"), "the version list toggle");
    await assertFocusVisible(page, "version list toggle");
    await page.keyboard.press("Enter");
    await tabTo(page, (a) => a.tag === "A" && a.text === "Version 1", "the version 1 link", 3);
    await page.keyboard.press("Enter");
    await page.waitForURL(/\?v=1$/);
    await page.getByText("viewing an earlier version (read-only)").waitFor();
  });

  await test("cancel a running mission with in-page confirmation (EXP-007, REL-003)", async () => {
    await page.goto(`${BASE}/c/northlight`);
    await page.getByLabel("What outcome do you want?").fill("Draft a launch brief for the Tidewater partner programme.");
    await page.getByRole("button", { name: "Begin mission" }).click();
    await page.waitForURL(/\/missions\//);
    await ev(page, "Iris (Seer) started").waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Cancel mission" }).click();
    await page.getByText("Cancel this mission?").waitFor();
    await shot(page, "mission-cancel-confirm");
    await page.getByRole("group").getByRole("button", { name: "Cancel mission" }).click();
    await ev(page, /Mission cancelled\./).waitFor({ timeout: 15000 });
    await page.waitForTimeout(2500);
    assert((await page.locator("ol.events").getByText("Quill (Scribe) started").count()) === 0, "no step after cancel");
    await shot(page, "mission-cancelled");
  });

  await test("keyboard-only: cancel a running mission; focus moves to the question and back (ACC-001, EXP-007)", async () => {
    await page.goto(`${BASE}/c/northlight`);
    await tabTo(page, (a) => a.id === "request", "the composer");
    await page.keyboard.type("Draft a launch brief for the Tidewater referral scheme.");
    await page.keyboard.press("Control+Enter");
    await page.waitForURL(/\/missions\//);
    await ev(page, "Iris (Seer) started").waitFor({ timeout: 20000 });
    const isTrigger = (a) => a.tag === "BUTTON" && a.text === "Cancel mission";
    await tabTo(page, isTrigger, "the cancel button");
    await assertFocusVisible(page, "cancel button");
    await page.keyboard.press("Enter");
    await page.getByText("Cancel this mission?").waitFor();
    assert(await page.evaluate(() => document.activeElement?.getAttribute("role") === "group"), "focus moves to the confirmation question");
    await tabTo(page, (a) => a.tag === "BUTTON" && a.text === "Keep running", "Keep running", 3);
    await page.keyboard.press("Enter");
    await page.getByText("Cancel this mission?").waitFor({ state: "detached" });
    assert(isTrigger(await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent.trim() }))), "focus returns to the cancel button");
    await page.keyboard.press("Enter");
    await page.getByText("Cancel this mission?").waitFor();
    await tabTo(page, isTrigger, "the confirm button", 2);
    await assertFocusVisible(page, "confirm button");
    await page.keyboard.press("Enter");
    await ev(page, /Mission cancelled\./).waitFor({ timeout: 15000 });
  });

  await test("320 px: room, mission and artifact need no horizontal scroll (ACC-004)", async () => {
    const m = await ctx.newPage();
    await m.setViewportSize({ width: 320, height: 800 });
    await m.goto(`${BASE}/c/northlight`); await noHorizontalScroll(m); await shot(m, "mobile-room");
    await m.goto(missionUrl); await ev(m, "Mission complete.").waitFor(); await noHorizontalScroll(m); await shot(m, "mobile-mission");
    await m.getByRole("link", { name: "Open brief" }).click(); await m.waitForURL(/artifacts/); await noHorizontalScroll(m); await shot(m, "mobile-artifact");
    await m.close();
  });

  await test("reduced motion removes transitions (VIS-002)", async () => {
    const rm = await browser.newContext({ reducedMotion: "reduce", storageState: await ctx.storageState() });
    const p = await rm.newPage();
    await p.goto(missionUrl);
    const anim = await p.locator("ol.events li").first().evaluate((el) => getComputedStyle(el).animationName);
    assert(anim === "none", `animation: ${anim}`);
    await rm.close();
  });

  await test("another workspace's member gets 404 for pages and the event stream (SEC-001, SEC-002)", async () => {
    const other = await browser.newContext();
    const p = await signIn(other, "outsider@example.com");
    const res = await p.goto(missionUrl);
    assert(res.status() === 404, `page status ${res.status()}`);
    await p.getByRole("heading", { name: "Not found" }).waitFor();
    const id = missionUrl.split("/").pop();
    const api = await p.request.get(`${BASE}/api/missions/${id}/events?ws=northlight`);
    assert(api.status() === 404, `stream status ${api.status()}`);
    const own = await p.request.get(`${BASE}/api/missions/${id}/events?ws=outsider-studio`);
    assert(own.status() === 404, `stream via own workspace status ${own.status()}`);
    await other.close();
  });

  await test("cross-origin mutation is refused", async () => {
    const r = await page.request.post(`${BASE}/api/missions`, { headers: { origin: "https://evil.example" }, data: { workspaceSlug: "northlight", roomId: crypto.randomUUID(), request: "Draft something long enough" } });
    assert(r.status() === 403, `status ${r.status()}`);
  });

  await browser.close();
} catch (e) {
  failed++;
  console.error("e2e setup failed:", e);
} finally {
  for (const p of procs) await stop(p).catch(() => {});
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  console.log(`e2e: ${results.filter((r) => r.ok).length}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
