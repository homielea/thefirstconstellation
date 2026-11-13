import { NextResponse } from "next/server";
import { cancelMission } from "@/server/orchestrator/missions";
import { apiMember, handleError } from "@/server/web";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await apiMember(new URL(req.url).searchParams.get("ws"), { mutating: true });
  if ("error" in m) return m.error;
  try { return NextResponse.json({ status: await cancelMission(m.ctx, id) }); } catch (e) { return handleError(e); }
}
