import { NextResponse } from "next/server";
import { RequestLinkRequest } from "@/contracts";
import { log } from "@/domain/redact";
import { issueLoginLink } from "@/server/auth/auth";
import { apiError } from "@/server/web";

export async function POST(req: Request) {
  const parsed = RequestLinkRequest.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return apiError(400, "invalid_email", "Enter a valid email address.");
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) {
    // PROD-003: no email transport is connected yet (slice 005). Never claim a link was sent.
    return apiError(503, "email_not_configured", "Email sign-in is not available yet on this deployment.");
  }
  const r = await issueLoginLink(parsed.data.email);
  if (!r.ok) return apiError(429, "rate_limited", "Too many sign-in links were requested. Try again in 15 minutes.");
  const origin = process.env.APP_ORIGIN ?? new URL(req.url).origin;
  // Development only: the link goes to the server console, never into the response.
  console.log(`\n[development] Sign-in link for ${parsed.data.email}:\n${origin}/auth/verify?token=${r.token}\n`);
  log("info", "sign-in link issued (development console)", { email: parsed.data.email });
  return NextResponse.json({ devNotice: "Development: the sign-in link was written to the server console." }, { status: 202 });
}
