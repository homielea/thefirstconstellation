"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BriefContent } from "@/contracts";

/** EXP-005: section editing; "Save version" creates a new attributed version. */
export function BriefEditor({ slug, artifactId, version, content, readOnly }: { slug: string; artifactId: string; version: number; content: BriefContent; readOnly: boolean }) {
  const router = useRouter();
  const [sections, setSections] = useState(content.sections);
  const [title, setTitle] = useState(content.title);
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" | "error"; msg?: string }>({ kind: "idle" });
  const dirty = title !== content.title || sections.some((s, i) => s.body !== content.sections[i]?.body);

  if (readOnly) {
    return <div className="stack">{content.sections.map((s) => <section key={s.key}><h2>{s.heading}</h2><p style={{ whiteSpace: "pre-wrap" }}>{s.body}</p></section>)}</div>;
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "saving" });
    const res = await fetch(`/api/artifacts/${artifactId}?ws=${encodeURIComponent(slug)}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseVersion: version, content: { version: "launch-brief@1", title, sections } }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) { setState({ kind: "saved", msg: `Saved as version ${body.version}.` }); router.refresh(); }
    else setState({ kind: "error", msg: body.error?.message ?? "Could not save. Your edits are still here." });
  }
  return (
    <form onSubmit={save}>
      <div className="section-edit">
        <label htmlFor="brief-title">Title</label>
        <input id="brief-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {sections.map((s, i) => (
        <div key={s.key} className="section-edit">
          <label htmlFor={`sec-${s.key}`}><span role="heading" aria-level={2} style={{ fontSize: "var(--fs-lg)" }}>{s.heading}</span></label>
          <textarea id={`sec-${s.key}`} value={s.body} rows={Math.min(14, Math.max(3, Math.ceil(s.body.length / 70)))}
            onChange={(e) => setSections((prev) => prev.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
        </div>
      ))}
      <div className="row">
        <button className="btn primary" type="submit" disabled={!dirty || state.kind === "saving"}>{state.kind === "saving" ? "Saving…" : "Save version"}</button>
        {dirty && state.kind !== "saving" && <span className="small muted">Unsaved changes</span>}
      </div>
      <div role="status" aria-live="polite">
        {state.kind === "saved" && <p className="notice ok">{state.msg}</p>}
        {state.kind === "error" && <p className="notice error">{state.msg}</p>}
      </div>
    </form>
  );
}
