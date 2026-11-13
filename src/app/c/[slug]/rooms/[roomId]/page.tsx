import Link from "next/link";
import { notFound } from "next/navigation";
import { FocusHeading } from "@/components/focus-heading";
import { Status } from "@/components/status";
import { LocalTime } from "@/components/time";
import { getRoomView } from "@/server/queries";
import { requireMember } from "@/server/web";
import { Composer } from "./composer";

export default async function RoomPage({ params }: { params: Promise<{ slug: string; roomId: string }> }) {
  const { slug, roomId } = await params;
  const m = await requireMember(slug);
  const view = /^[0-9a-f-]{36}$/.test(roomId) ? await getRoomView(m.ctx, roomId) : null;
  if (!view) notFound();
  return (
    <main id="content" className="reading">
      <FocusHeading>{view.room.name}</FocusHeading>
      <Composer slug={slug} roomId={roomId} canCreate={m.role !== "guest"} />
      <h2>Missions in this room</h2>
      {view.missions.length === 0 ? (
        <p className="muted">Begin with a real outcome. The constellation will suggest who should help.</p>
      ) : (
        <ul className="list">
          {view.missions.map((x) => (
            <li key={x.id} className="row" style={{ justifyContent: "space-between" }}>
              <Link href={`/c/${slug}/missions/${x.id}`}>{x.objective.length > 90 ? `${x.objective.slice(0, 90)}…` : x.objective}</Link>
              <span className="row small"><Status s={x.status} /><LocalTime iso={x.created_at.toISOString()} /></span>
            </li>
          ))}
        </ul>
      )}
      <h2>Library for this room</h2>
      <p className="help">Sources the Seer may use. Upload arrives in a later release; these are pasted notes.</p>
      {view.library.length === 0 ? <p className="muted">No library items yet.</p> : (
        <ul className="list">{view.library.map((d) => <li key={d.id}><Link href={`/c/${slug}/library/${d.id}`}>{d.title}</Link></li>)}</ul>
      )}
    </main>
  );
}
