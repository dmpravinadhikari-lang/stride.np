import Link from "next/link";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { activeStudentCount, listPipeline, stageCounts } from "@/modules/pipeline/data";
import { ACTIVE_STAGES, STAGE_IDS, stageOf } from "@/modules/pipeline/stages";
import { planOf } from "@/lib/plans";
import { country } from "@/lib/countries";
import { showBand } from "@/modules/mock-tests/bands";
import { Card, Chip, Empty, LinkButton, NotSet, PageHeader, ScrollHint, StatTile, Th, type Tone } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { dueText, localDay } from "@/lib/dates";
import { AddStudent, AddStudentButton } from "./add-student";

export const metadata = { title: "Students, STRIDE" };

export default async function PipelinePage({
  searchParams,
}: { searchParams: Promise<{ stage?: string; mine?: string; add?: string; q?: string }> }) {
  const { stage, mine, add, q } = await searchParams;
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);

  const rows = listPipeline(scope, { stage, mine: mine === "1", q });
  const counts = stageCounts(scope);
  const active = activeStudentCount(scope.tenantId);
  const plan = planOf(user.tenantPlan);

  const today = localDay();
  const overdue = rows.filter(
    (r) => r.next_action_due && r.next_action_due.slice(0, 10) < today,
  ).length;
  const unassigned = rows.filter((r) => !r.counsellor_id).length;
  const cap = plan.maxStudents === Number.POSITIVE_INFINITY ? "unlimited" : plan.maxStudents;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Students"
        sub="Everyone you are helping, where they are and what happens next. Click a name to open their file."
        actions={<AddStudentButton />}
      />

      {active > 0 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="h-tight text-[15px]">Where everyone is</h2>
            <span className="text-[12.5px] text-muted">{active} active</span>
          </div>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-wash">
            {ACTIVE_STAGES.filter((st) => counts[st]).map((st) => (
              <div
                key={st}
                style={{ width: `${(counts[st] / active) * 100}%`, background: stageOf(st).bar }}
                title={`${stageOf(st).label}: ${counts[st]}`}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {ACTIVE_STAGES.filter((st) => counts[st]).map((st) => (
              <li key={st} className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ background: stageOf(st).bar }} aria-hidden />
                {stageOf(st).label}
                <span className="num font-semibold text-ink">{counts[st]}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Active students" value={active} tone={active >= Number(cap) ? "danger" : "brand"}
          sub={`${cap} on the ${plan.label} plan`}
        />
        <StatTile label="No counsellor" value={unassigned} tone={unassigned > 0 ? "gold" : "teal"} sub="waiting to be assigned" />
        <StatTile label="Follow-ups late" value={overdue} tone={overdue > 0 ? "danger" : "teal"} sub="next step past its date" />
        <StatTile label="Flown out" value={counts.departed ?? 0} tone="teal" sub="students who departed" />
      </div>

      <AddStudent defaultOpen={add === "1"} />

      {q && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted">Showing matches for</span>
          <span className="rounded-full border border-line-2 bg-panel px-3 py-1 font-semibold text-ink">{q}</span>
          <Link href="/app/pipeline" className="font-semibold text-brand-600 hover:underline">Clear</Link>
        </div>
      )}

      <nav aria-label="Filter students" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-semibold text-muted">Show:</span>
        <Link
          href="/app/pipeline"
          className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-[13px] font-semibold ${
            !stage && mine !== "1" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
        >
          Everyone {rows.length > 0 && !stage && mine !== "1" ? <span className="num text-muted">{rows.length}</span> : null}
        </Link>
        <Link
          href="/app/pipeline?mine=1"
          className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-[13px] font-semibold ${
            mine === "1" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
        >
          My students
        </Link>
        {STAGE_IDS.map((s) => (
          <Link
            key={s} href={`/app/pipeline?stage=${s}`}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-[13px] font-semibold ${
              stage === s ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: stageOf(s).bar }} aria-hidden />
            {stageOf(s).label} {counts[s] ? <span className="num text-muted">{counts[s]}</span> : null}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Empty
          icon={<Icon name="students" size={24} />}
          title={q ? `Nobody matches "${q}"` : stage ? `Nobody at ${stageOf(stage).label}` : mine === "1" ? "No students assigned to you" : "No students yet"}
          action={q || stage || mine === "1"
            ? <LinkButton href="/app/pipeline" variant="secondary" size="sm">Show everyone</LinkButton>
            : <AddStudentButton />}
        >
          {q
            ? "Try part of a name, an email or a phone number."
            : stage || mine === "1"
            ? "Try another filter."
            : "Add your first student. They get their own login, and their progress shows up here."}
        </Empty>
      ) : (
        <Card className="overflow-hidden">
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-wash/60 text-left">
                  {["Student", "Stage", "Going to", "Counsellor", "Best mock", "Interview", "SOPs", "Next step"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const due = r.next_action_due;
                  const late = due !== null && due.slice(0, 10) < today;
                  const s = stageOf(r.stage);
                  return (
                    <tr key={r.student_id} className="border-b border-line last:border-0 hover:bg-wash/40">
                      <td className="px-4 py-3">
                        <Link href={`/app/pipeline/${r.student_id}`} className="font-semibold text-ink hover:text-brand-600">
                          {r.full_name}
                        </Link>
                        <div className="text-[12px] text-muted">{r.email}</div>
                      </td>
                      <td className="px-4 py-3"><Chip tone={s.tone as Tone}>{s.label}</Chip></td>
                      <td className="px-4 py-3 text-ink-2">
                        {r.target_country ? `${country(r.target_country).flag} ${country(r.target_country).name}` : <NotSet>Not decided</NotSet>}
                        {r.intended_course && <div className="text-[12px] text-muted">{r.intended_course}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {r.counsellor_name ?? <span className="text-gold-600">Unassigned</span>}
                      </td>
                      <td className="num px-4 py-3">{r.best_mock ? showBand(r.best_mock) : <NotSet />}</td>
                      <td className="num px-4 py-3">{r.best_interview ?? <NotSet />}</td>
                      <td className="num px-4 py-3">{r.sop_count || <NotSet>None</NotSet>}</td>
                      <td className="px-4 py-3">
                        {r.next_action
                          ? <>
                              <div className="text-ink-2">{r.next_action}</div>
                              {due && (
                                <div className={`text-[12px] ${late ? "font-semibold text-danger-600" : "text-muted"}`}>
                                  {dueText(r.next_action_due)}
                                </div>
                              )}
                            </>
                          : <NotSet>None set</NotSet>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ScrollHint>Swipe sideways to see every column</ScrollHint>
        </Card>
      )}

      <p className="text-[12.5px] leading-relaxed text-muted">
        Your plan counts active students. Moving someone to {stageOf("departed").label} or {stageOf("lost").label} frees a place.
      </p>
    </div>
  );
}
