import "server-only";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { log } from "@/domain/redact";
import { resolveMembership, SESSION_COOKIE, userForSession, type SessionUser } from "./auth/auth";
import { Conflict, NotFound } from "./orchestrator/missions";

export async function currentUser(): Promise<SessionUser | null> {
  return userForSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** SEC-002: pages 404 for non-members. */
export async function requireMember(slug: string) {
  const user = await currentUser();
  if (!user) notFound();
  const m = await resolveMembership(user.id, slug);
  if (!m) notFound();
  return { user, ...m, ctx: { workspaceId: m.workspaceId, userId: user.id } };
}

export const apiError = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

/** Mutating API routes: same-origin + session + membership. Non-members get 404. */
export async function apiMember(slug: string | null, opts: { mutating: boolean }) {
  const h = await headers();
  if (opts.mutating) {
    const origin = h.get("origin");
    const host = h.get("host");
    if (!origin || !host || new URL(origin).host !== host) return { error: apiError(403, "bad_origin", "Cross-origin requests are not allowed.") } as const;
  }
  const user = await currentUser();
  if (!user) return { error: apiError(401, "unauthenticated", "Sign in to continue.") } as const;
  if (!slug) return { error: apiError(404, "not_found", "Not found.") } as const;
  const m = await resolveMembership(user.id, slug);
  if (!m) return { error: apiError(404, "not_found", "Not found.") } as const;
  return { user, ...m, ctx: { workspaceId: m.workspaceId, userId: user.id } } as const;
}

export function handleError(e: unknown) {
  if (e instanceof NotFound) return apiError(404, "not_found", "Not found.");
  if (e instanceof Conflict) return apiError(409, "conflict", e.message);
  log("error", "api error", e);
  return apiError(500, "internal", "Something went wrong. Nothing was changed.");
}
