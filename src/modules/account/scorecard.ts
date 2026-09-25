import "server-only";
import { all, one, scalar } from "@/lib/db";
import { addDays, localDay, monthStartDay } from "@/lib/dates";

/**
 * Your own month, counted.
 *
 * A deliberate rule runs through this file: it counts what a person did, and
 * never what their colleagues did. There is no leaderboard, no ranking and no
 * way to open somebody else's card. A counsellor whose office is quiet in
 * Baisakh is not failing, and a scoreboard would say they were.
 *
 * What it is for is the opposite of a ranking: the work an office runs on,
 * calls made, notes written, files moved forward, is invisible the moment it
 * is done, and a month of it leaves nothing behind to look at. So it is added
 * up here, beside the streak of days clocked in, with badges to reach for and
 * last month to beat, which is the only opponent this file will give anybody.
 */

export type Tier = 0 | 1 | 2 | 3;

export type Badge = {
  id: string;
  /** The family name. The tier is drawn beside it, not baked into it. */
  label: string;
  /** What the work is, in the words an office uses. */
  how: string;
  got: number;
  /** Three rungs. The third is meant to be hard. */
  steps: [number, number, number];
  tier: Tier;
  /** The next rung, or nothing when all three are done. */
  next: number | null;
  tint: string;
  ink: string;
  /** Named in full, never built by string surgery: Tailwind only ships classes it can see. */
  fill: string;
  icon: "flame" | "inbox" | "tasks" | "students" | "pen" | "clock";
};

/** One square in the fortnight strip. */
export type DayMark = {
  day: string;
  /** Mon, Tue... one letter is ambiguous in a strip this small. */
  initial: string;
  worked: boolean;
  /** The office was shut: a weekend or a festival. It cannot break a streak. */
  off: boolean;
  offName: string | null;
  today: boolean;
  points: number;
};

export type Scorecard = {
  month: string;
  streak: number;
  /** The longest run this person has ever had, so a streak lost is not lost work. */
  bestStreak: number;
  daysIn: number;
  hours: number;
  tasksDone: number;
  leadsWon: number;
  notes: number;
  moved: number;
  points: number;
  lastMonthPoints: number;
  level: { n: number; label: string; into: number; span: number };
  fortnight: DayMark[];
  badges: Badge[];
};

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dowOf = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** Five steps, each roughly a month of steady work above the last. */
const LEVELS = [
  { at: 0, label: "Settling in" },
  { at: 40, label: "Finding the rhythm" },
  { at: 120, label: "Holding the desk" },
  { at: 260, label: "Running the floor" },
  { at: 500, label: "The one they ask" },
];

const tierOf = (got: number, steps: [number, number, number]): Tier =>
  got >= steps[2] ? 3 : got >= steps[1] ? 2 : got >= steps[0] ? 1 : 0;

/** A day's work, weighted by what it is worth to the office. */
const pointsFor = (x: { leads: number; moved: number; tasks: number; notes: number; worked: boolean }) =>
  x.leads * 15 + x.moved * 6 + x.tasks * 4 + x.notes * 2 + (x.worked ? 2 : 0);

/** Rolls a "one row per day" query into a lookup. */
const byDay = (rows: Array<{ d: string; n: number }>) =>
  new Map(rows.map((r) => [r.d, r.n]));

export function myScorecard(userId: string, tenantId: string): Scorecard {
  const today = localDay();
  const from = monthStartDay();
  // Last month, to beat. The day before the first of this month is the last
  // day of the one before it, whatever length that month happened to be.
  const lastTo = from;
  const lastFrom = monthStartDay(new Date(`${addDays(from, -1)}T12:00:00Z`));

  // A window wide enough for the strip and the streak, in one pass each.
  const since = addDays(today, -60);

  const workedDays = new Set(
    all<{ day: string }>(
      "SELECT DISTINCT day FROM shifts WHERE user_id = ? ORDER BY day DESC LIMIT 400", userId,
    ).map((r) => r.day),
  );

  /*
   * The days the office is shut, which must not break a streak.
   *
   * Nepal's weekend is Saturday, and the year is full of festivals an office
   * closes for. Counting those as missed days would mean nobody in the
   * country could ever hold a streak through Dashain, which would make the
   * whole thing a joke rather than an encouragement.
   */
  const branch = one<{ weekend_days: string | null; branch_id: string | null }>(
    `SELECT b.weekend_days, u.branch_id FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id WHERE u.id = ?`,
    userId,
  );
  const weekend = new Set(
    (branch?.weekend_days ?? "6").split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)),
  );
  const holidays = new Map(
    all<{ date: string; name: string }>(
      `SELECT date, name FROM holidays
        WHERE tenant_id = ? AND date >= ? AND (branch_id IS NULL OR branch_id = ?)`,
      tenantId, since, branch?.branch_id ?? "",
    ).map((r) => [r.date, r.name]),
  );
  const closed = (day: string) =>
    weekend.has(dowOf(day)) ? "Weekly off" : holidays.get(day) ?? null;

  /* ------------------------------------------------------------ the streak */

  const runFrom = (start: string): number => {
    let cursor = start;
    let n = 0;
    // 120 is a generous ceiling; the loop always ends on a working day missed.
    for (let i = 0; i < 120; i += 1) {
      if (workedDays.has(cursor)) n += 1;
      else if (!closed(cursor)) break;
      cursor = addDays(cursor, -1);
    }
    return n;
  };
  // Today counts if it has been worked. If it has not, the streak is measured
  // to yesterday: at half past nine nobody has clocked in yet, and a counter
  // that resets overnight would punish the person who is on their way in.
  const streak = runFrom(workedDays.has(today) || closed(today) ? today : addDays(today, -1));

  let bestStreak = streak;
  for (const day of workedDays) {
    if (day > today) continue;
    bestStreak = Math.max(bestStreak, runFrom(day));
  }

  /* ------------------------------------------------- what happened per day */

  const tasksPerDay = byDay(all<{ d: string; n: number }>(
    `SELECT substr(done_at,1,10) d, COUNT(*) n FROM tasks
      WHERE tenant_id = ? AND done_by = ? AND status = 'done' AND done_at >= ? GROUP BY d`,
    tenantId, userId, since,
  ));
  const leadsPerDay = byDay(all<{ d: string; n: number }>(
    `SELECT substr(updated_at,1,10) d, COUNT(*) n FROM leads
      WHERE tenant_id = ? AND owner_id = ? AND status = 'converted' AND updated_at >= ? GROUP BY d`,
    tenantId, userId, since,
  ));
  const notesPerDay = byDay(all<{ d: string; n: number }>(
    `SELECT substr(created_at,1,10) d, COUNT(*) n FROM pipeline_notes
      WHERE tenant_id = ? AND author_id = ? AND kind = 'note' AND created_at >= ? GROUP BY d`,
    tenantId, userId, since,
  ));
  const movedPerDay = byDay(all<{ d: string; n: number }>(
    `SELECT substr(created_at,1,10) d, COUNT(*) n FROM activity_log
      WHERE tenant_id = ? AND actor_id = ? AND kind = 'stage.changed' AND created_at >= ? GROUP BY d`,
    tenantId, userId, since,
  ));

  const dayPoints = (day: string) => pointsFor({
    leads: leadsPerDay.get(day) ?? 0,
    moved: movedPerDay.get(day) ?? 0,
    tasks: tasksPerDay.get(day) ?? 0,
    notes: notesPerDay.get(day) ?? 0,
    worked: workedDays.has(day),
  });

  const fortnight: DayMark[] = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(today, i - 13);
    const off = closed(day);
    return {
      day,
      initial: WEEKDAY[dowOf(day)],
      worked: workedDays.has(day),
      off: Boolean(off) && !workedDays.has(day),
      offName: off,
      today: day === today,
      points: dayPoints(day),
    };
  });

  /* --------------------------------------------------------- the month sum */

  const inMonth = (m: Map<string, number>, start: string, end: string) => {
    let n = 0;
    for (const [d, v] of m) if (d >= start && d < end) n += v;
    return n;
  };
  const endExclusive = addDays(today, 1);

  const daysIn = [...workedDays].filter((d) => d >= from && d < endExclusive).length;
  const tasksDone = inMonth(tasksPerDay, from, endExclusive);
  const leadsWon = inMonth(leadsPerDay, from, endExclusive);
  const notes = inMonth(notesPerDay, from, endExclusive);
  const moved = inMonth(movedPerDay, from, endExclusive);

  const points = pointsFor({ leads: leadsWon, moved, tasks: tasksDone, notes, worked: false }) + daysIn * 2;
  const lastMonthPoints = pointsFor({
    leads: inMonth(leadsPerDay, lastFrom, lastTo),
    moved: inMonth(movedPerDay, lastFrom, lastTo),
    tasks: inMonth(tasksPerDay, lastFrom, lastTo),
    notes: inMonth(notesPerDay, lastFrom, lastTo),
    worked: false,
  }) + [...workedDays].filter((d) => d >= lastFrom && d < lastTo).length * 2;

  const minutes = scalar(
    "SELECT COALESCE(SUM(minutes), 0) FROM shifts WHERE user_id = ? AND day >= ?", userId, from,
  );

  const idx = LEVELS.reduce((n, l, i) => (points >= l.at ? i : n), 0);
  const next = LEVELS[idx + 1];
  const level = {
    n: idx + 1,
    label: LEVELS[idx].label,
    into: points - LEVELS[idx].at,
    span: next ? next.at - LEVELS[idx].at : Math.max(1, points - LEVELS[idx].at),
  };

  const badge = (
    b: Omit<Badge, "tier" | "next">,
  ): Badge => {
    const tier = tierOf(b.got, b.steps);
    return { ...b, tier, next: tier === 3 ? null : b.steps[tier] };
  };

  const badges: Badge[] = [
    badge({
      id: "streak", label: "On time", how: "Working days clocked in a row",
      got: streak, steps: [3, 7, 14], icon: "flame",
      tint: "bg-tint-peach", ink: "text-tint-peach-ink", fill: "bg-tint-peach-ink",
    }),
    badge({
      id: "leads", label: "Closer", how: "Enquiries you turned into students",
      got: leadsWon, steps: [1, 3, 8], icon: "inbox",
      tint: "bg-tint-sky", ink: "text-tint-sky-ink", fill: "bg-tint-sky-ink",
    }),
    badge({
      id: "tasks", label: "Cleared", how: "Tasks finished this month",
      got: tasksDone, steps: [10, 25, 50], icon: "tasks",
      tint: "bg-tint-amber", ink: "text-tint-amber-ink", fill: "bg-tint-amber-ink",
    }),
    badge({
      id: "moved", label: "Mover", how: "Students moved a stage forward",
      got: moved, steps: [5, 15, 30], icon: "students",
      tint: "bg-tint-lilac", ink: "text-tint-lilac-ink", fill: "bg-tint-lilac-ink",
    }),
    badge({
      id: "notes", label: "Writes it down", how: "Notes left on student files",
      got: notes, steps: [10, 30, 60], icon: "pen",
      tint: "bg-tint-mint", ink: "text-tint-mint-ink", fill: "bg-tint-mint-ink",
    }),
    badge({
      id: "days", label: "Present", how: "Days in the office this month",
      got: daysIn, steps: [8, 16, 24], icon: "clock",
      tint: "bg-tint-rose", ink: "text-tint-rose-ink", fill: "bg-tint-rose-ink",
    }),
  ];

  return {
    month: new Date().toLocaleDateString("en-GB", { month: "long", timeZone: "Asia/Kathmandu" }),
    streak, bestStreak, daysIn,
    hours: Math.round(minutes / 6) / 10,
    tasksDone, leadsWon, notes, moved,
    points, lastMonthPoints, level, fortnight, badges,
  };
}

/**
 * The office's own month, for the person who runs it.
 *
 * Deliberately a total and not a list of people. An owner asking "how did we
 * do" gets one number the whole office shares; an owner wanting to know who
 * did what opens Reports, where it is presented as work rather than as sport.
 */
export function officeMonth(tenantId: string) {
  const from = monthStartDay();
  return {
    leadsWon: scalar(
      "SELECT COUNT(*) FROM leads WHERE tenant_id = ? AND status = 'converted' AND updated_at >= ?",
      tenantId, `${from}T00:00:00`,
    ),
    newLeads: scalar(
      "SELECT COUNT(*) FROM leads WHERE tenant_id = ? AND created_at >= ?",
      tenantId, `${from}T00:00:00`,
    ),
  };
}
