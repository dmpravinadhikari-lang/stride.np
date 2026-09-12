import { requireRole, scopeOf } from "@/lib/auth/current";
import { Button, Card, Chip, inputClass, type Tone } from "@/components/ui";
import {
  branchTasks, dueState, myTasks, staffFor, teamsFor,
} from "@/modules/tasks/data";
import { addTask, finishTask, takeTask } from "@/modules/tasks/actions";

export const metadata = { title: "Tasks" };

const DUE_TONE: Record<string, Tone> = {
  overdue: "danger", today: "gold", soon: "brand", later: "grey", none: "grey",
};
const DUE_LABEL: Record<string, string> = {
  overdue: "Overdue", today: "Today", soon: "This week", later: "Later", none: "No date",
};

/**
 * The page a counsellor opens first.
 *
 * Their own work at the top, because that is the question they arrived with.
 * The rest of the branch underneath, because a manager needs to see where the
 * work has piled up without switching screens.
 */
export default async function TasksPage() {
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);

  const mine = myTasks(scope);
  const branch = branchTasks(scope);
  const teams = teamsFor(scope);
  const staff = staffFor(scope);

  const unclaimed = branch.filter((t) => !t.assignee_id && t.team_id);
  const overdue = mine.filter((t) => dueState(t.due_on) === "overdue").length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Your day</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {mine.length === 0
            ? "Nothing assigned to you. Anything sitting with a team you are on would appear here too."
            : overdue > 0
              ? `${mine.length} open, ${overdue} already past its date.`
              : `${mine.length} open, none overdue.`}
        </p>
      </header>

      {mine.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">Yours</h2>
          </div>
          <ul className="divide-y divide-line">
            {mine.map((t) => {
              const d = dueState(t.due_on);
              return (
                <li key={t.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold text-ink">{t.title}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {[t.student_name, t.team_name ? `${t.team_name} team` : null, t.due_on]
                        .filter(Boolean).join(" · ") || "No student attached"}
                    </div>
                    {t.detail && <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{t.detail}</p>}
                  </div>
                  <Chip tone={DUE_TONE[d]}>{DUE_LABEL[d]}</Chip>
                  {t.priority === "urgent" && <Chip tone="danger">Urgent</Chip>}
                  <form action={finishTask} className="shrink-0">
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" variant="secondary" size="sm">Done</Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {unclaimed.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">Waiting for someone to pick up</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Sitting with a team rather than a person. Claiming one makes it yours.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {unclaimed.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold text-ink">{t.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {[t.team_name ? `${t.team_name} team` : null, t.student_name, t.due_on]
                      .filter(Boolean).join(" · ")}
                  </div>
                </div>
                <form action={takeTask} className="shrink-0">
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" variant="secondary" size="sm">I will do it</Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Add a task</h2>
        <form action={addTask} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input name="title" required className={`${inputClass} sm:col-span-2`} placeholder="What needs doing" />
          <select name="assignee_id" className={inputClass} defaultValue="">
            <option value="">Assign to a person</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select name="team_id" className={inputClass} defaultValue="">
            <option value="">or to a team</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input name="due_on" type="date" className={inputClass} aria-label="Due date" />
          <select name="priority" className={inputClass} defaultValue="normal">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="sm:col-span-2">
            <Button type="submit">Add task</Button>
            <p className="mt-2 text-[12px] text-muted">
              Choose a person or a team. A team task waits until somebody picks it up, which is how
              work survives an absence.
            </p>
          </div>
        </form>
      </Card>

      {branch.length > mine.length && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">
              {user.isHeadOffice || user.role === "tenant_admin" ? "Across every branch" : "Across this branch"}
            </h2>
          </div>
          <ul className="divide-y divide-line">
            {branch.slice(0, 25).map((t) => {
              const d = dueState(t.due_on);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{t.title}</span>
                  <span className="shrink-0 text-[12px] text-muted">
                    {t.assignee_name ?? (t.team_name ? `${t.team_name} team` : "unassigned")}
                  </span>
                  <Chip tone={DUE_TONE[d]}>{DUE_LABEL[d]}</Chip>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
