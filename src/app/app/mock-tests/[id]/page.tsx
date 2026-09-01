import Link from "next/link";
import { notFound } from "next/navigation";
import { requireScope } from "@/lib/auth/current";
import { readJson } from "@/lib/db";
import {
  attemptSections, getAttempt, getPaper, getSection,
  SECTION_LABEL, type SectionKind,
} from "@/modules/mock-tests/data";
import { beginSection, removeMockAttempt } from "@/modules/mock-tests/actions";
import { bandMeaning, bandTone, showBand } from "@/modules/mock-tests/bands";
import type { AttemptReport, SpeakingScore, WritingScore } from "@/modules/mock-tests/types";
import { Button, Card, Chip, Meter } from "@/components/ui";
import { WritingFeedback, SpeakingFeedback } from "./feedback";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scope } = await requireScope();
  const attempt = getAttempt(scope, id);
  if (!attempt) notFound();

  const paper = getPaper(attempt.paper_id);
  const rows = attemptSections(scope, id);
  const done = attempt.status === "complete";
  const report = done ? readJson<AttemptReport>(attempt.report, { summary: "", strengths: [], drills: [] }) : null;
  const next = rows.find((r) => r.status !== "done");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/mock-tests" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← All mocks</Link>
          <h1 className="display mt-1.5 text-[26px]">{paper?.title}</h1>
          <p className="mt-1.5 text-[14px] text-ink-2">
            {attempt.mode === "full" ? "Full mock" : `${SECTION_LABEL[attempt.only_kind as SectionKind]} practice`}
            {" · started "}{new Date(attempt.started_at).toLocaleString()}
          </p>
        </div>
        <form action={removeMockAttempt}>
          <input type="hidden" name="id" value={attempt.id} />
          <button type="submit" className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-danger-600">Delete</button>
        </form>
      </header>

      {done && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-6 border-b border-line px-5 py-6">
            <div className="text-center">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-muted">
                {attempt.mode === "full" ? "Overall band" : `${SECTION_LABEL[attempt.only_kind as SectionKind]} band`}
              </div>
              <div className={`num mt-1 text-[52px] font-semibold leading-none ${
                attempt.overall_band && attempt.overall_band >= 7 ? "text-teal-700"
                : attempt.overall_band && attempt.overall_band >= 6 ? "text-gold-600" : "text-danger-600"}`}>
                {showBand(attempt.overall_band)}
              </div>
            </div>
            <div className="min-w-[240px] flex-1">
              {/* A single skill's band says nothing about whether a course would
                  accept you, so that reading is only offered on a full mock. */}
              <p className="text-[14.5px] font-semibold text-ink">
                {attempt.mode === "full" && attempt.overall_band !== null
                  ? bandMeaning(attempt.overall_band)
                  : `Your ${SECTION_LABEL[attempt.only_kind as SectionKind].toLowerCase()} band on this paper. Sit the full mock for an overall band.`}
              </p>
              {report?.summary && (
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{report.summary}</p>
              )}
            </div>
          </div>

          <div className="grid gap-px bg-line sm:grid-cols-4">
            {rows.map((r) => (
              <div key={r.id} className="bg-panel px-5 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {SECTION_LABEL[r.kind]}
                </div>
                <div className="num mt-1 text-2xl font-semibold text-ink">{showBand(r.band)}</div>
                {r.max_score !== null && (
                  <div className="num mt-0.5 text-[12px] text-muted">{r.raw_score} / {r.max_score} correct</div>
                )}
                <div className="mt-2"><Meter value={(r.band ?? 0) * 10} max={90} tone={bandTone(r.band)} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!done && (
        <Card className="p-5">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-ink">Progress</span>
            <span className="num text-muted">{rows.filter((r) => r.status === "done").length} / {rows.length} sections</span>
          </div>
          <div className="mt-2">
            <Meter value={rows.filter((r) => r.status === "done").length} max={rows.length} />
          </div>
        </Card>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="h-tight text-[17px]">Sections</h2>
        {rows.map((r) => {
          const section = getSection(r.section_id);
          const isNext = next?.id === r.id;
          return (
            <div key={r.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5 ${
              isNext ? "border-brand-400 bg-brand-50/50" : "border-line bg-panel"}`}>
              <div className="min-w-0">
                <div className="text-[14.5px] font-semibold text-ink">{section?.title}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  {Math.round((section?.seconds ?? 0) / 60)} minutes ·{" "}
                  {r.kind === "listening" || r.kind === "reading" ? "marked instantly" : "AI scored against the official criteria"}
                </div>
              </div>
              {r.status === "done" ? (
                <Chip tone={bandTone(r.band)}>Band {showBand(r.band)}</Chip>
              ) : (
                <form action={beginSection}>
                  <input type="hidden" name="attempt_id" value={attempt.id} />
                  <input type="hidden" name="section_id" value={r.section_id} />
                  <Button type="submit" size="sm" variant={isNext ? "primary" : "secondary"}>
                    {r.status === "in_progress" ? "Resume" : "Start"}
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </section>

      {done && rows.map((r) => {
        if (r.kind === "writing" && r.feedback) {
          return <WritingFeedback key={r.id} scores={readJson<WritingScore[]>(r.feedback, [])} />;
        }
        if (r.kind === "speaking" && r.feedback) {
          return <SpeakingFeedback key={r.id} score={readJson<SpeakingScore>(r.feedback, null as never)} />;
        }
        return null;
      })}

      {report && report.drills.length > 0 && (
        <Card className="p-5">
          <h2 className="h-tight text-[16px]">What to practise next</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {report.drills.map((d, i) => (
              <li key={i} className="flex gap-3">
                <Chip tone="brand">{d.skill}</Chip>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{d.title}</div>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{d.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {report && report.strengths.length > 0 && (
        <Card className="p-5">
          <h2 className="h-tight text-[16px]">What's already working</h2>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-[13.5px] leading-relaxed text-ink-2">• {s}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
