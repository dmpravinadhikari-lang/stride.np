import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { scopeOf } from "@/lib/auth/current";
import { scalar } from "@/lib/db";
import { localDay } from "@/lib/dates";
import { Alert, Card, PageHeader } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { recentActivity } from "@/lib/crm/activity";
import { activeProvider } from "@/lib/ai/provider";
import { openShift } from "@/modules/attendance/data";
import { myTasks, dueState } from "@/modules/tasks/data";
import { listPipeline } from "@/modules/pipeline/data";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kathmandu" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/**
 * Home for anyone who works at the consultancy.
 *
 * It answers "what do I do now?" before anything else: four cards, each a
 * number and the button that deals with it. A new counsellor can start work
 * from here on day one without being shown around.
 */
export function StaffHome({ user }: { user: SessionUser }) {
  const scope = scopeOf(user);
  const admin = user.role === "tenant_admin" || user.role === "super_admin";

  const clockedIn = Boolean(openShift(scope));
  const tasks = myTasks(scope);
  const late = tasks.filter((t) => dueState(t.due_on) === "overdue").length;
  const dueToday = tasks.filter((t) => dueState(t.due_on) === "today").length;

  const students = listPipeline(scope);
  const today = localDay();
  const followUps = students.filter(
    (r) => r.next_action_due && r.next_action_due.slice(0, 10) < today && r.stage !== "departed" && r.stage !== "lost",
  ).length;
  const unassigned = students.filter(
    (r) => !r.counsellor_id && r.stage !== "departed" && r.stage !== "lost",
  ).length;

  const feed = recentActivity(scope, 8);

  // First-week setup, for whoever runs the consultancy. Each step is checked
  // against the data, so it disappears on its own once it is true.
  const setup = admin
    ? [
        {
          done: scalar(
            "SELECT COUNT(*) FROM branches WHERE tenant_id = ? AND active = 1 AND lat IS NULL", user.tenantId,
          ) === 0,
          label: "Pin each office on the map", why: "So staff can clock in from the office.",
          href: "/app/branches",
        },
        {
          done: scalar(
            "SELECT COUNT(*) FROM users WHERE tenant_id = ? AND role IN ('counsellor','tenant_admin') AND active = 1", user.tenantId,
          ) > 1,
          label: "Add your staff", why: "Each person gets their own login.",
          href: "/app/people",
        },
        {
          done: scalar("SELECT COUNT(*) FROM teams WHERE tenant_id = ?", user.tenantId) > 0,
          label: "Make a team", why: "Give work to a desk, not only a person.",
          href: "/app/people#teams",
        },
        {
          done: students.length > 0,
          label: "Add your first student", why: "Their file, documents and progress live here.",
          href: "/app/pipeline?add=1",
        },
      ]
    : [];
  const setupLeft = setup.filter((s) => !s.done).length;

  const cards: Array<{
    icon: IconName; title: string; value: string; note: string; cta: string; href: string; tone: "good" | "warn" | "bad" | "plain";
  }> = [
    {
      icon: "clock",
      title: "Attendance",
      value: clockedIn ? "Clocked in" : "Not clocked in",
      note: clockedIn ? "Clock out when you leave." : "Start your day here.",
      cta: clockedIn ? "Clock out" : "Clock in",
      href: "/app/attendance",
      tone: clockedIn ? "good" : "warn",
    },
    {
      icon: "tasks",
      title: "Your tasks",
      value: String(tasks.length),
      note: late > 0 ? (dueToday > 0 ? `${late} late, ${dueToday} due today` : `${late} late`) : dueToday > 0 ? `${dueToday} due today` : tasks.length ? "Nothing late" : "Nothing waiting for you",
      cta: "Open tasks",
      href: "/app/tasks",
      tone: late > 0 ? "bad" : dueToday > 0 ? "warn" : "plain",
    },
    {
      icon: "alert",
      title: "Follow-ups missed",
      value: String(followUps),
      note: followUps ? "Next step is past its date." : "Every student is on track.",
      cta: "See who",
      href: "/app/pipeline?late=1",
      tone: followUps > 0 ? "bad" : "good",
    },
    {
      icon: "students",
      title: "No counsellor yet",
      value: String(unassigned),
      note: unassigned ? "Waiting to be given to someone." : "Everyone has a counsellor.",
      cta: "Hand them out",
      href: "/app/pipeline?unassigned=1",
      tone: unassigned > 0 ? "warn" : "good",
    },
  ];

  // A card that wants something is tinted; a card that is fine is not. That
  // way "what needs me today" is answered from across the room.
  const iconClass = {
    good: "bg-teal-100 text-teal-700",
    warn: "bg-accent-100 text-accent-600",
    bad: "bg-danger-100 text-danger-600",
    plain: "bg-brand-50 text-brand-600",
  };
  const cardClass = {
    good: "border-line bg-panel",
    warn: "border-accent-300 bg-accent-50",
    bad: "border-danger-600/30 bg-danger-100",
    plain: "border-line bg-panel",
  };

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title={`${greeting()}, ${user.fullName.split(" ")[0]}`}
        sub={user.branchName ? `${user.tenantName}, ${user.branchName}` : user.tenantName}
      />

      {user.role === "super_admin" && activeProvider().id === "sample" && (
        <Alert tone="gold" title="AI is on sample answers">
          Set STRIDE_AI_PROVIDER in .env.local for real answers. Only the platform owner sees this.
        </Alert>
      )}

      <section aria-labelledby="today" className="flex flex-col gap-3">
        <h2 id="today" className="h-tight text-[17px]">Today</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.title} href={c.href}
              className={`group flex min-w-0 flex-col rounded-2xl border p-4 transition-colors hover:border-brand-400 focus-visible:border-brand-400 ${cardClass[c.tone]}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconClass[c.tone]}`}>
                  <Icon name={c.icon} size={18} />
                </span>
                <span className="min-w-0 text-[13px] font-semibold leading-tight text-ink-2">{c.title}</span>
              </div>
              <div className={`mt-3 font-semibold leading-tight text-ink ${/^\d+$/.test(c.value) ? "num text-[30px]" : "h-tight text-[19px]"}`}>{c.value}</div>
              <p className="mt-1.5 flex-1 text-[13px] leading-snug text-muted">{c.note}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 group-hover:gap-2 transition-[gap]">
                {c.cta} <Icon name="arrow" size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {setupLeft > 0 && (
        <Card className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="h-tight text-[17px]">Set up your office</h2>
            <span className="text-[13px] text-muted">{setup.length - setupLeft} of {setup.length} done</span>
          </div>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {setup.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                    s.done ? "border-line bg-wash/50" : "border-line-2 bg-panel hover:border-brand-400"}`}
                >
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                    s.done ? "border-teal-500 bg-teal-500 text-white" : "border-line-2 text-transparent"}`}>
                    <Icon name="check" size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[14px] font-semibold ${s.done ? "text-muted line-through" : "text-ink"}`}>{s.label}</span>
                    <span className="block text-[12.5px] text-muted">{s.why}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-tight text-[17px]">Recent activity</h2>
          <Link href="/app/pipeline" className="inline-flex min-h-[32px] items-center gap-1 rounded-[8px] px-2 text-[13px] font-semibold text-brand-600 hover:bg-brand-50">
            All students <Icon name="arrow" size={15} />
          </Link>
        </div>
        {feed.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-muted">
            Nothing yet. When anyone adds a note, uploads a document or moves a student, it shows here.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {feed.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 py-2.5">
                <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">
                  {a.student_name && (
                    <Link href={`/app/pipeline/${a.student_id}`} className="font-medium text-brand-600 hover:underline">
                      {a.student_name}
                    </Link>
                  )}{" "}
                  {/* Some summaries already open with the student's name, and
                      printing the link as well read as "Arjun Poudel Arjun
                      Poudel enrolled". */}
                  {a.student_name && a.summary.startsWith(a.student_name)
                    ? a.summary.slice(a.student_name.length).trimStart()
                    : a.summary}
                </span>
                <span className="shrink-0 text-[12px] text-muted">{a.actor_label}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
