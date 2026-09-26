import Link from "next/link";
import { Card, Chip, type Tone } from "@/components/ui";
import { PHASES } from "@/modules/checklist/steps";
import { STATE_LABEL, type Scheduled } from "@/modules/checklist/schedule";
import { toggleStep } from "@/modules/checklist/actions";

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ", ";

/**
 * One timeline, shared by the signed-in checklist and the public one. The only
 * difference is whether the tick boxes are there. The plan itself is identical,
 * which is the point of showing it away for free.
 */
export function Timeline({
  schedule, studentId, interactive,
}: { schedule: Scheduled[]; studentId?: string; interactive: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {PHASES.map((phase) => {
        const rows = schedule.filter((s) => s.step.phase === phase);
        if (!rows.length) return null;
        const done = rows.filter((r) => r.state === "done").length;

        return (
          <Card key={phase} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-wash/60 px-5 py-3">
              <h2 className="h-tight text-[15px]">{phase}</h2>
              <span className="num text-[12px] text-muted">{done} / {rows.length}</span>
            </div>

            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const s = STATE_LABEL[r.state];
                const isDone = r.state === "done";
                return (
                  <li key={r.step.id} className={`px-5 py-4 ${isDone ? "bg-wash/30" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[14.5px] font-semibold ${isDone ? "text-muted line-through" : "text-ink"}`}>
                            {r.step.title}
                          </span>
                          <Chip tone={s.tone as Tone}>{s.label}</Chip>
                          {r.daysLeft !== null && !isDone && (
                            <span className={`num text-[12px] ${r.daysLeft < 0 ? "font-semibold text-danger-600" : "text-muted"}`}>
                              {r.daysLeft < 0 ? `${Math.abs(r.daysLeft)} days late` : `${r.daysLeft} days`}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{r.step.detail}</p>

                        {r.dueOn && (
                          <p className="mt-1.5 text-[12.5px] text-ink-2">
                            <span className="font-semibold">Finish by {fmt(r.dueOn)}</span>
                            {r.startBy && r.step.takesDays > 2 && <> · start by {fmt(r.startBy)}, it takes about {r.step.takesDays} days</>}
                          </p>
                        )}

                        {r.step.warning && !isDone && (
                          <p className="mt-2 rounded-lg border border-gold-600/25 bg-gold-100/50 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
                            {r.step.warning}
                          </p>
                        )}

                        {r.step.href && (
                          <Link href={r.step.href} className="mt-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-brand-600 hover:underline sm:min-h-0">
                            Do this in Stride →
                          </Link>
                        )}
                      </div>

                      {interactive && studentId && (
                        <form action={toggleStep} className="flex w-full shrink-0 gap-2 sm:w-auto sm:gap-1.5">
                          <input type="hidden" name="student_id" value={studentId} />
                          <input type="hidden" name="step_id" value={r.step.id} />
                          {isDone ? (
                            <button type="submit" name="status" value="todo"
                              className="min-h-11 flex-1 rounded-lg border border-line px-3 text-[13px] font-semibold text-muted hover:border-line-2 sm:min-h-0 sm:flex-none sm:px-2.5 sm:py-1.5 sm:text-[12px]">
                              Undo
                            </button>
                          ) : (
                            <>
                              <button type="submit" name="status" value="done"
                                className="min-h-11 flex-1 rounded-lg bg-teal-100 px-3 text-[13px] font-semibold text-teal-700 hover:bg-teal-100/70 sm:min-h-0 sm:flex-none sm:px-2.5 sm:py-1.5 sm:text-[12px]">
                                Done
                              </button>
                              <button type="submit" name="status" value="skipped"
                                className="min-h-11 flex-1 rounded-lg border border-line px-3 text-[13px] font-semibold text-muted hover:text-ink sm:min-h-0 sm:flex-none sm:border-0 sm:px-2.5 sm:py-1.5 sm:text-[12px]">
                                Not for me
                              </button>
                            </>
                          )}
                        </form>
                      )}
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
