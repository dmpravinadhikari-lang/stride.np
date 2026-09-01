import { Card, Chip, Meter, ScoreRing, SeverityChip } from "@/components/ui";
import type { SopReview } from "@/modules/sop-studio/types";

export function ReviewPanel({ review }: { review: SopReview & { created_at: string } }) {
  const { overall, criteria, findings, integrity } = review;
  const criticals = findings.filter((f) => f.severity === "critical").length;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-wash/60 px-5 py-3">
        <h2 className="h-tight text-[15px]">Assessment</h2>
        <span className="text-[12px] text-muted">{new Date(review.created_at).toLocaleString()}</span>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-b border-line px-5 py-5">
        <ScoreRing score={overall} />
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap gap-2">
            <Chip tone={overall >= 70 ? "teal" : overall >= 50 ? "gold" : "danger"}>
              {overall >= 70 ? "Competitive" : overall >= 50 ? "Needs work" : "Would likely be refused"}
            </Chip>
            {criticals > 0 && <Chip tone="danger">{criticals} critical issue{criticals === 1 ? "" : "s"}</Chip>}
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
            Scored the way an assessor would score it, not the way a friend would. Fix the critical
            findings before anything else — they are the ones that end applications.
          </p>
        </div>
      </div>

      {criteria.length > 0 && (
        <div className="border-b border-line px-5 py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">By criterion</h3>
          <ul className="mt-3 flex flex-col gap-4">
            {criteria.map((c) => (
              <li key={c.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-semibold text-ink">{c.label}</span>
                  <span className="num text-[13px] text-muted">{c.score}/10</span>
                </div>
                <div className="mt-1.5">
                  <Meter value={c.score} max={10} tone={c.score >= 7 ? "teal" : c.score >= 5 ? "gold" : "danger"} />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {findings.length > 0 && (
        <div className="border-b border-line px-5 py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">What to fix</h3>
          <ul className="mt-3 flex flex-col gap-4">
            {findings.map((f, i) => (
              <li key={`${f.title}-${i}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityChip severity={f.severity} />
                  <span className="h-tight text-[14px]">{f.title}</span>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{f.detail}</p>
                {f.quote && (
                  <blockquote className="mt-2 border-l-2 border-line-2 pl-3 text-[13px] italic leading-relaxed text-muted">
                    “{f.quote}”
                  </blockquote>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-5 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Originality check</h3>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="min-w-[200px] flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[13.5px] font-semibold text-ink">Reads as machine-written</span>
              <span className="num text-[13px] text-muted">{integrity.aiLikelihood}%</span>
            </div>
            <div className="mt-1.5">
              <Meter
                value={integrity.aiLikelihood}
                tone={integrity.aiLikelihood >= 60 ? "danger" : integrity.aiLikelihood >= 30 ? "gold" : "teal"}
              />
            </div>
          </div>
          <Chip tone={integrity.clicheCount > 4 ? "danger" : integrity.clicheCount > 2 ? "gold" : "teal"}>
            {integrity.clicheCount} cliché{integrity.clicheCount === 1 ? "" : "s"}
          </Chip>
        </div>
        {integrity.notes.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {integrity.notes.map((n, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-ink-2">• {n}</li>
            ))}
          </ul>
        )}
        <p className="mt-4 rounded-xl bg-wash px-4 py-3 text-[12.5px] leading-relaxed text-muted">
          This is an estimate, not a verdict from any university's detector. Treat a high score as a
          reason to rewrite in your own voice, not as permission to submit if it happens to be low.
        </p>
      </div>
    </Card>
  );
}
