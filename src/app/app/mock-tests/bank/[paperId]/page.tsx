import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current";
import {
  answersOf, flaggedCount, getPaper, optionsOf, paperQuestionCount,
  questionsOf, reviewsFor, sectionsOf, SECTION_LABEL, type SectionKind,
} from "@/modules/mock-tests/data";
import { reviewQuestion, setStatus } from "@/modules/mock-tests/actions";
import { Card, Chip, StatTile } from "@/components/ui";

export const metadata = { title: "Question bank review — STRIDE" };

export default async function BankReviewPage({
  params,
}: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const paper = getPaper(paperId);
  if (!paper) notFound();

  const sections = sectionsOf(paperId);
  const reviews = reviewsFor(paperId);
  const reviewed = new Set(reviews.map((r) => r.question_id).filter(Boolean));
  const flagged = flaggedCount(paperId);
  const total = paperQuestionCount(paperId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/mock-tests" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← Mocks</Link>
          <h1 className="display mt-1.5 text-[26px]">{paper.title}</h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
            Written by the system, corrected by you. Every note here is kept against the question, so
            the bank gets better with each paper instead of freezing at whatever the first draft was.
          </p>
        </div>
        {user.role === "super_admin" && (
          <form action={setStatus} className="flex items-center gap-2">
            <input type="hidden" name="paper_id" value={paper.id} />
            <input type="hidden" name="status" value={paper.status === "published" ? "in_review" : "published"} />
            <button
              type="submit"
              className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
                paper.status === "published"
                  ? "border border-line-2 bg-white text-ink-2 hover:border-danger-600/40 hover:text-danger-600"
                  : "bg-brand-500 text-white hover:bg-brand-600"}`}
            >
              {paper.status === "published" ? "Unpublish" : "Publish to students"}
            </button>
          </form>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Status" value={paper.status === "published" ? "Live" : "In review"} tone={paper.status === "published" ? "teal" : "gold"} sub={paper.origin === "ai" ? "AI written" : "Trainer written"} />
        <StatTile label="Questions" value={total} sub={`${sections.length} sections`} />
        <StatTile label="Reviewed" value={`${reviewed.size} / ${total}`} sub="at least one verdict" tone={reviewed.size === total ? "teal" : "grey"} />
        <StatTile label="Needs work" value={flagged} sub="flagged by a trainer" tone={flagged > 0 ? "danger" : "teal"} />
      </div>

      {sections.map((section) => {
        const questions = questionsOf(section.id);
        return (
          <Card key={section.id} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-wash/60 px-5 py-3">
              <h2 className="h-tight text-[15px]">{section.title}</h2>
              <Chip tone="grey">{SECTION_LABEL[section.kind as SectionKind]}</Chip>
            </div>

            <ul className="divide-y divide-line">
              {questions.map((q) => {
                const accepted = answersOf(q);
                const opts = optionsOf(q);
                const myReviews = reviews.filter((r) => r.question_id === q.id);
                return (
                  <li key={q.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="num mt-0.5 shrink-0 text-[12px] font-semibold text-brand-600">{q.idx}</span>
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{q.prompt}</p>

                        {opts.length > 0 && (
                          <ul className="mt-2 flex flex-col gap-1">
                            {opts.map((o) => (
                              <li key={o} className={`text-[13px] ${accepted.includes(o) ? "font-semibold text-teal-700" : "text-muted"}`}>
                                {accepted.includes(o) ? "✓ " : "· "}{o}
                              </li>
                            ))}
                          </ul>
                        )}

                        {opts.length === 0 && accepted.length > 0 && (
                          <p className="mt-2 text-[13px] text-teal-700">
                            <span className="font-semibold">Accepted:</span> {accepted.join("  /  ")}
                          </p>
                        )}

                        {q.guidance && (
                          <p className="mt-2 rounded-lg bg-wash px-3 py-2 text-[12.5px] leading-relaxed text-muted">
                            {q.guidance}
                          </p>
                        )}

                        {myReviews.length > 0 && (
                          <ul className="mt-2.5 flex flex-col gap-1.5">
                            {myReviews.map((r) => (
                              <li key={r.id} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                                <Chip tone={r.verdict === "approve" ? "teal" : r.verdict === "fix" ? "gold" : "danger"}>
                                  {r.verdict}
                                </Chip>
                                <span className="text-ink-2">{r.note}</span>
                                <span className="text-muted">— {r.reviewer}, {new Date(r.created_at).toLocaleDateString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <form action={reviewQuestion} className="mt-3 flex flex-wrap items-center gap-2">
                          <input type="hidden" name="paper_id" value={paper.id} />
                          <input type="hidden" name="question_id" value={q.id} />
                          <input
                            name="note" placeholder="What needs changing, and why?"
                            className="min-w-[200px] flex-1 rounded-lg border border-line-2 px-3 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none"
                          />
                          {(["approve", "fix", "reject"] as const).map((v) => (
                            <button
                              key={v} type="submit" name="verdict" value={v}
                              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
                                v === "approve" ? "bg-teal-100 text-teal-700 hover:bg-teal-100/70"
                                : v === "fix" ? "bg-gold-100 text-gold-600 hover:bg-gold-100/70"
                                : "bg-danger-100 text-danger-600 hover:bg-danger-100/70"}`}
                            >
                              {v === "approve" ? "Approve" : v === "fix" ? "Needs fixing" : "Reject"}
                            </button>
                          ))}
                        </form>
                      </div>

                      {q.flagged === 1 && <Chip tone="danger">Flagged</Chip>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
