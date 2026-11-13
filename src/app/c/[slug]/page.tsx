import { redirect } from "next/navigation";
import { listRooms } from "@/server/queries";
import { requireMember } from "@/server/web";

export default async function WorkspaceHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await requireMember(slug);
  const rooms = await listRooms(m.ctx);
  if (rooms[0]) redirect(`/c/${slug}/rooms/${rooms[0].id}`);
  return (
    <main id="content" className="reading">
      <h1 tabIndex={-1}>{m.workspaceName}</h1>
      <p>Begin with a real outcome. The constellation will suggest who should help.</p>
      <p className="muted">Rooms are created during onboarding (next release).</p>
    </main>
  );
}
