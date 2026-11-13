import { isTerminalMission, type MissionStatus } from "@/domain/state";
import { withWorkspace, type WorkspaceCtx } from "./db/pool";
import { eventsAfter } from "./orchestrator/events";

/** REL-002 / §7: an SSE body that replays durable events after `afterSeq`, then follows new ones. */
export function missionEventStream(ctx: WorkspaceCtx, missionId: string, afterSeq: number, signal: AbortSignal, pollMs = 500): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let last = afterSeq;
  return new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(enc.encode(s));
      send("retry: 2000\n\n");
      try {
        while (!signal.aborted) {
          const { events, status } = await withWorkspace(ctx, async (db) => ({
            events: await eventsAfter(db, missionId, last),
            status: (await db.query("SELECT status FROM missions WHERE id=$1", [missionId])).rows[0]?.status as MissionStatus | undefined,
          }));
          if (!status) break;
          for (const e of events) {
            send(`id: ${e.seq}\nevent: run-event\ndata: ${JSON.stringify(e)}\n\n`);
            last = e.seq;
          }
          if (events.length === 0) {
            if (isTerminalMission(status)) { send(`event: end\ndata: {"status":"${status}"}\n\n`); break; }
            send(": keep-alive\n\n");
            await new Promise((r) => setTimeout(r, pollMs));
          }
        }
      } catch {
        // client went away or DB error: end the stream; the client reconnects with Last-Event-ID.
      }
      try { controller.close(); } catch {}
    },
  });
}
