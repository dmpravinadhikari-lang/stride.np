import { Card, Chip, ScoreRing, SeverityChip } from "@/components/ui";
import { READINESS_LABEL, type InterviewReport } from "@/modules/ai-interview/types";

export function ReportPanel({ report }: { report: InterviewReport }) {
  const tone = report.readiness === "ready" ? "teal" : report.readiness === "nearly" ? "gold" : "danger";

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-wash/60 px-5 py-3">
        <h2 className="h-tight text-[15px]">Your report</h2>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-b border-line px-5 py-5">
        <ScoreRing score={report.overall} size={110} />
        <div className="min-w-[240px] flex-1">
          <Chip tone={tone}>{READINESS_LABEL[report.readiness]}</Chip>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink">{report.verdict}</p>
        </div>
      </div>

      {report.strengths.length > 0 && (
        <div className="border-b border-line px-5 py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">What held up</h3>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-[13.5px] leading-relaxed text-ink-2">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {report.risks.length > 0 && (
        <div className="border-b border-line px-5 py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">What would sink you</h3>
          <ul className="mt-3 flex flex-col gap-4">
            {report.risks.map((r, i) => (
              <li key={i}>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityChip severity={r.severity} />
                  <span className="h-tight text-[14px]">{r.title}</span>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{r.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.nextSteps.length > 0 && (
        <div className="px-5 py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Do this next</h3>
          <ol className="mt-2.5 flex flex-col gap-2">
            {report.nextSteps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
                <span className="num shrink-0 font-semibold text-brand-600">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
