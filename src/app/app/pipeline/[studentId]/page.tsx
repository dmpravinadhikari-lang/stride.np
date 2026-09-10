import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, scopeOf } from "@/lib/auth/current";
import {
  counsellorsOf, getPipelineRow, interviewsOfStudent, mocksOfStudent,
  notesFor, profileOfStudent, sopsOfStudent,
} from "@/modules/pipeline/data";
import { setStage, assignCounsellor, setNextAction, postNote } from "@/modules/pipeline/actions";
import { STAGE_IDS, stageOf } from "@/modules/pipeline/stages";
import { country, INTERVIEW_KINDS } from "@/lib/countries";
import { showBand, bandTone } from "@/modules/mock-tests/bands";
import { npr } from "@/lib/terms";
import { FUNDING_LABEL, LEVEL_LABEL, label, profileCompleteness, type StudentProfile } from "@/lib/profile";
import { Button, Card, Chip, inputClass, Meter, type Tone } from "@/components/ui";
import { Timeline } from "@/components/Timeline";
import { activityFor } from "@/lib/crm/activity";
import { entitlementsFor } from "@/lib/modules/entitlements";
import { readinessFor, weeklyStreak } from "@/lib/gamify/readiness";
import { applicationsFor, statusOf, APPLICATION_STATUSES } from "@/modules/partners/applications";
import { addApplication, moveApplication } from "@/modules/partners/actions";
import { setStudentModule } from "@/modules/pipeline/module-actions";

export default async function StudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);

  const row = getPipelineRow(scope, studentId);
  if (!row) notFound();

  const profile = profileOfStudent(scope, studentId) as StudentProfile | null;
  const completeness = profileCompleteness(profile);
  const sops = sopsOfStudent(scope, studentId);
  const interviews = interviewsOfStudent(scope, studentId);
  const mocks = mocksOfStudent(scope, studentId);
  const notes = notesFor(scope, studentId);
  const activity = activityFor(scope, studentId);
  const apps = applicationsFor(scope, studentId);
  const readiness = readinessFor(studentId, scope.tenantId);
  const streak = weeklyStreak(studentId);
  const entitlements = entitlementsFor(studentId, scope.tenantId, user.tenantPlan).filter((e) => e.mod.perStudent);
  const counsellors = counsellorsOf(scope.tenantId);
  const s = stageOf(row.stage);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/app/pipeline" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← Pipeline</Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <h1 className="display text-[26px]">{row.full_name}</h1>
          <Chip tone={s.tone as Tone}>{s.label}</Chip>
        </div>
        <p className="mt-1.5 text-[14px] text-ink-2">
          {row.email}{row.phone ? ` · ${row.phone}` : ""}
          {row.source ? ` · ${row.source}` : ""}
        </p>
      </header>

      {/* --------------------------------------------------- consultancy side */}
      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Where they are</h2>
        <form action={setStage} className="mt-3 flex flex-wrap gap-1.5">
          <input type="hidden" name="student_id" value={studentId} />
          {STAGE_IDS.map((id) => {
            const st = stageOf(id);
            const current = row.stage === id;
            return (
              <button
                key={id} type="submit" name="stage" value={id} disabled={current}
                title={st.blurb}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  current
                    ? "cursor-default border-brand-400 bg-brand-50 text-brand-700"
                    : "border-line text-ink-2 hover:border-brand-400 hover:text-brand-600"}`}
              >
                {st.label}
              </button>
            );
          })}
        </form>
        <p className="mt-2 text-[12.5px] text-muted">{s.blurb}</p>

        <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <form action={assignCounsellor} className="flex flex-col gap-2">
            <input type="hidden" name="student_id" value={studentId} />
            <label className="text-[13px] font-semibold text-ink" htmlFor="counsellor_id">Counsellor</label>
            <div className="flex gap-2">
              <select id="counsellor_id" name="counsellor_id" defaultValue={row.counsellor_id ?? ""} className={inputClass}>
                <option value="">Unassigned</option>
                {counsellors.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <Button type="submit" variant="secondary" size="sm">Save</Button>
            </div>
          </form>

          <form action={setNextAction} className="flex flex-col gap-2">
            <input type="hidden" name="student_id" value={studentId} />
            <label className="text-[13px] font-semibold text-ink" htmlFor="next_action">Next action</label>
            <input id="next_action" name="next_action" defaultValue={row.next_action ?? ""} className={inputClass} placeholder="Chase bank balance certificate" />
            <div className="flex gap-2">
              <input type="date" name="next_action_due" defaultValue={row.next_action_due?.slice(0, 10) ?? ""} className={inputClass} />
              <Button type="submit" variant="secondary" size="sm">Save</Button>
            </div>
          </form>
        </div>
      </Card>

      {/* ------------------------------------------------------ their practice */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Best full mock</div>
          <div className={`num mt-1 text-2xl font-semibold ${row.best_mock && row.best_mock >= 7 ? "text-teal-700" : "text-ink"}`}>
            {row.best_mock ? showBand(row.best_mock) : ", "}
          </div>
          <div className="mt-0.5 text-[12px] text-muted">
            {row.english_test ? `Claimed ${row.english_test.toUpperCase()} ${row.english_score ?? ""}` : "No real test yet"}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-panel px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Best interview</div>
          <div className="num mt-1 text-2xl font-semibold text-ink">{row.best_interview ?? ", "}</div>
          <div className="mt-0.5 text-[12px] text-muted">{interviews.length} run</div>
        </div>
        <div className="rounded-2xl border border-line bg-panel px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Profile complete</div>
          <div className="num mt-1 text-2xl font-semibold text-ink">{completeness.pct}%</div>
          <div className="mt-1.5"><Meter value={completeness.pct} tone={completeness.pct === 100 ? "teal" : "gold"} /></div>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="h-tight text-[16px]">Their file</h2>
          <Link href={`/app/documents/${studentId}`} className="text-[12.5px] font-semibold text-brand-600 hover:underline">
            Open their document vault →
          </Link>
        </div>
        {profile ? (
          <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {([
              ["Going to", profile.target_country ? `${country(profile.target_country).flag} ${country(profile.target_country).name}` : null],
              ["Level", label(LEVEL_LABEL, profile.study_level)],
              ["Course", profile.intended_course],
              ["Intake", profile.target_intake],
              ["Last qualification", profile.last_qualification],
              ["Result", profile.last_gpa],
              ["Study gap", profile.study_gap_years === null ? null : `${profile.study_gap_years} year(s)`],
              ["Work experience", profile.work_experience],
              ["Budget", profile.budget_npr ? npr(profile.budget_npr) : null],
              ["Funding", label(FUNDING_LABEL, profile.funding_source)],
              ["Sponsor", profile.sponsor_relation ? `${profile.sponsor_relation}${profile.sponsor_occupation ? `, ${profile.sponsor_occupation}` : ""}` : null],
              ["Sponsor income", profile.sponsor_income_npr ? npr(profile.sponsor_income_npr) : null],
              ["Ties to Nepal", profile.ties_to_nepal],
              ["Career plan", profile.career_plan],
            ] as Array<[string, string | null | undefined]>).map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-line pb-2 last:border-0">
                <dt className="w-36 shrink-0 text-[12.5px] text-muted">{k}</dt>
                <dd className={`text-[13.5px] ${v ? "text-ink-2" : "text-gold-600"}`}>{v || "not filled in"}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="mt-2 text-[13.5px] text-muted">No profile yet.</p>}
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="h-tight text-[15px]">Mock tests</h3>
          {mocks.length === 0 ? <p className="mt-2 text-[13px] text-muted">None sat.</p> : (
            <ul className="mt-3 flex flex-col gap-2">
              {mocks.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate text-ink-2">
                    {m.mode === "full" ? "Full mock" : `${m.only_kind} only`}
                    <span className="block text-[11.5px] text-muted">{new Date(m.started_at).toLocaleDateString()}</span>
                  </span>
                  {m.status === "complete"
                    ? <Chip tone={bandTone(m.overall_band)}>{showBand(m.overall_band)}</Chip>
                    : <Chip tone="grey">open</Chip>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="h-tight text-[15px]">Mock interviews</h3>
          {interviews.length === 0 ? <p className="mt-2 text-[13px] text-muted">None run.</p> : (
            <ul className="mt-3 flex flex-col gap-2">
              {interviews.map((i) => {
                let overall: number | null = null;
                try { overall = i.report ? (JSON.parse(i.report) as { overall?: number }).overall ?? null : null; } catch { /* ignore */ }
                return (
                  <li key={i.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate text-ink-2">
                      {INTERVIEW_KINDS[i.kind as keyof typeof INTERVIEW_KINDS]?.label ?? i.kind}
                      <span className="block text-[11.5px] text-muted">{new Date(i.started_at).toLocaleDateString()}</span>
                    </span>
                    {overall !== null
                      ? <Chip tone={overall >= 70 ? "teal" : overall >= 50 ? "gold" : "danger"}>{overall}</Chip>
                      : <Chip tone="grey">open</Chip>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="h-tight text-[15px]">Statements</h3>
          {sops.length === 0 ? <p className="mt-2 text-[13px] text-muted">None written.</p> : (
            <ul className="mt-3 flex flex-col gap-2">
              {sops.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate text-ink-2">
                    {d.title}
                    <span className="block text-[11.5px] text-muted">{country(d.country).name}</span>
                  </span>
                  {d.score !== null
                    ? <Chip tone={d.score >= 70 ? "teal" : d.score >= 50 ? "gold" : "danger"}>{d.score}</Chip>
                    : <Chip tone="grey">unscored</Chip>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------- notes */}
      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Notes</h2>
        <form action={postNote} className="mt-3 flex gap-2">
          <input type="hidden" name="student_id" value={studentId} />
          <input name="body" className={inputClass} placeholder="Called about the sponsor's tax clearance, father bringing it Sunday." />
          <Button type="submit" variant="secondary" size="sm">Add</Button>
        </form>

        {notes.length > 0 && (
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3 py-2.5">
                {n.kind === "stage_change" && <Chip tone="grey">stage</Chip>}
                <div className="min-w-0">
                  <p className="text-[13.5px] leading-relaxed text-ink-2">{n.body}</p>
                  <p className="text-[11.5px] text-muted">{n.author} · {new Date(n.created_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ----------------------------------------------------- applications */}
      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-tight text-[16px]">Applications</h2>
          <span className="text-[12px] text-muted">
            {apps.length === 0 ? "none yet" : `${apps.length} to ${apps.length === 1 ? "one institution" : "different institutions"}`}
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Each one moves on its own timetable, so each has its own status. The stage above is the
          summary of these.
        </p>

        {apps.length > 0 && (
          <ul className="mt-4 divide-y divide-line">
            {apps.map((a) => {
              const st = statusOf(a.status);
              return (
                <li key={a.id} className="flex flex-wrap items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-ink">{a.institution}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {[a.course, a.intake, a.destination].filter(Boolean).join(" · ") || "No course recorded"}
                      {a.deadline ? ` · due ${a.deadline}` : ""}
                    </div>
                  </div>
                  <form action={moveApplication} className="flex shrink-0 items-center gap-2">
                    <input type="hidden" name="student_id" value={studentId} />
                    <input type="hidden" name="application_id" value={a.id} />
                    <input type="hidden" name="institution" value={a.institution} />
                    <select
                      name="status" defaultValue={a.status}
                      className="min-h-11 rounded-lg border border-line bg-panel px-2 text-[12.5px] sm:min-h-0 sm:py-1.5"
                      aria-label={`Status for ${a.institution}`}
                    >
                      {APPLICATION_STATUSES.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary" size="sm">Save</Button>
                  </form>
                  <Chip tone={st.tone as Tone}>{st.label}</Chip>
                </li>
              );
            })}
          </ul>
        )}

        <form action={addApplication} className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-4">
          <input type="hidden" name="student_id" value={studentId} />
          <input name="institution" required className={inputClass} placeholder="Institution" />
          <input name="course" className={inputClass} placeholder="Course" />
          <input name="intake" className={inputClass} placeholder="Intake, e.g. July 2027" />
          <Button type="submit" variant="secondary">Add application</Button>
        </form>
      </Card>

      {/* --------------------------------------------------- how ready they are */}
      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-tight text-[16px]">How ready they are</h2>
          <span className="num text-[12px] text-muted">
            {readiness.score}/100 &middot; {readiness.band.label}
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          The same number the student sees. Built from finished work only, verified
          documents, ticked steps, bands actually scored.
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-5">
          {readiness.facets.map((f) => {
            const pct = Math.round((f.points / f.max) * 100);
            return (
              <div key={f.id} className="rounded-xl border border-line px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span aria-hidden className="text-[12px]">{f.icon}</span>
                  <span className="truncate text-[11px] font-semibold text-ink">{f.label}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-2/50">
                  <div className="h-full rounded-full"
                       style={{ width: `${pct}%`, background: `var(--color-tint-${f.tint}-ink)` }} />
                </div>
                <div className="num mt-1 text-[10.5px] text-muted">{f.points}/{f.max}</div>
                {f.next && <p className="mt-1 text-[10.5px] leading-snug text-muted">{f.next}</p>}
              </div>
            );
          })}
        </div>

        {streak.weeks > 0 ? (
          <p className="mt-3 text-[12.5px] text-muted">
            Has moved something forward {streak.weeks} week{streak.weeks === 1 ? "" : "s"} running
            {streak.activeThisWeek ? ", including this week." : ". Nothing yet this week."}
          </p>
        ) : (
          <p className="mt-3 text-[12.5px] text-muted">
            Nothing recorded on this file recently, worth a call.
          </p>
        )}
      </Card>

      {/* ------------------------------------------------ what they can open */}
      <Card className="p-5">
        <h2 className="h-tight text-[16px]">What this student can use</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Give someone the tools for the stage they are actually at. Anything switched off here
          disappears from their account entirely, they are not shown a locked door.
        </p>

        <ul className="mt-4 divide-y divide-line">
          {entitlements.map((e) => (
            <li key={e.mod.id} className="flex items-center gap-3 py-3">
              <span aria-hidden className="text-[17px]">{e.mod.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink">{e.mod.name}</div>
                <p className="text-[12px] leading-snug text-muted">
                  {e.reason === "not-in-plan"
                    ? "Not included in this consultancy's plan."
                    : e.reason === "off-for-branch"
                      ? "Switched off for the whole consultancy."
                      : e.mod.summary}
                </p>
              </div>

              {e.reason === "not-in-plan" || e.reason === "off-for-branch" ? (
                <Chip tone="grey">Unavailable</Chip>
              ) : (
                <form action={setStudentModule} className="shrink-0">
                  <input type="hidden" name="student_id" value={studentId} />
                  <input type="hidden" name="module_id" value={e.mod.id} />
                  <input type="hidden" name="enabled" value={e.enabled ? "0" : "1"} />
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={e.enabled}
                    aria-label={`${e.mod.name}: ${e.enabled ? "on" : "off"} for this student`}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      e.enabled ? "bg-brand-500" : "bg-line-2"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        e.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* --------------------------------------------------------- the record */}
      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-tight text-[16px]">Everything that has happened</h2>
          <span className="text-[11.5px] text-muted">{activity.length} recorded</span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Written automatically as work happens, and never edited afterwards. This is the answer
          when a parent asks what has been done.
        </p>
        <Timeline items={activity} />
      </Card>
    </div>
  );
}
