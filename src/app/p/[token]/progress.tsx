import { Logo } from "@/components/Logo";
import { Card, Chip, Meter } from "@/components/ui";
import { npr } from "@/lib/terms";
import { showBand } from "@/modules/mock-tests/bands";
import type { ParentSummary } from "@/modules/parents/summary";

/**
 * The page a parent actually reads.
 *
 * Written for someone who is not applying, does not know the jargon, and mainly
 * wants to know two things: is it going well, and what will it cost. Money is
 * in lakh because that is how the person paying thinks about it.
 */
export function ProgressPage({
  summary: s, greetingName, relation,
}: { summary: ParentSummary; greetingName: string; relation: string }) {
  const firstName = s.studentName.split(" ")[0];

  return (
    <main className="min-h-screen bg-canvas">
      <header className="wash border-b border-line">
        <div className="mx-auto max-w-2xl px-5 py-8">
          <div className="flex items-center justify-between gap-4">
            <Logo href="#" />
            <Chip tone="grey">{relation}</Chip>
          </div>
          <h1 className="display mt-6 text-[30px]">
            {firstName}'s application
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            Namaste {greetingName.split(" ")[0]}. This page is prepared for you by {s.consultancy}
            {s.counsellor ? `, and ${firstName}'s counsellor is ${s.counsellor}` : ""}. It updates
            on its own, come back to it any time.
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-8">
        {/* ------------------------------------------------------ where it is */}
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">Right now</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <span className="h-tight text-[24px]">{s.stage.label}</span>
            {s.destination && <Chip tone="brand">{s.destination.flag} {s.destination.name}</Chip>}
          </div>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{s.stage.blurb}</p>
          {(s.course || s.intake) && (
            <p className="mt-3 border-t border-line pt-3 text-[14px] text-ink-2">
              {s.course && <><strong className="font-semibold text-ink">Course:</strong> {s.course}<br /></>}
              {s.intake && <><strong className="font-semibold text-ink">Starting:</strong> {s.intake}<br /></>}
              {s.destination && <><strong className="font-semibold text-ink">Visa:</strong> {s.destination.visa}</>}
            </p>
          )}
        </Card>

        {s.nextAction && (
          <Card className="border-brand-200 bg-brand-50/60 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-600">What happens next</div>
            <p className="mt-1.5 text-[16px] font-semibold text-ink">{s.nextAction.what}</p>
            {s.nextAction.due && (
              <p className="mt-1 text-[13px] text-ink-2">By {new Date(s.nextAction.due).toLocaleDateString()}</p>
            )}
          </Card>
        )}

        {/* ------------------------------------------------------------ money */}
        {s.money && (
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-wash/60 px-5 py-3">
              <h2 className="h-tight text-[15px]">What it will cost</h2>
            </div>
            <div className="divide-y divide-line">
              <div className="px-5 py-4">
                <div className="text-[13px] text-muted">Before {firstName} flies</div>
                <div className="num mt-1 text-[26px] font-semibold text-ink">{npr(s.money.beforeYouFlyNpr)}</div>
                <p className="mt-1 text-[12.5px] text-muted">
                  First year tuition, visa, insurance, flight and the first few months of living costs.
                </p>
              </div>
              <div className="px-5 py-4">
                <div className="text-[13px] text-muted">The whole course</div>
                <div className="num mt-1 text-[26px] font-semibold text-ink">{npr(s.money.wholeCourseNpr)}</div>
              </div>
              <div className="bg-gold-100/40 px-5 py-4">
                <div className="text-[13px] font-semibold text-gold-600">The balance the embassy asks to see</div>
                <div className="num mt-1 text-[26px] font-semibold text-ink">{npr(s.money.mustShowNpr)}</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                  {s.money.mustShowFormula}. This is money that must be visible in the bank, not
                  money that gets spent immediately.
                </p>
              </div>
            </div>
            <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">
              Planning estimates based on typical figures for this destination. The exact tuition
              comes from the offer letter. Confirm everything with {s.consultancy} before paying.
            </p>
          </Card>
        )}

        {/* --------------------------------------------------------- progress */}
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">How the preparation is going</h2>
          </div>
          <div className="divide-y divide-line">
            <div className="px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-ink">Paperwork collected</span>
                <span className="num text-[13px] text-muted">{s.documents.held} of {s.documents.needed}</span>
              </div>
              <div className="mt-2">
                <Meter value={s.documents.held} max={s.documents.needed || 1}
                  tone={s.documents.held === s.documents.needed ? "teal" : "brand"} />
              </div>
              {s.documents.stillNeeded.length > 0 && (
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                  <strong className="font-semibold text-ink">Still needed:</strong>{" "}
                  {s.documents.stillNeeded.slice(0, 6).join(", ")}
                  {s.documents.stillNeeded.length > 6 && `, and ${s.documents.stillNeeded.length - 6} more`}.
                  {" "}Some of these come from the bank and take time, worth starting early.
                </p>
              )}
            </div>

            <div className="px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-ink">English test practice</span>
                <span className="num text-[13px] text-muted">
                  {s.english.bestMock ? `Band ${showBand(s.english.bestMock)}` : "No full mock yet"}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                {s.english.bestMock
                  ? s.english.bestMock >= 6.5
                    ? "That is at or above what most courses ask for."
                    : "Below what most courses ask for. More practice needed before booking the real test."
                  : "Practice tests are available and free to take. The band here is practice, not an official result."}
                {s.english.claimed ? ` Recorded official score: ${s.english.claimed}.` : ""}
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-ink">Interview practice</span>
                <span className="num text-[13px] text-muted">
                  {s.interview.runs === 0 ? "Not started" : `${s.interview.runs} run`}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                {s.interview.best !== null
                  ? `Best score ${s.interview.best} out of 100. The questions are the ones a real visa officer asks.`
                  : "Not attempted yet. This is worth pushing. The interview is where most applications are lost."}
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-ink">Their file with the consultancy</span>
                <span className="num text-[13px] text-muted">{s.profilePct}% complete</span>
              </div>
              <div className="mt-2"><Meter value={s.profilePct} tone={s.profilePct === 100 ? "teal" : "gold"} /></div>
            </div>
          </div>
        </Card>

        {/* --------------------------------------------------------- contact */}
        <Card className="p-5">
          <h2 className="h-tight text-[15px]">Questions?</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
            Speak to {s.counsellor ?? `${s.consultancy}`}
            {s.counsellorPhone ? ` on ${s.counsellorPhone}` : ""}. They know this file.
          </p>
        </Card>

        <p className="pb-6 text-center text-[12px] leading-relaxed text-muted">
          This page shows progress and cost only. {firstName}'s documents, statement and interview
          answers are private to them and are not shown here. Please do not forward this link.
        </p>
      </div>
    </main>
  );
}
