import { NextResponse } from "next/server";
import { CreateMissionRequest } from "@/contracts";
import { createMission } from "@/server/orchestrator/missions";
import { apiError, apiMember, handleError } from "@/server/web";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateMissionRequest.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request.");
  const m = await apiMember(parsed.data.workspaceSlug, { mutating: true });
  if ("error" in m) return m.error;
  if (m.role === "guest") return apiError(404, "not_found", "Not found.");
  try {
    const r = await createMission({ ...m.ctx }, parsed.data.roomId, parsed.data.request);
    return NextResponse.json(r, { status: 201 });
  } catch (e) { return handleError(e); }
}
