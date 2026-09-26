import Link from "next/link";
import { requirePermission, scopeOf } from "@/lib/auth/current";
import {
  activeStudentCount, counsellorsOf, listPipeline, officesFor, stageCounts,
} from "@/modules/pipeline/data";
import { assignMany } from "@/modules/pipeline/actions";
import { can } from "@/lib/auth/access";
import { ACTIVE_STAGES, STAGE_IDS, stageOf } from "@/modules/pipeline/stages";
import { planOf } from "@/lib/plans";
import { country } from "@/lib/countries";
import { showBand } from "@/modules/mock-tests/bands";
import { Button, Card, Chip, Empty, LinkButton, NotSet, PageHeader, ScrollHint, StatTile, Th, inputClass, type Tone } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { dueText, localDay } from "@/lib/dates";
import { AddStudent, AddStudentButton } from "./add-student";

export const metadata = { title: "Students, Stride" };

export default async function PipelinePage({
  searchParams,
}: { searchParams: Promise<{
  stage?: string; mine?: string; add?: string; q?: string;
  office?: string; late?: string; unassigned?: string; sort?: string;
}> }) {
  const { stage, mine, add, q, office, late: lateParam, unassigned: unassignedParam, sort } = await searchParams;
  const user = await requirePermission("students:view");
  const scope = scopeOf(user);

  const showLate = lateParam === "1";
  const showUnassigned = unassignedParam === "1";
  const rows = listPipeline(scope, {
    stage, mine: mine === "1", q, branchId: office,
    late: showLate, unassigned: showUnassigned,
    sort: sort === "newest" || sort === "late" ? sort : "name",
  });
  const offices = officesFor(scope);
  const officeName = offices.find((o) => o.id === office)?.name ?? null;
  const counsellors = counsellorsOf(scope.tenantId);
  const filtered = Boolean(q || stage || mine === "1" || office || showLate || showUnassigned);
  // Keep the other filters when one chip is pressed, so narrowing is additive.
  const url = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      q, stage, mine: mine === "1" ? "1" : undefined, office,
      late: showLate ? "1" : undefined, unassigned: showUnassigned ? "1" : undefined,
      sort: sort && sort !== "name" ? sort : undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/app/pipeline?${s}` : "/app/pipeline";
  };
  const counts = stageCounts(scope);
  const active = activeStudentCount(scope.tenantId);
  const plan = planOf(user.tenantPlan);

  const canAssign = can(user, "applications:manage") || user.role === "tenant_admin" || user.role === "super_admin";
  const today = localDay();
  // The tiles count the office being looked at, not the rows left after a
  // chip is pressed, or pressing one would zero the other.
  const inScope = listPipeline(scope, { branchId: office });
  const overdue = inScope.filter(
    (r) => r.next_action_due && r.next_action_due.slice(0, 10) < today && r.stage !== "departed" && r.stage !== "lost",
  ).length;
  const unassigned = inScope.filter((r) => !r.counsellor_id && r.stage !== "departed" && r.stage !== "lost").length;
  // What this person can actually see, which for branch staff is their own
  // office. Showing the consultancy total to somebody holding 22 files is a
  // number they cannot reconcile with the list underneath it.
  const visibleActive = inScope.filter((r) => r.stage !== "departed" && r.stage !== "lost").length;
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
          label="Active students" value={visibleActive}
          tone={scope.allBranches && active >= Number(cap) ? "danger" : "brand"}
          sub={
            officeName ? `in ${officeName}, ${active} across the consultancy`
            : scope.allBranches ? `${cap} on the ${plan.label} plan`
            : `in ${user.branchName ?? "your office"}, ${active} across the consultancy`
          }
        />
        <Link href={url({ unassigned: "1", late: undefined, stage: undefined })} className="rounded-2xl focus-visible:outline-none">
          <StatTile label="No counsellor" value={unassigned} tone={unassigned > 0 ? "gold" : "teal"} sub="waiting to be assigned" />
        </Link>
        <Link href={url({ late: "1", unassigned: undefined, stage: undefined })} className="rounded-2xl focus-visible:outline-none">
          <StatTile label="Follow-ups late" value={overdue} tone={overdue > 0 ? "danger" : "teal"} sub="next step past its date" />
        </Link>
        <StatTile
          label="Flown out" value={inScope.filter((r) => r.stage === "departed").length}
          tone="teal" sub="students who departed"
        />
      </div>

      <AddStudent defaultOpen={add === "1"} />

      {q && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted">Showing matches for</span>
          <span className="rounded-full border border-line-2 bg-panel px-3 py-1 font-semibold text-ink">{q}</span>
          <Link href="/app/pipeline" className="font-semibold text-brand-600 hover:underline">Clear</Link>
        </div>
      )}

      {offices.length > 1 && (
        <nav aria-label="Filter by office" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[13px] font-semibold text-muted">Office:</span>
          <Link
            href={url({ office: undefined })}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium ${
              !office ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
          >
            All offices
          </Link>
          {offices.map((o) => (
            <Link
              key={o.id} href={url({ office: o.id })}
              className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium ${
                office === o.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
            >
              {o.name}
            </Link>
          ))}
        </nav>
      )}

      <nav aria-label="Filter students" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-semibold text-muted">Show:</span>
        <Link
          href={url({ stage: undefined, mine: undefined, late: undefined, unassigned: undefined })}
          className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium ${
            !stage && mine !== "1" && !showLate && !showUnassigned ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
        >
          Everyone {rows.length > 0 && !stage && mine !== "1" ? <span className="num text-muted">{rows.length}</span> : null}
        </Link>
        <Link
          href={url({ mine: mine === "1" ? undefined : "1" })}
          className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium ${
            mine === "1" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
        >
          My students
        </Link>
        <Link
          href={url({ late: showLate ? undefined : "1", unassigned: undefined })}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium ${
            showLate ? "border-danger-600 bg-danger-100 text-danger-600" : "border-line text-ink-2 hover:border-line-2"}`}
        >
          <Icon name="alert" size={14} /> Follow-up late
        </Link>
        <Link
          href={url({ unassigned: showUnassigned ? undefined : "1", late: undefined })}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium ${
            showUnassigned ? "border-accent-500 bg-accent-50 text-accent-600" : "border-line text-ink-2 hover:border-line-2"}`}
        >
          <Icon name="students" size={14} /> No counsellor
        </Link>
        {STAGE_IDS.map((s) => (
          <Link
            key={s} href={url({ stage: stage === s ? undefined : s, late: undefined, unassigned: undefined })}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium ${
              stage === s ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: stageOf(s).bar }} aria-hidden />
            {stageOf(s).label} {counts[s] ? <span className="num text-muted">{counts[s]}</span> : null}
          </Link>
        ))}
      </nav>

      {canAssign && rows.length > 0 && showUnassigned && (
        <Card className="p-4">
          <form action={assignMany} className="flex flex-wrap items-end gap-3">
            {rows.map((r) => <input key={r.student_id} type="hidden" name="student_id" value={r.student_id} />)}
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-ink">
                Hand all {rows.length} of these {officeName ? `${officeName} ` : ""}students to one counsellor
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Each one is logged on the student's file, and you can change any of them afterwards.
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-end gap-2">
              <label htmlFor="bulk_counsellor" className="sr-only">Counsellor</label>
              <select id="bulk_counsellor" name="counsellor_id" className={`${inputClass} w-auto min-w-[200px]`} defaultValue="">
                <option value="" disabled>Choose a counsellor</option>
                {counsellors.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <Button type="submit"><Icon name="check" size={15} /> Assign all</Button>
            </div>
          </form>
        </Card>
      )}

      {rows.length === 0 ? (
        <Empty
          icon={<Icon name="students" size={24} />}
          title={
            q ? `Nobody matches "${q}"`
            : showUnassigned ? "Everybody has a counsellor"
            : showLate ? "No follow-up is late"
            : stage ? `Nobody at ${stageOf(stage).label}`
            : mine === "1" ? "No students assigned to you"
            : "No students yet"}
          action={filtered
            ? <LinkButton href="/app/pipeline" variant="secondary" size="sm">Show everyone</LinkButton>
            : <AddStudentButton />}
        >
          {q
            ? "Try part of a name, an email or a phone number."
            : filtered
            ? "Nothing here with those filters."
            : "Add your first student. They get their own login, and their progress shows up here."}
        </Empty>
      ) : (
        <Card className="overflow-hidden">
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-wash/60 text-left">
                  {[...(offices.length > 1 ? ["Office"] : []), "Student", "Stage", "Going to", "Counsellor", "Best mock", "Interview", "SOPs", "Next step"].map((h) => (
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
                      {offices.length > 1 && (
                        <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-muted">
                          {r.branch_name ?? "No office"}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {/* A finger-sized target. The name was a 16px line of
                            text, which on a phone is a tap somebody misses
                            twice before they get it. */}
                        <Link
                          href={`/app/pipeline/${r.student_id}`}
                          className="-my-2 flex min-h-[44px] items-center font-semibold text-ink hover:text-brand-600"
                        >
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
