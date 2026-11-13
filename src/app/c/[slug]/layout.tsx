import Link from "next/link";
import { brand } from "@/brand";
import { listRooms } from "@/server/queries";
import { requireMember } from "@/server/web";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await requireMember(slug);
  const rooms = await listRooms(m.ctx);
  return (
    <>
      <header className="shell-header">
        <Link className="brand" href={`/c/${slug}`}>{m.workspaceName}<small>{brand.productName} · early build</small></Link>
        <nav aria-label="Workspace">
          <ul className="nav">
            {rooms.map((r) => <li key={r.id}><Link href={`/c/${slug}/rooms/${r.id}`}>{r.name}</Link></li>)}
          </ul>
        </nav>
        <form action="/api/auth/sign-out" method="post"><button className="btn" type="submit">Sign out</button></form>
      </header>
      {children}
    </>
  );
}
