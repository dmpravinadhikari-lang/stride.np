import Link from "next/link";
import { notFound } from "next/navigation";
import { requireScope } from "@/lib/auth/current";
import { getDoc, latestReview, latestVersion, listVersions } from "@/modules/sop-studio/data";
import { removeSopDoc } from "@/modules/sop-studio/actions";
import { BASELINE_WARNINGS } from "@/modules/sop-studio/prompts";
import { country } from "@/lib/countries";
import { Card, Chip } from "@/components/ui";
import { SopWorkbench } from "./workbench";
import { RiskPanel } from "./risk-panel";
import { ReviewPanel } from "./review-panel";

export default async function SopDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scope } = await requireScope();
  const doc = getDoc(scope, id);
  if (!doc) notFound();

  const versions = listVersions(scope, id);
  const current = latestVersion(scope, id);
  const review = latestReview(scope, id);
  const c = country(doc.country);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/sop" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← All statements</Link>
          <h1 className="display mt-1.5 text-[26px]">{doc.title}</h1>
          <p className="mt-1.5 text-[14px] text-ink-2">
            {c.flag} {c.name} · {c.statement}
            {doc.university ? ` · ${doc.university}` : ""}
            {doc.course ? ` · ${doc.course}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {review && (
            <Chip tone={review.overall >= 70 ? "teal" : review.overall >= 50 ? "gold" : "danger"}>
              Scored {review.overall}/100
            </Chip>
          )}
          <form action={removeSopDoc}>
            <input type="hidden" name="id" value={doc.id} />
            <button type="submit" className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-danger-600">
              Delete
            </button>
          </form>
        </div>
      </header>

      <Card className="border-brand-200 bg-brand-50/60 p-5">
        <h2 className="h-tight text-[15px] text-brand-700">What {c.name} is assessing</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{c.statementNote}</p>
      </Card>

      {/* The risk panel is not conditional and cannot be dismissed away. It is
          shown whether or not a draft exists, because the decision to let the
          platform write full statements makes the warning part of the product. */}
      <RiskPanel warnings={BASELINE_WARNINGS} acknowledged={doc.acknowledged_risk === 1} docId={doc.id} />

      {/* Keyed on the newest version so a freshly generated draft actually
          replaces what is in the editor. Without this React keeps the old
          client state and the textarea stays empty. */}
      <SopWorkbench
        key={current?.id ?? "empty"}
        docId={doc.id}
        body={current?.body ?? ""}
        versions={versions.map((v) => ({
          id: v.id, no: v.version_no, source: v.source, words: v.word_count,
          note: v.note, at: v.created_at,
        }))}
        hasDraft={Boolean(current)}
      />

      {review && <ReviewPanel review={review} />}
    </div>
  );
}
