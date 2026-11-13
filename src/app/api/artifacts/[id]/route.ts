import { NextResponse } from "next/server";
import { SaveArtifactVersionRequest } from "@/contracts";
import { saveBriefVersion } from "@/server/queries";
import { apiError, apiMember, handleError } from "@/server/web";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await apiMember(new URL(req.url).searchParams.get("ws"), { mutating: true });
  if ("error" in m) return m.error;
  if (m.role === "guest") return apiError(404, "not_found", "Not found.");
  const parsed = SaveArtifactVersionRequest.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return apiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid content.");
  try { return NextResponse.json(await saveBriefVersion(m.ctx, id, parsed.data.baseVersion, parsed.data.content)); } catch (e) { return handleError(e); }
}
