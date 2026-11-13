import { NextResponse } from "next/server";
import { listMyWorkspaces, SESSION_COOKIE, verifyLoginLink } from "@/server/auth/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const r = await verifyLoginLink(token);
  if (!r.ok) return NextResponse.redirect(new URL(`/?link=${r.reason}`, url), 303);
  const ws = await listMyWorkspaces(r.userId);
  const res = NextResponse.redirect(new URL(ws[0] ? `/c/${ws[0].slug}` : "/?link=no_workspace", url), 303);
  res.cookies.set(SESSION_COOKIE, r.sessionToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 14 * 24 * 3600 });
  return res;
}
