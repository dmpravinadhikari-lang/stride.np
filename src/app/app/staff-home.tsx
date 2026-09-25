import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { scopeOf } from "@/lib/auth/current";
import { scalar } from "@/lib/db";
import { localDay, whenText } from "@/lib/dates";
import { Alert, Card, PageHeader } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { recentActivity } from "@/lib/crm/activity";
import { activeProvider } from "@/lib/ai/provider";
import { openShift } from "@/modules/attendance/data";
import { myTasks, dueState } from "@/modules/tasks/data";
import { listPipeline } from "@/modules/pipeline/data";
import { leadCounts, listLeads } from "@/modules/leads/data";
import { normaliseSource, sourceOf } from "@/modules/pipeline/sources";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kathmandu" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/**
 * Home for anyone who works at the consultancy.
 *
 * Not a grid of identical cards. An office has one question at nine in the
 * morning, which is who walked in or rang and has not been called back, and
 * that question gets the biggest thing on the screen. The day's own state,
 * clocked in or not, sits beside it. Everything else is a small tile, because
 * it is a number you glance at rather than a job you start.
 *
 * Pravin, using the console as the owner: "dont make all things same size...
 * i dont see the student leads secton". Both are the same fault, which is a
 * layout that refuses to say what matters most.
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
  const live = students.filter((r) => r.stage !== "departed" && r.stage !== "lost");
  const followUps = live.filter(
    (r) => r.next_action_due && r.next_action_due.slice(0, 10) < today,
  ).length;
  const unassigned = live.filter((r) => !r.counsellor_id).length;

  const leads = leadCounts(scope);
  const queue = listLeads(scope).slice(0, 4);
  // With nothing waiting, the card would be a paragraph and a lot of white.
  // The ones that recently became students are the honest thing to put there:
  // it is the same board, showing what it is for.
  const won = queue.length === 0 ? listLeads(scope, { status: "converted" }).slice(0, 3) : [];
  const feed = recentActivity(scope, 6);

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

  // The small row. Each tile carries its own colour, because six numbers in
  // one grey reads as a spreadsheet and nobody scans a spreadsheet.
  const tiles: Array<{
    icon: IconName; label: string; value: number; note: string; href: string;
    tint: string; ink: string; bar: string; loud: boolean;
  }> = [
    {
      icon: "tasks", label: "Your tasks", value: tasks.length,
      note: late ? `${late} late` : dueToday ? `${dueToday} due today` : "Nothing late",
      href: "/app/tasks",
      tint: "bg-tint-amber", ink: "text-tint-amber-ink", bar: "bg-tint-amber-ink", loud: late > 0,
    },
    {
      icon: "alert", label: "Follow-ups missed", value: followUps,
      note: followUps ? "Past the date agreed" : "Everyone on track",
      href: "/app/pipeline?late=1",
      tint: "bg-tint-peach", ink: "text-tint-peach-ink", bar: "bg-tint-peach-ink", loud: followUps > 0,
    },
    {
      icon: "students", label: "No counsellor", value: unassigned,
      note: unassigned ? "Waiting to be handed out" : "All claimed",
      href: "/app/pipeline?unassigned=1",
      tint: "bg-tint-lilac", ink: "text-tint-lilac-ink", bar: "bg-tint-lilac-ink", loud: unassigned > 0,
    },
    {
      icon: "cap", label: "Students on file", value: live.length,
      note: `${leads.converted} came from leads`,
      href: "/app/pipeline",
      tint: "bg-tint-mint", ink: "text-tint-mint-ink", bar: "bg-tint-mint-ink", loud: false,
    },
  ];

  const priority = { hot: "bg-danger-600", warm: "bg-accent-500", cold: "bg-line-2" } as const;

  /*
   * One headline, chosen by what is actually worst.
   *
   * A dashboard that always leads with the same number leads with a zero on
   * the day that number is zero, and then the largest thing on the screen is
   * the thing least worth looking at. So the top of the card is whichever
   * queue is longest in the order an office would pick: somebody promised a
   * call, somebody walked in, somebody owns nobody, something of yours is
   * late.
   */
  const focus =
    followUps > 0
      ? { label: "Follow-ups missed", n: followUps, said: "students were promised a call that has not happened", cta: "See who", href: "/app/pipeline?late=1", bar: "bg-danger-600", ink: "text-danger-600" }
    : leads.open > 0
      ? { label: "Student leads", n: leads.open, said: "enquiries are still open", cta: "Open the board", href: "/app/leads", bar: "bg-brand-500", ink: "text-brand-600" }
    : unassigned > 0
      ? { label: "No counsellor", n: unassigned, said: "students are waiting to be handed to someone", cta: "Hand them out", href: "/app/pipeline?unassigned=1", bar: "bg-tint-lilac-ink", ink: "text-tint-lilac-ink" }
    : late > 0
      ? { label: "Your tasks", n: late, said: "of your tasks are past their date", cta: "Open tasks", href: "/app/tasks", bar: "bg-tint-amber-ink", ink: "text-tint-amber-ink" }
    : { label: "All clear", n: live.length, said: "students on file, and nothing overdue", cta: "See the board", href: "/app/pipeline", bar: "bg-teal-500", ink: "text-teal-700" };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting()}, ${user.fullName.split(" ")[0]}`}
        sub={user.branchName ? `${user.tenantName}, ${user.branchName}` : user.tenantName}
      />

      {user.role === "super_admin" && activeProvider().id === "sample" && (
        <Alert tone="gold" title="AI is on sample answers">
          Set STRIDE_AI_PROVIDER in .env.local for real answers. Only the platform owner sees this.
        </Alert>
      )}

      {/* ------------------------------------------------------ the headline */}
      <section aria-labelledby="now" className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        <h2 id="now" className="sr-only">What needs you now</h2>

        <article className="settle relative overflow-hidden rounded-2xl border border-line bg-panel">
          <span className={`absolute inset-x-0 top-0 h-1 ${focus.bar}`} aria-hidden />
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-5 pt-5">
            <div className="min-w-0">
              <div className={`text-[11.5px] font-semibold uppercase tracking-[0.08em] ${focus.ink}`}>
                {focus.label}
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="num text-[46px] font-semibold leading-none text-ink">{focus.n}</span>
                <span className="text-[14.5px] text-ink-2">{focus.said}</span>
              </div>
            </div>
            <Link
              href={focus.href}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-ink-2"
            >
              {focus.cta} <Icon name="arrow" size={15} />
            </Link>
          </div>

          {/* The leads queue, on the home screen and not only behind a link.
              Asked where the leads were, the owner could not find them. */}
          <div className="flex items-center justify-between gap-3 border-t border-line bg-wash/40 px-5 py-2.5">
            <span className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
              <Icon name="inbox" size={14} /> Student leads
            </span>
            <span className="text-[12.5px] text-muted">
              <span className="num font-semibold text-ink">{leads.open}</span> open
              {leads.todayNew > 0 ? ` · ${leads.todayNew} today` : ""}
              {leads.dueToday > 0 ? ` · ${leads.dueToday} to call` : ""}
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="px-5 py-4">
              <p className="text-[13.5px] text-muted">
                Nothing waiting. Walk-ins and the enquiry link land here first.
              </p>
              <Link href="/app/leads" className="mt-1.5 inline-flex min-h-[36px] items-center gap-1.5 text-[13.5px] font-semibold text-brand-600">
                Write one down <Icon name="arrow" size={15} />
              </Link>
              {won.length > 0 && (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {won.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 py-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700">
                        <Icon name="check" size={14} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{l.full_name}</span>
                      <span className="shrink-0 text-[12px] text-muted">Became a student</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((l) => (
                <li key={l.id}>
                  <Link
                    href="/app/leads"
                    className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-wash/60"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${priority[(l.priority as keyof typeof priority)] ?? "bg-line-2"}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{l.full_name}</span>
                      <span className="block truncate text-[12.5px] text-muted">
                        {[l.destination, l.study_level, l.source ? sourceOf(normaliseSource(l.source)).label : null].filter(Boolean).join(" · ") || "No details yet"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[12.5px] text-ink-2">{l.owner_name ?? "Nobody yet"}</span>
                      <span className="block text-[11.5px] text-muted">{whenText(l.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* the day, and the month so far */}
        <div className="flex flex-col gap-4">
          <article className={`settle rounded-2xl border p-5 ${clockedIn ? "border-teal-500/40 bg-teal-100" : "border-line bg-panel"}`}>
            <div className="flex items-center gap-2.5">
              <span className={`grid h-10 w-10 place-items-center rounded-full ${clockedIn ? "bg-teal-500 text-white" : "bg-wash text-muted"}`}>
                <Icon name="clock" size={19} />
              </span>
              <div className="min-w-0">
                <div className="h-tight text-[16px] text-ink">{clockedIn ? "You are clocked in" : "Not clocked in"}</div>
                <div className="text-[12.5px] text-muted">{clockedIn ? "Clock out when you leave." : "Start your day here."}</div>
              </div>
            </div>
            <Link
              href="/app/attendance"
              className={`mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold transition-colors ${
                clockedIn ? "border border-teal-700/30 text-teal-700 hover:bg-white" : "bg-brand-500 text-white hover:bg-brand-600"
              }`}
            >
              {clockedIn ? "Clock out" : "Clock in"} <Icon name="arrow" size={15} />
            </Link>
          </article>

          <article className="settle rounded-2xl border border-line bg-panel p-5">
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Every enquiry so far</div>
            <dl className="mt-3 flex flex-col gap-2.5">
              {[
                { k: "Still open", v: leads.open, fill: "bg-tint-sky-ink" },
                { k: "Became students", v: leads.converted, fill: "bg-tint-mint-ink" },
                { k: "Did not go ahead", v: leads.lost, fill: "bg-tint-peach-ink" },
              ].map((r) => (
                <div key={r.k} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.fill}`} aria-hidden />
                  <dt className="flex-1 truncate text-[13px] text-ink-2">{r.k}</dt>
                  <dd className="num text-[15px] font-semibold text-ink">{r.v}</dd>
                </div>
              ))}
            </dl>
            <Link href="/app/reports" className="mt-3.5 inline-flex min-h-[36px] items-center gap-1.5 text-[13px] font-semibold text-brand-600">
              Full reports <Icon name="arrow" size={15} />
            </Link>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------- the glances */}
      <section aria-labelledby="numbers" className="flex flex-col gap-3">
        <h2 id="numbers" className="h-tight text-[15px] text-ink-2">The rest of it</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {tiles.filter((t) => t.label !== focus.label).map((t) => (
            <Link
              key={t.label} href={t.href}
              className={`group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 transition-colors ${
                t.loud ? `border-transparent ${t.tint}` : "border-line bg-panel hover:bg-wash/50"
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-[3px] ${t.bar}`} aria-hidden />
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${t.tint} ${t.ink}`}>
                <Icon name={t.icon} size={17} />
              </span>
              <span className="min-w-0">
                {/* No truncation on a label: "NO COUNSEL..." on a phone is a
                    word nobody can act on. It wraps instead. */}
                <span className="block text-[11.5px] font-semibold uppercase leading-tight tracking-[0.06em] text-muted">{t.label}</span>
                <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span className={`num text-[22px] font-semibold leading-none ${t.loud ? t.ink : "text-ink"}`}>{t.value}</span>
                  <span className="text-[12px] leading-tight text-muted">{t.note}</span>
                </span>
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
