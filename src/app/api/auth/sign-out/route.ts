import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { endSession, SESSION_COOKIE } from "@/server/auth/auth";

export async function POST(req: Request) {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) await endSession(t);
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
