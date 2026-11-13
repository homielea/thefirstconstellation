import { notFound } from "next/navigation";
import { FocusHeading } from "@/components/focus-heading";
import { getSourceDocument } from "@/server/queries";
import { requireMember } from "@/server/web";

export default async function LibraryItem({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const m = await requireMember(slug);
  const doc = /^[0-9a-f-]{36}$/.test(id) ? await getSourceDocument(m.ctx, id) : null;
  if (!doc) notFound();
  return (
    <main id="content" className="reading">
      <FocusHeading>{doc.title}</FocusHeading>
      <p className="muted small">Library item · pasted text</p>
      <div className="panel" style={{ whiteSpace: "pre-wrap" }}>{doc.body}</div>
    </main>
  );
}
