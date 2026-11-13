"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Composer({ slug, roomId, canCreate }: { slug: string; roomId: string; canCreate: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canCreate) return <p className="muted">Guests can view missions but not begin them.</p>;
  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/missions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceSlug: slug, roomId, request: text }) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/c/${slug}/missions/${body.missionId}`);
    else { setError(body.error?.message ?? "The mission could not be created. Nothing was changed."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="panel stack" aria-label="Begin a mission">
      <div>
        <label id="composer-label" htmlFor="request">What outcome do you want?</label>
        <p className="help" id="request-help">For example: “Draft a launch brief for our March beta, using the positioning notes.” Iris researches, Quill drafts and Ward reviews. Nothing is sent anywhere.</p>
        <textarea id="request" aria-describedby="request-help" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !busy) submit(); }} />
      </div>
      <div className="row">
        <button className="btn primary" type="submit" disabled={busy || text.trim().length === 0}>{busy ? "Beginning…" : "Begin mission"}</button>
        <span className="small muted">Ctrl or ⌘ + Enter also begins.</span>
      </div>
      <div role="alert">{error && <p className="notice error">{error}</p>}</div>
    </form>
  );
}
