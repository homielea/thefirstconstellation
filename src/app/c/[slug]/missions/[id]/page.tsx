import Link from "next/link";
import { notFound } from "next/navigation";
import { FocusHeading } from "@/components/focus-heading";
import { SampleProvidersLabel } from "@/components/sample-label";
import { Status } from "@/components/status";
import { formatUsd } from "@/domain/pricing";
import { getMissionView } from "@/server/queries";
import { requireMember } from "@/server/web";
import { CancelControl, LiveProgress, RetryButton } from "./live";

const PLAIN: Record<string, string> = {
  model_error: "The model service returned an error.", invalid_output: "The answer did not match the required format.", timeout: "The call took too long.",
  connection_missing: "Web search is not connected. Ask an admin to connect it, then retry the step.", budget_reached: "This mission reached its budget.",
  spend_cap: "The live spend cap was reached.", tool_refused: "A tool outside this step's permissions was requested.", internal: "An internal error occurred.",
};
const ACTIVE = ["queued", "running", "blocked", "failed"];

export default async function MissionPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const m = await requireMember(slug);
  const v = /^[0-9a-f-]{36}$/.test(id) ? await getMissionView(m.ctx, id) : null;
  if (!v) notFound();
  const { mission, steps, events, history, totals, artifacts } = v;
  const done = steps.filter((s) => s.status === "completed").length;
  const current = steps.find((s) => s.status === "running");
  const brief = artifacts.find((a) => a.type === "launch_brief");
  const research = artifacts.find((a) => a.type === "research_note");
  const statusLine = mission.status === "running" && current ? `Running · step ${current.step_key === "research" ? 1 : current.step_key === "draft" ? 2 : 3} of ${steps.length}` : `${done} of ${steps.length} steps finished`;

  return (
    <main id="content">
      <p className="small"><Link href={`/c/${slug}/rooms/${mission.room_id}`}>← Back to room</Link></p>
      <FocusHeading>{mission.objective}</FocusHeading>
      <SampleProvidersLabel mode={mission.provider_mode} />
      <div className="row" style={{ marginBottom: "var(--s-4)" }}>
        <Status s={mission.status} />
        <span className="muted">{statusLine}</span>
        <span className="muted small">Spent {formatUsd(Number(mission.spent_usd))} of {formatUsd(Number(mission.budget_usd))} budget</span>
      </div>
      {mission.status === "blocked" && (
        <p className="notice" role="note">Paused: {PLAIN[mission.blocked_reason] ?? "the mission cannot continue."} Nothing outside this workspace was changed.</p>
      )}
      <div className="row">
        {brief && <Link className="btn primary" href={`/c/${slug}/artifacts/${brief.id}`}>Open brief</Link>}
        {research && <Link className="btn" href={`/c/${slug}/artifacts/${research.id}`}>Open research note</Link>}
        {ACTIVE.includes(mission.status) && <CancelControl slug={slug} missionId={mission.id} />}
      </div>

      <h2 id="plan">Plan</h2>
      <p className="help">A fixed formation for launch briefs. Each step has one owner and only the tools listed.</p>
      <ol className="steps" aria-labelledby="plan">
        {steps.map((s, i) => (
          <li key={s.id} className="step">
            <div className="step-head">
              <h3 style={{ margin: 0 }}>{i + 1}. {s.title}</h3>
              <Status s={s.status} />
            </div>
            <dl>
              <dt>Agent</dt><dd>{s.agentName} · {s.archetype[0].toUpperCase() + s.archetype.slice(1)}</dd>
              <dt>Tools</dt><dd>{s.allowed_tools.join(", ") || "none"}</dd>
              <dt>Expected output</dt><dd>{s.expected_output.description}</dd>
              {s.attempt > 0 && <><dt>Attempts</dt><dd>{s.attempt} of {s.max_attempts}</dd></>}
            </dl>
            {s.status === "failed" && s.last_error && (
              <div className="notice error" role="note" style={{ marginTop: "var(--s-3)" }}>
                <p><strong>{s.agentName} could not finish this step.</strong> Attempted: {s.title.toLowerCase()} ({s.last_error.attempt} attempt{s.last_error.attempt === 1 ? "" : "s"}).</p>
                <p>{PLAIN[s.last_error.category] ?? "An error occurred."} Nothing outside this workspace was changed.</p>
                <div className="row"><RetryButton slug={slug} stepId={s.id} /></div>
              </div>
            )}
          </li>
        ))}
      </ol>

      <h2 id="progress">Progress</h2>
      <LiveProgress slug={slug} missionId={mission.id} initialEvents={events} terminal={["completed", "cancelled"].includes(mission.status)} />

      <h2 id="history">Run history</h2>
      <p className="help">Every model and tool call in this mission. Costs are estimates from list prices.</p>
      {history.length === 0 ? <p className="muted">No calls yet.</p> : (
        <div className="table-wrap">
          <table className="history">
            <caption className="muted small" style={{ textAlign: "left", paddingBottom: "var(--s-2)" }}>{history.length} calls · {formatUsd(totals.cost)} · {totals.input + totals.output} tokens</caption>
            <thead><tr><th>Agent</th><th>Step</th><th>Kind</th><th>Model or tool</th><th className="num">Latency</th><th className="num">Tokens in / out</th><th className="num">Cost</th><th>Outcome</th></tr></thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td data-label="Agent">{h.agentName}</td>
                  <td data-label="Step">{h.stepTitle}{h.attempt > 1 ? ` (attempt ${h.attempt})` : ""}</td>
                  <td data-label="Kind">{h.kind === "model" ? `Model · ${h.detail}` : "Tool"}</td>
                  <td data-label="Model or tool">{h.name}</td>
                  <td data-label="Latency" className="num">{(Number(h.latency_ms) / 1000).toFixed(1)} s</td>
                  <td data-label="Tokens in / out" className="num">{h.kind === "model" ? `${h.input_tokens} / ${h.output_tokens}` : "—"}</td>
                  <td data-label="Cost" className="num">{formatUsd(Number(h.cost_usd))}</td>
                  <td data-label="Outcome">{h.outcome === "ok" ? "OK" : h.outcome === "refused" ? "Refused" : `Error: ${h.error_category}`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td data-label="Total" colSpan={4}><strong>Total</strong></td><td data-label="Latency" className="num">{(totals.latency / 1000).toFixed(1)} s</td><td data-label="Tokens in / out" className="num">{totals.input} / {totals.output}</td><td data-label="Cost" className="num"><strong>{formatUsd(totals.cost)}</strong></td><td /></tr></tfoot>
          </table>
        </div>
      )}
    </main>
  );
}
