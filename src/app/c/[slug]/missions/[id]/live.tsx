"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LocalTime } from "@/components/time";

interface Ev { seq: number; type: string; at: string; stepKey: string | null; agentName: string | null; message: string }
const ANNOUNCE = new Set(["step.started", "step.completed", "step.failed", "mission.completed", "mission.failed", "mission.blocked", "mission.cancelled"]);
const REFRESH = new Set([...ANNOUNCE, "step.attempt_failed", "step.retried", "step.tool"]);

/** EXP-003, REL-002, ACC-002: durable events over SSE; EventSource resends Last-Event-ID on reconnect. */
export function LiveProgress({ slug, missionId, initialEvents, terminal }: { slug: string; missionId: string; initialEvents: Ev[]; terminal: boolean }) {
  const router = useRouter();
  const [events, setEvents] = useState<Ev[]>(initialEvents);
  const [announcement, setAnnouncement] = useState("");
  const [conn, setConn] = useState<"live" | "reconnecting" | "paused" | "ended">(terminal ? "ended" : "live");
  const last = useRef(initialEvents.at(-1)?.seq ?? 0);
  const failures = useRef(0);

  useEffect(() => {
    setEvents((prev) => {
      const seen = new Set(prev.map((e) => e.seq));
      const merged = [...prev, ...initialEvents.filter((e) => !seen.has(e.seq))].sort((a, b) => a.seq - b.seq);
      last.current = Math.max(last.current, merged.at(-1)?.seq ?? 0);
      return merged;
    });
  }, [initialEvents]);

  useEffect(() => {
    if (terminal) return;
    const es = new EventSource(`/api/missions/${missionId}/events?ws=${encodeURIComponent(slug)}&after=${last.current}`);
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    es.addEventListener("open", () => { failures.current = 0; setConn("live"); });
    es.addEventListener("run-event", (msg) => {
      const e = JSON.parse((msg as MessageEvent).data) as Ev;
      if (e.seq <= last.current && events.some((x) => x.seq === e.seq)) return;
      last.current = Math.max(last.current, e.seq);
      setEvents((prev) => (prev.some((x) => x.seq === e.seq) ? prev : [...prev, e]));
      if (ANNOUNCE.has(e.type)) setAnnouncement(e.message);
      if (REFRESH.has(e.type)) {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => router.refresh(), 150);
      }
    });
    es.addEventListener("end", () => { es.close(); setConn("ended"); router.refresh(); });
    es.addEventListener("error", () => {
      if (es.readyState === EventSource.CLOSED) return;
      failures.current += 1;
      if (failures.current > 3) { es.close(); setConn("paused"); } else setConn("reconnecting");
    });
    return () => { es.close(); if (refreshTimer) clearTimeout(refreshTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, slug, terminal]);

  return (
    <>
      <div role="status" aria-live="polite" className="small muted">
        {conn === "reconnecting" && "Reconnecting to live progress…"}
        {conn === "paused" && "Live progress paused. Reload to see the latest state."}
        <span className="visually-hidden" style={{ position: "absolute", left: -9999 }}>{announcement}</span>
      </div>
      <ol className="events" aria-labelledby="progress">
        {events.map((e) => (
          <li key={e.seq}><LocalTime iso={e.at} /><span>{e.message}</span></li>
        ))}
      </ol>
    </>
  );
}

export function CancelControl({ slug, missionId }: { slug: string; missionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) region.current?.focus(); }, [open]);
  async function confirm() {
    const res = await fetch(`/api/missions/${missionId}/cancel?ws=${encodeURIComponent(slug)}`, { method: "POST" });
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError((await res.json().catch(() => ({}))).error?.message ?? "Could not cancel.");
  }
  return (
    <>
      <button ref={trigger} className="btn danger" type="button" aria-expanded={open} onClick={() => setOpen(true)}>Cancel mission</button>
      {open && (
        <div ref={region} className="confirm" role="group" aria-labelledby="cancel-q" tabIndex={-1} style={{ flexBasis: "100%" }}>
          <p id="cancel-q"><strong>Cancel this mission?</strong> Steps already finished stay finished. The step in progress will be discarded.</p>
          <div className="row">
            <button className="btn danger" type="button" onClick={confirm}>Cancel mission</button>
            <button className="btn" type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Keep running</button>
          </div>
          {error && <p className="notice error" role="alert">{error}</p>}
        </div>
      )}
    </>
  );
}

export function RetryButton({ slug, stepId }: { slug: string; stepId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn" type="button" disabled={busy} onClick={async () => {
      setBusy(true);
      await fetch(`/api/mission-steps/${stepId}/retry?ws=${encodeURIComponent(slug)}`, { method: "POST" });
      router.refresh();
    }}>{busy ? "Retrying…" : "Retry step"}</button>
  );
}
