"use client";
import { useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; message?: string }>({ kind: "idle" });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    const res = await fetch("/api/auth/request-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setState({ kind: "done", message: body.devNotice ?? "Check your email for a sign-in link." });
    else setState({ kind: "error", message: body.error?.message ?? "Could not request a sign-in link." });
  }
  return (
    <form onSubmit={submit} className="stack" noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button className="btn primary" type="submit" disabled={state.kind === "sending"}>{state.kind === "sending" ? "Requesting…" : "Send sign-in link"}</button>
      <div role="status" aria-live="polite">
        {state.kind === "done" && <p className="notice ok">{state.message}</p>}
        {state.kind === "error" && <p className="notice error">{state.message}</p>}
      </div>
    </form>
  );
}
