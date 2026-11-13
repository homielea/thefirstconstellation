import { NextResponse } from "next/server";
import { retryStep } from "@/server/orchestrator/missions";
import { apiMember, handleError } from "@/server/web";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await apiMember(new URL(req.url).searchParams.get("ws"), { mutating: true });
  if ("error" in m) return m.error;
  try { await retryStep(m.ctx, id); return NextResponse.json({ status: "running" }); } catch (e) { return handleError(e); }
}
