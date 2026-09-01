import { Chip, SeverityChip } from "@/components/ui";
import type { AnswerEvaluation } from "@/modules/ai-interview/types";

type T = {
  idx: number; question: string; intent: string | null; answer: string | null;
  score: number | null; isFollowup: boolean; evaluation: AnswerEvaluation | null;
};

type ScoreTone = "teal" | "gold" | "danger";
const scoreTone = (s: number): ScoreTone => (s >= 7 ? "teal" : s >= 5 ? "gold" : "danger");

export function Transcript({ turns }: { turns: T[] }) {
  const done = turns.filter((t) => t.answer);
  if (done.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="h-tight text-[17px]">Transcript</h2>
      {done.map((t) => (
        <details key={t.idx} className="group overflow-hidden rounded-2xl border border-line bg-panel">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-[11.5px] font-semibold text-muted">Q{t.idx}</span>
                {t.isFollowup && <Chip tone="brand">Follow-up</Chip>}
              </div>
              <p className="h-tight mt-1.5 text-[15px] leading-snug">{t.question}</p>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{t.answer}</p>
            </div>
            {t.score !== null && (
              <div className="shrink-0"><Chip tone={scoreTone(t.score)}>{t.score}/10</Chip></div>
            )}
          </summary>

          {t.evaluation && (
            <div className="border-t border-line bg-wash/40 px-5 py-4">
              {t.intent && (
                <p className="text-[12.5px] text-muted">
                  <span className="font-semibold">What it was testing:</span> {t.intent}
                </p>
              )}
              <p className="mt-2 text-[14px] font-semibold text-ink">{t.evaluation.verdict}</p>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {t.evaluation.strengths.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Worked</h4>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {t.evaluation.strengths.map((s, i) => (
                        <li key={i} className="text-[13px] leading-relaxed text-ink-2">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.evaluation.weaknesses.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-danger-600">Cost you marks</h4>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {t.evaluation.weaknesses.map((s, i) => (
                        <li key={i} className="text-[13px] leading-relaxed text-ink-2">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {t.evaluation.redFlags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SeverityChip severity="critical" />
                  {t.evaluation.redFlags.map((f, i) => (
                    <span key={i} className="text-[12.5px] font-medium text-danger-600">{f}</span>
                  ))}
                </div>
              )}

              {t.evaluation.modelAnswer && (
                <div className="mt-4 rounded-xl border border-teal-500/25 bg-teal-100/40 px-4 py-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">How to answer it</h4>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{t.evaluation.modelAnswer}</p>
                </div>
              )}
            </div>
          )}
        </details>
      ))}
    </section>
  );
}
