import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { scopeOf } from "@/lib/auth/current";
import { scalar } from "@/lib/db";
import { localDay, whenText } from "@/lib/dates";
import { Alert, Card, Initials, PageHeader } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { recentActivity } from "@/lib/crm/activity";
import { activeProvider } from "@/lib/ai/provider";
import { openShift, whoIsIn } from "@/modules/attendance/data";
import { myTasks, dueState } from "@/modules/tasks/data";
import { listPipeline } from "@/modules/pipeline/data";
import { leadCounts, listLeads } from "@/modules/leads/data";
import { normaliseSource, sourceOf } from "@/modules/pipeline/sources";
import { myScorecard } from "@/modules/account/scorecard";
import { capabilitiesFor } from "@/lib/auth/access";

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

  /*
   * Home shows what this person is allowed to see, and nothing else.
   *
   * An accountant opening the console was being told how many students had
   * missed a follow-up, which is not their work and not their business. The
   * page asks the same permission layer every other screen asks rather than
   * assuming that anybody on the staff sees everything.
   */
  const caps = capabilitiesFor(user);
  const seesStudents = caps.has("students:view");
  const seesLeads = caps.has("leads:view");
  // Whoever runs an office asks one question first thing: who is in.
  const seesFloor = caps.has("attendance:view");
  const floor = seesFloor ? whoIsIn(scope) : [];
  const onFloor = floor.filter((p) => p.started_at && !p.ended_at);
  const finished = floor.filter((p) => p.ended_at);
  const notIn = floor.filter((p) => !p.started_at);

  const clockedIn = Boolean(openShift(scope));
  const tasks = myTasks(scope);
  const late = tasks.filter((t) => dueState(t.due_on) === "overdue").length;
  const dueToday = tasks.filter((t) => dueState(t.due_on) === "today").length;

  const students = seesStudents ? listPipeline(scope) : [];
  const today = localDay();
  const live = students.filter((r) => r.stage !== "departed" && r.stage !== "lost");
  const followUps = live.filter(
    (r) => r.next_action_due && r.next_action_due.slice(0, 10) < today,
  ).length;
  const unassigned = live.filter((r) => !r.counsellor_id).length;

  const leads = seesLeads
    ? leadCounts(scope)
    : { open: 0, converted: 0, lost: 0, dueToday: 0, todayNew: 0 } as ReturnType<typeof leadCounts>;
  const queue = seesLeads ? listLeads(scope).slice(0, 4) : [];
  // With nothing waiting, the card would be a paragraph and a lot of white.
  // The ones that recently became students are the honest thing to put there:
  // it is the same board, showing what it is for.
  const won = seesLeads && queue.length === 0 ? listLeads(scope, { status: "converted" }).slice(0, 3) : [];
  const feed = seesStudents ? recentActivity(scope, 6) : [];
  // Your own month, in one line. A scorecard nobody passes is not a
  // scorecard, and the account page is not a place anybody passes.
  const me = myScorecard(user.id, user.tenantId);
  const levelPct = Math.min(100, Math.round((me.level.into / me.level.span) * 100));

  // First-week setup, for whoever runs the consultancy. Each step is checked
  // against the data, so it disappears on its own once it is true.
  const offices = scalar("SELECT COUNT(*) FROM branches WHERE tenant_id = ? AND active = 1", user.tenantId);
  const setup = admin
    ? [
        {
          // An account with no offices at all was told its offices were
          // already pinned, because zero of them were missing a location.
          done: offices > 0 && scalar(
            "SELECT COUNT(*) FROM branches WHERE tenant_id = ? AND active = 1 AND lat IS NULL", user.tenantId,
          ) === 0,
          label: offices === 0 ? "Add your first office" : "Name your office and pin it",
          why: offices === 0
            ? "Staff, students and attendance all hang off an office."
            : "It is called Head office until you rename it. Pinning it lets staff clock in.",
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

  /*
   * Day one shows the work, not a wall of zeroes.
   *
   * A console opened for the first time had four cards reading 0, a streak
   * saying "no run going", a scorecard with no badges and a list of nobody's
   * attendance, with the only useful thing on the page, the setup checklist,
   * below all of it. Until there is something to count, the counting is
   * hidden and the checklist comes first.
   */
  const brandNew = live.length === 0 && leads.open === 0 && tasks.length === 0;

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
    ...(seesStudents ? [{
      icon: "alert" as const, label: "Follow-ups missed", value: followUps,
      note: followUps ? "Past the date agreed" : "Everyone on track",
      href: "/app/pipeline?late=1",
      tint: "bg-tint-peach", ink: "text-tint-peach-ink", bar: "bg-tint-peach-ink", loud: followUps > 0,
    },
    {
      icon: "students" as const, label: "No counsellor", value: unassigned,
      note: unassigned ? "Waiting to be handed out" : "All claimed",
      href: "/app/pipeline?unassigned=1",
      tint: "bg-tint-lilac", ink: "text-tint-lilac-ink", bar: "bg-tint-lilac-ink", loud: unassigned > 0,
    },
    {
      icon: "cap" as const, label: "Students on file", value: live.length,
      note: `${leads.converted} came from leads`,
      href: "/app/pipeline",
      tint: "bg-tint-mint", ink: "text-tint-mint-ink", bar: "bg-tint-mint-ink", loud: false,
    }] : []),
  ];

  const priority = { hot: "bg-danger-600", warm: "bg-accent-500", cold: "bg-line-2" } as const;

  // Written once, shown in one of two places: first thing on a new account,
  // and below the day's work once there is any.
  const setupBlock = (
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
  );

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
    followUps > 0 && seesStudents
      ? { label: "Follow-ups missed", n: followUps, said: followUps === 1 ? "student was promised a call that has not happened" : "students were promised a call that has not happened", cta: "See who", href: "/app/pipeline?late=1", bar: "bg-danger-600", ink: "text-danger-600" }
    : leads.open > 0 && seesLeads
      ? { label: "Student leads", n: leads.open, said: leads.open === 1 ? "enquiry is still open" : "enquiries are still open", cta: "Open the board", href: "/app/leads", bar: "bg-brand-500", ink: "text-brand-600" }
    : unassigned > 0 && seesStudents
      ? { label: "No counsellor", n: unassigned, said: unassigned === 1 ? "student is waiting to be handed to someone" : "students are waiting to be handed to someone", cta: "Hand them out", href: "/app/pipeline?unassigned=1", bar: "bg-tint-lilac-ink", ink: "text-tint-lilac-ink" }
    : late > 0
      ? { label: "Your tasks", n: late, said: late === 1 ? "of your tasks is past its date" : "of your tasks are past their date", cta: "Open tasks", href: "/app/tasks", bar: "bg-tint-amber-ink", ink: "text-tint-amber-ink" }
    : brandNew && seesStudents
      ? { label: "First student", n: 0, said: "students on file yet. Put the one you are helping today in.", cta: "Add a student", href: "/app/pipeline?add=1", bar: "bg-brand-500", ink: "text-brand-600" }
    : seesStudents
      ? { label: "All clear", n: live.length, said: "students on file, and nothing overdue", cta: "See the board", href: "/app/pipeline", bar: "bg-teal-500", ink: "text-teal-700" }
      // Somebody who does not work the files, an accountant or a marketing
      // officer, gets their own day rather than a number about students they
      // are not allowed to open.
      : { label: "Your day", n: tasks.length, said: tasks.length === 1 ? "task on your desk" : "tasks on your desk", cta: "Open tasks", href: "/app/tasks", bar: "bg-brand-500", ink: "text-brand-600" };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting()}, ${user.fullName.split(" ")[0]}`}
        sub={user.branchName ? `${user.tenantName}, ${user.branchName}` : user.tenantName}
      />

      {me.points > 0 && (
      <Link
        href="/app/profile"
        className="settle group flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-panel px-4 py-3 transition-colors hover:border-brand-400"
      >
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
          me.streak > 0 ? "bg-accent-500 text-ink" : "bg-wash text-muted"
        }`}>
          <Icon name="flame" size={15} />
          {me.streak > 0 ? `${me.streak} day${me.streak === 1 ? "" : "s"} in a row` : "No run going"}
        </span>

        <span className="min-w-[180px] flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-ink">{me.level.label}</span>
            <span className="shrink-0 tabular-nums text-[11.5px] text-muted">
              {me.points} pts in {me.month}
            </span>
          </span>
          <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-wash">
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${levelPct}%` }} />
          </span>
        </span>

        <span className="flex items-center gap-2">
          {/* The rungs you are on, at a glance. The card itself explains them. */}
          <span className="flex items-center gap-1">
            {me.badges.filter((b) => b.tier > 0).slice(0, 4).map((b) => (
              <span key={b.id} className={`grid h-7 w-7 place-items-center rounded-full ${b.tint} ${b.ink}`} title={b.label}>
                <Icon name={b.icon} size={14} />
              </span>
            ))}
            {me.badges.every((b) => b.tier === 0) && (
              <span className="text-[12.5px] text-muted">No badges yet</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 transition-[gap] group-hover:gap-2">
            Your month <Icon name="arrow" size={15} />
          </span>
        </span>
      </Link>
      )}

      {brandNew && setupLeft > 0 && (
        <section className="flex flex-col gap-4">
          <div className="settle rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4">
            <h2 className="h-tight text-[17px] text-brand-900">
              Welcome, {user.fullName.split(" ")[0]}. Three things and you are running.
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-ink-2">
              Name your office, add the people who work with you, then put your first student in.
              Everything else fills itself in as you work.
            </p>
          </div>
          {setupBlock}
        </section>
      )}

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
          {seesLeads && (
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
          )}

          {!seesLeads ? null : queue.length === 0 ? (
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

          {seesLeads && (
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
          )}
        </div>
      </section>

      {/* ------------------------------------------------------ who is in */}
      {seesFloor && !brandNew && floor.length > 1 && (
        <section aria-labelledby="floor" className="settle overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="floor" className="h-tight text-[15px] text-ink">Who is in today</h2>
              <span className="text-[12.5px] text-muted">
                <span className="font-semibold text-teal-700">{onFloor.length} in</span>
                {finished.length > 0 && <> · {finished.length} finished</>}
                {notIn.length > 0 && <> · {notIn.length} not in yet</>}
              </span>
            </div>
            <Link
              href="/app/attendance"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-[8px] px-2 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
            >
              The register <Icon name="arrow" size={15} />
            </Link>
          </div>

          <ul className="flex flex-wrap gap-2 px-5 py-4">
            {floor.map((p) => {
              const inNow = Boolean(p.started_at && !p.ended_at);
              const done = Boolean(p.ended_at);
              const since = p.started_at
                ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" })
                    .format(new Date(p.started_at))
                : null;
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-2.5 rounded-full border py-1 pl-1 pr-3.5 ${
                    inNow ? "border-teal-500/40 bg-teal-100" : done ? "border-line bg-panel" : "border-line bg-wash/60"
                  }`}
                  title={`${p.full_name}${p.branch_name ? `, ${p.branch_name}` : ""}`}
                >
                  <span className="relative">
                    <Initials name={p.full_name} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-panel ${
                        inNow ? "bg-teal-500" : done ? "bg-line-2" : "bg-accent-500"
                      }`}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {p.full_name.split(" ")[0]}
                    </span>
                    <span className={`block truncate text-[11.5px] ${inNow ? "text-teal-700" : "text-muted"}`}>
                      {inNow ? `In since ${since}` : done ? `${Math.round((p.minutes ?? 0) / 6) / 10}h, finished` : "Not in yet"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------- the glances */}
      {!brandNew && (
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
      )}

      {!brandNew && setupLeft > 0 && setupBlock}

      {seesStudents && (
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
      )}
    </div>
  );
}
