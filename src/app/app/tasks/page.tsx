import Link from "next/link";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { officesFor } from "@/modules/pipeline/data";
import { Button, Card, Chip, Field, PageHeader, inputClass, type Tone } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { dueText } from "@/lib/dates";
import {
  branchTasks, dueState, myTasks, staffFor, teamsFor,
} from "@/modules/tasks/data";
import { addTask, finishTask, takeTask } from "@/modules/tasks/actions";

export const metadata = { title: "Tasks, OfficeYak" };

const DUE_TONE: Record<string, Tone> = {
  overdue: "danger", today: "gold", soon: "brand", later: "grey", none: "grey",
};

/**
 * The page a counsellor opens first.
 *
 * Their own work at the top, because that is the question they arrived with.
 * Adding a task sits right under it with one "Give it to" choice, so nobody
 * has to learn the difference between a person field and a team field. The
 * rest of the branch comes last, for whoever manages it.
 */
export default async function TasksPage({
  searchParams,
}: { searchParams: Promise<{ office?: string }> }) {
  const { office } = await searchParams;
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);

  const offices = officesFor(scope);
  const mine = myTasks(scope);
  const branch = branchTasks(scope, { branchId: office });
  const teams = teamsFor(scope);
  const staff = staffFor(scope);

  // A team task I can already see on my own list is not also "waiting for
  // someone", or the same job appears twice with two different buttons.
  const onMyList = new Set(mine.map((t) => t.id));
  const unclaimed = branch.filter((t) => !t.assignee_id && t.team_id && !onMyList.has(t.id));
  const overdue = mine.filter((t) => dueState(t.due_on) === "overdue").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tasks"
        sub={mine.length === 0
          ? "Nothing on your list. Add a task below, for yourself or someone else."
          : overdue > 0
            ? `You have ${mine.length} to do. ${overdue} ${overdue === 1 ? "is" : "are"} late.`
            : `You have ${mine.length} to do. Nothing is late.`}
        /* Ink: the top bar's "+ Task" already offers this on every screen. */
        actions={<a href="#add" className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-2"><Icon name="plus" size={16} /> Add task</a>}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">My list</h2>
        </div>
        {mine.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-6 text-[14px] text-muted">
            <Icon name="check" className="text-teal-700" /> All clear.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {mine.map((t) => {
              const d = dueState(t.due_on);
              return (
                <li key={t.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-ink">{t.title}</div>
                    <div className="mt-0.5 text-[13px] text-muted">
                      {[t.student_name, t.team_name ? `${t.team_name} team` : null].filter(Boolean).join(" · ") || "Not about a student"}
                    </div>
                    {t.detail && <p className="mt-1 text-[13px] leading-snug text-ink-2">{t.detail}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {t.priority === "urgent" && <Chip tone="accent">Urgent</Chip>}
                    <Chip tone={DUE_TONE[d]}>{dueText(t.due_on)}</Chip>
                    <form action={finishTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button type="submit" variant="secondary" size="sm">Mark done</Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {unclaimed.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">Waiting for someone</h2>
            <p className="mt-0.5 text-[13px] text-muted">Given to a team. Press "Take it" and it moves to your list.</p>
          </div>
          <ul className="divide-y divide-line">
            {unclaimed.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink">{t.title}</div>
                  <div className="mt-0.5 text-[13px] text-muted">
                    {[t.team_name ? `${t.team_name} team` : null, t.student_name].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Chip tone={DUE_TONE[dueState(t.due_on)]}>{dueText(t.due_on)}</Chip>
                  <form action={takeTask}>
                    <input type="hidden" name="id" value={t.id} />
                    {/* Secondary: one per row, so not the view's primary. */}
                    <Button type="submit" size="sm" variant="secondary">Take it</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div id="add" className="scroll-mt-6">
        <Card className="p-5">
          <h2 className="h-tight text-[17px]">Add a task</h2>
          <form action={addTask} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="What needs doing?" name="task_title">
                <input id="task_title" name="title" required minLength={2} className={inputClass} placeholder="Call Sujata about her bank statement" />
              </Field>
            </div>
            <Field label="Give it to" name="task_assign" hint="A team task goes to everyone in the team until one person takes it.">
              <select id="task_assign" name="assign" className={inputClass} defaultValue={`user:${user.id}`}>
                <optgroup label="A person">
                  {staff.map((s) => (
                    <option key={s.id} value={`user:${s.id}`}>{s.id === user.id ? `Me (${s.full_name})` : s.full_name}</option>
                  ))}
                </optgroup>
                {teams.length > 0 && (
                  <optgroup label="A team">
                    {teams.map((t) => <option key={t.id} value={`team:${t.id}`}>{t.name}</option>)}
                  </optgroup>
                )}
              </select>
            </Field>
            <Field label="Due" name="task_due" hint="Optional.">
              <input id="task_due" name="due_on" type="date" className={inputClass} />
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="text-[13px] font-semibold text-ink">How urgent?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[["low", "Can wait"], ["normal", "Normal"], ["urgent", "Urgent"]].map(([v, label]) => (
                  <label key={v} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line-2 px-4 text-[13.5px] text-ink-2 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
                    <input type="radio" name="priority" value={v} defaultChecked={v === "normal"} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="sm:col-span-2">
              <Button type="submit"><Icon name="plus" size={16} /> Add task</Button>
            </div>
          </form>
        </Card>
      </div>

      {branch.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="h-tight text-[15px]">
                {offices.length > 1
                  ? `Everyone's tasks, ${offices.find((o) => o.id === office)?.name ?? "all offices"}`
                  : "Everyone's tasks"}
              </h2>
              {offices.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href="/app/tasks"
                    className={`inline-flex min-h-[32px] items-center rounded-full border px-3 text-[12.5px] font-medium ${
                      !office ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
                  >
                    All
                  </Link>
                  {offices.map((o) => (
                    <Link
                      key={o.id} href={`/app/tasks?office=${o.id}`}
                      className={`inline-flex min-h-[32px] items-center rounded-full border px-3 text-[12.5px] font-medium ${
                        office === o.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
                    >
                      {o.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <ul className="divide-y divide-line">
            {branch.slice(0, 25).map((t) => {
              const d = dueState(t.due_on);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{t.title}</span>
                  <span className="shrink-0 text-[13px] text-muted">
                    {t.assignee_name ?? (t.team_name ? `${t.team_name} team` : "Nobody yet")}
                  </span>
                  <Chip tone={DUE_TONE[d]}>{dueText(t.due_on)}</Chip>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
