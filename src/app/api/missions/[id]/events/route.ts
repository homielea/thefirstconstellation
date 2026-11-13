import { withWorkspace } from "@/server/db/pool";
import { missionEventStream } from "@/server/sse";
import { apiMember } from "@/server/web";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const m = await apiMember(url.searchParams.get("ws"), { mutating: false });
  if ("error" in m) return m.error;
  const exists = await withWorkspace(m.ctx, async (db) => (await db.query("SELECT 1 FROM missions WHERE id=$1", [id])).rowCount);
  if (!exists) return new Response(JSON.stringify({ error: { code: "not_found", message: "Not found." } }), { status: 404, headers: { "content-type": "application/json" } });
  const after = Number(req.headers.get("last-event-id") ?? url.searchParams.get("after") ?? 0) || 0;
  return new Response(missionEventStream(m.ctx, id, after, req.signal), {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" },
  });
}
