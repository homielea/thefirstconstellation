import Link from "next/link";
import { notFound } from "next/navigation";
import { FocusHeading } from "@/components/focus-heading";
import { LocalTime } from "@/components/time";
import type { BriefContent, ResearchNoteContent, ReviewContent } from "@/contracts";
import { getArtifactView, getMissionView } from "@/server/queries";
import { requireMember } from "@/server/web";
import { SampleProvidersLabel } from "@/components/sample-label";
import { BriefEditor } from "./editor";

const SEV: Record<string, string> = { problem: "Problem", caution: "Caution", info: "Note" };

export default async function ArtifactPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { slug, id } = await params;
  const { v } = await searchParams;
  const m = await requireMember(slug);
  const view = /^[0-9a-f-]{36}$/.test(id) ? await getArtifactView(m.ctx, id, v ? Number(v) || undefined : undefined) : null;
  if (!view) notFound();
  const { artifact, content, versions, citations, review, shownVersion } = view;
  const mission = artifact.mission_id ? await getMissionView(m.ctx, artifact.mission_id) : null;
  const isCurrent = shownVersion === artifact.current_version;
  const shownMeta = versions.find((x) => x.version === shownVersion)!;

  return (
    <main id="content" className="reading">
      {artifact.mission_id && <p className="small"><Link href={`/c/${slug}/missions/${artifact.mission_id}`}>← Back to mission</Link></p>}
      <FocusHeading>{artifact.title}</FocusHeading>
      {mission && <SampleProvidersLabel mode={mission.mission.provider_mode} />}

      <nav aria-label="Versions" className="small" style={{ marginBottom: "var(--s-4)" }}>
        <p className="muted">Version {shownVersion} · {shownMeta.author} · <LocalTime iso={shownMeta.createdAt} />{!isCurrent && " · viewing an earlier version (read-only)"}</p>
        <details>
          <summary>All versions ({versions.length})</summary>
          <ul className="list">
            {versions.map((x) => (
              <li key={x.version}>
                {x.version === shownVersion ? <strong aria-current="true">Version {x.version}</strong> : <Link href={`/c/${slug}/artifacts/${artifact.id}?v=${x.version}`}>Version {x.version}</Link>}
                {" "}· {x.author} · <LocalTime iso={x.createdAt} />
              </li>
            ))}
          </ul>
        </details>
      </nav>

      {artifact.type === "launch_brief" && (
        <BriefEditor slug={slug} artifactId={artifact.id} version={shownVersion} content={content as BriefContent} readOnly={!isCurrent || m.role === "guest"} />
      )}
      {artifact.type === "research_note" && <ResearchNote content={content as ResearchNoteContent} />}
      {artifact.type === "review" && <ReviewNotes content={content as ReviewContent} current={null} />}

      <h2 id="sources">Sources</h2>
      {citations.length === 0 ? <p className="muted">This version cites no sources.</p> : (
        <ol className="list sources" aria-labelledby="sources">
          {citations.map((c) => (
            <li key={c.ref} id={`source-${c.ref}`}>
              <strong>[{c.ref}]</strong>{" "}
              {c.source_kind === "web"
                ? <a href={c.url} target="_blank" rel="noopener noreferrer">{c.title}</a>
                : <Link href={`/c/${slug}/library/${c.source_document_id}`}>{c.title}</Link>}
              <span className="muted small"> · {c.source_kind === "web" ? new URL(c.url).hostname : "library"}</span>
              <p className="muted small" style={{ margin: "var(--s-1) 0 0" }}>“{c.excerpt.slice(0, 300)}{c.excerpt.length > 300 ? "…" : ""}”</p>
            </li>
          ))}
        </ol>
      )}

      {artifact.type === "launch_brief" && (
        <section aria-labelledby="review">
          <h2 id="review">Review notes</h2>
          {review ? <ReviewNotes content={review.content} current={artifact.current_version} /> : <p className="muted">No review yet.</p>}
        </section>
      )}
    </main>
  );
}

function ResearchNote({ content }: { content: ResearchNoteContent }) {
  return (
    <>
      <p>{content.summary}</p>
      <h2>Findings</h2>
      <ol className="list">{content.findings.map((f, i) => (
        <li key={i}>{f.claim} {f.sourceIds.map((s) => <a key={s} href={`#source-${s}`}>[{s}]</a>)} <span className="muted small">· confidence {f.confidence}</span></li>
      ))}</ol>
      <h2>Open questions</h2>
      {content.gaps.length ? <ul>{content.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p className="muted">None recorded.</p>}
    </>
  );
}

function ReviewNotes({ content, current }: { content: ReviewContent; current: number | null }) {
  return (
    <div className="stack">
      <p className="small muted">
        Ward (Sentinel) reviewed version {content.reviewedVersion}.
        {current !== null && current !== content.reviewedVersion && <strong> Review applies to version {content.reviewedVersion}; the brief is now version {current}.</strong>}
      </p>
      <p>{content.summary}</p>
      {content.findings.length === 0 ? <p className="muted">No findings.</p> : (
        <ul className="list">
          {content.findings.map((f, i) => (
            <li key={i} className="review-finding" data-sev={f.severity}>
              <span className="sev">{SEV[f.severity]}</span> · <span className="muted small">section: {f.sectionKey.replace("_", " ")}</span>
              <p style={{ margin: "var(--s-1) 0" }}>{f.issue}</p>
              <p className="muted small">{f.rationale}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted">Review notes help you check the work. They do not guarantee it is correct.</p>
    </div>
  );
}
