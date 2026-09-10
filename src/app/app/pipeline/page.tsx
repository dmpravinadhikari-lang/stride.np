import Link from "next/link";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { activeStudentCount, counsellorsOf, listPipeline, stageCounts } from "@/modules/pipeline/data";
import { ACTIVE_STAGES, STAGE_IDS, stageOf, type Stage } from "@/modules/pipeline/stages";
import { planOf } from "@/lib/plans";
import { country } from "@/lib/countries";
import { showBand } from "@/modules/mock-tests/bands";
import { Card, Chip, Empty, ScrollHint, StatTile, type Tone } from "@/components/ui";
import { AddStudent } from "./add-student";

export const metadata = { title: "Student Pipeline, STRIDE" };

export default async function PipelinePage({
  searchParams,
}: { searchParams: Promise<{ stage?: string; mine?: string }> }) {
  const { stage, mine } = await searchParams;
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);

  const rows = listPipeline(scope, { stage, mine: mine === "1" });
  const counts = stageCounts(scope);
  const active = activeStudentCount(scope.tenantId);
  const plan = planOf(user.tenantPlan);
  const counsellors = counsellorsOf(scope.tenantId);

  const overdue = rows.filter(
    (r) => r.next_action_due && new Date(r.next_action_due) < new Date(),
  ).length;
  const unassigned = rows.filter((r) => !r.counsellor_id).length;
  const cap = plan.maxStudents === Number.POSITIVE_INFINITY ? "unlimited" : plan.maxStudents;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Student Pipeline</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Every student at {user.tenantName}, where they are, who has them, and what their practice
          scores say. Students never see this.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile
          label="Active students" value={active} tone={active >= Number(cap) ? "danger" : "brand"}
          sub={`${cap} on the ${plan.label} plan`}
        />
        <StatTile label="Unassigned" value={unassigned} tone={unassigned > 0 ? "gold" : "teal"} sub="no counsellor yet" />
        <StatTile label="Overdue actions" value={overdue} tone={overdue > 0 ? "danger" : "teal"} sub="next action past its date" />
        <StatTile label="Departed" value={counts.departed ?? 0} tone="teal" sub="your references" />
      </div>

      <AddStudent />

      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href="/app/pipeline"
          className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
            !stage && mine !== "1" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
        >
          All {rows.length > 0 && !stage ? `(${rows.length})` : ""}
        </Link>
        <Link
          href="/app/pipeline?mine=1"
          className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
            mine === "1" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
        >
          Mine
        </Link>
        {STAGE_IDS.map((s) => (
          <Link
            key={s} href={`/app/pipeline?stage=${s}`}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
              stage === s ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
          >
            {stageOf(s).label} {counts[s] ? <span className="num text-muted">{counts[s]}</span> : null}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty icon="📊" title={stage ? `Nobody at ${stageOf(stage).label}` : "No students yet"}>
          {stage
            ? "Try another stage, or clear the filter."
            : "Add your first student above. They get a login of their own, and everything they do in mock tests and interviews shows up here."}
        </Empty>
      ) : (
        <Card className="overflow-hidden">
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-wash/60 text-left">
                  {["Student", "Stage", "Going to", "Counsellor", "Mock", "Interview", "SOPs", "Next action"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const due = r.next_action_due ? new Date(r.next_action_due) : null;
                  const late = due !== null && due < new Date();
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
                        {r.target_country ? `${country(r.target_country).flag} ${country(r.target_country).name}` : ", "}
                        {r.intended_course && <div className="text-[12px] text-muted">{r.intended_course}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {r.counsellor_name ?? <span className="text-gold-600">Unassigned</span>}
                      </td>
                      <td className="num px-4 py-3">{r.best_mock ? showBand(r.best_mock) : ", "}</td>
                      <td className="num px-4 py-3">{r.best_interview ?? ", "}</td>
                      <td className="num px-4 py-3">{r.sop_count || ", "}</td>
                      <td className="px-4 py-3">
                        {r.next_action
                          ? <>
                              <div className="text-ink-2">{r.next_action}</div>
                              {due && (
                                <div className={`text-[12px] ${late ? "font-semibold text-danger-600" : "text-muted"}`}>
                                  {late ? "overdue " : "due "}{due.toLocaleDateString()}
                                </div>
                              )}
                            </>
                          : <span className="text-muted">, </span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ScrollHint>Swipe the table sideways for stage, mock, SOP and next action</ScrollHint>
        </Card>
      )}

      <p className="text-[12px] leading-relaxed text-muted">
        Active students are everyone not yet at {stageOf("departed").label} or {stageOf("lost").label}, {" "}
        {ACTIVE_STAGES.map((s) => stageOf(s).label).join(", ")}. That is the number your plan is
        counted against, so moving a departed student on frees a place.
        {counsellors.length <= 1 && " Add counsellor accounts to share students out."}
      </p>
    </div>
  );
}
