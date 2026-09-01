import { Card, Chip, Meter } from "@/components/ui";
import { bandTone, showBand } from "@/modules/mock-tests/bands";
import type { CriterionScore, SpeakingScore, WritingScore } from "@/modules/mock-tests/types";

function Criteria({ criteria }: { criteria: CriterionScore[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {criteria.map((c) => {
        const notAssessed = c.band === 0;
        return (
          <li key={c.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold text-ink">{c.label}</span>
              <span className="num text-[13px] text-muted">{notAssessed ? "not assessed" : showBand(c.band)}</span>
            </div>
            {!notAssessed && (
              <div className="mt-1.5"><Meter value={c.band * 10} max={90} tone={bandTone(c.band)} /></div>
            )}
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.comment}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function WritingFeedback({ scores }: { scores: WritingScore[] }) {
  if (!scores.length) return null;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-wash/60 px-5 py-3">
        <h2 className="h-tight text-[15px]">Writing — marked</h2>
      </div>
      {scores.map((score, i) => (
        <div key={i} className="border-b border-line px-5 py-5 last:border-0">
          <div className="flex flex-wrap items-center gap-3">
            <Chip tone="brand">Task {i + 1}</Chip>
            <Chip tone={bandTone(score.band)}>Band {showBand(score.band)}</Chip>
            {i === 1 && <span className="text-[12px] text-muted">counts double</span>}
          </div>
          {score.summary && <p className="mt-3 text-[14px] leading-relaxed text-ink">{score.summary}</p>}

          {score.criteria.length > 0 && <div className="mt-4"><Criteria criteria={score.criteria} /></div>}

          {score.annotations.length > 0 && (
            <div className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">In your own words</h3>
              <ul className="mt-2.5 flex flex-col gap-3">
                {score.annotations.map((a, j) => (
                  <li key={j} className="rounded-xl border border-line bg-wash/50 px-4 py-3">
                    <blockquote className="border-l-2 border-danger-600/40 pl-3 text-[13.5px] italic leading-relaxed text-ink-2">
                      “{a.quote}”
                    </blockquote>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{a.issue}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-teal-700">→ {a.fix}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.fixFirst.length > 0 && (
            <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Fix this first</h3>
              <ol className="mt-1.5 flex flex-col gap-1.5">
                {score.fixFirst.map((f, j) => (
                  <li key={j} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
                    <span className="num font-semibold text-brand-600">{j + 1}</span>{f}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

export function SpeakingFeedback({ score }: { score: SpeakingScore | null }) {
  if (!score) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-wash/60 px-5 py-3">
        <h2 className="h-tight text-[15px]">Speaking — marked</h2>
        <Chip tone={bandTone(score.band)}>Band {showBand(score.band)}</Chip>
      </div>
      <div className="px-5 py-5">
        {score.summary && <p className="text-[14px] leading-relaxed text-ink">{score.summary}</p>}
        {score.criteria.length > 0 && <div className="mt-4"><Criteria criteria={score.criteria} /></div>}

        {score.perAnswer.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Answer by answer</h3>
            <ul className="mt-2.5 flex flex-col gap-2">
              {score.perAnswer.map((a) => (
                <li key={a.idx} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
                  <span className="num shrink-0 font-semibold text-brand-600">Q{a.idx}</span>{a.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {score.fixFirst.length > 0 && (
          <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Fix this first</h3>
            <ol className="mt-1.5 flex flex-col gap-1.5">
              {score.fixFirst.map((f, j) => (
                <li key={j} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  <span className="num font-semibold text-brand-600">{j + 1}</span>{f}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}
