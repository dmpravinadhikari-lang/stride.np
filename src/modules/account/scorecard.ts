import "server-only";
import { all, scalar } from "@/lib/db";
import { localDay, monthStartDay } from "@/lib/dates";

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
 * up here, beside the streak of days clocked in, with badges to reach for.
 */

export type Badge = {
  id: string;
  label: string;
  /** What it took, said plainly, so the next one is never a mystery. */
  how: string;
  got: number;
  need: number;
  tint: string;
  ink: string;
  /** Named in full, never built by string surgery: Tailwind only ships classes it can see. */
  fill: string;
  icon: "flame" | "inbox" | "tasks" | "students" | "pen" | "cap" | "spark" | "clock";
};

export type Scorecard = {
  month: string;
  streak: number;
  daysIn: number;
  hours: number;
  tasksDone: number;
  leadsWon: number;
  notes: number;
  moved: number;
  points: number;
  level: { n: number; label: string; into: number; span: number };
  badges: Badge[];
};

/** Consecutive days with a shift, counting back from today or yesterday. */
function streakOf(userId: string): number {
  const days = all<{ day: string }>(
    `SELECT DISTINCT day FROM shifts WHERE user_id = ? ORDER BY day DESC LIMIT 200`,
    userId,
  ).map((r) => r.day);
  if (days.length === 0) return 0;

  const today = localDay();
  const step = (day: string, back: number) => {
    const [y, m, d] = day.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d - back));
    return t.toISOString().slice(0, 10);
  };
  // A streak may end today or yesterday: at nine in the morning nobody has
  // clocked in yet, and a counter that resets overnight would punish that.
  let cursor = days[0] === today ? today : days[0] === step(today, 1) ? step(today, 1) : null;
  if (!cursor) return 0;

  const seen = new Set(days);
  let n = 0;
  while (seen.has(cursor)) {
    n += 1;
    cursor = step(cursor, 1);
  }
  return n;
}

/** Five steps, each roughly a month of steady work above the last. */
const LEVELS = [
  { at: 0, label: "Settling in" },
  { at: 40, label: "Finding the rhythm" },
  { at: 120, label: "Holding the desk" },
  { at: 260, label: "Running the floor" },
  { at: 500, label: "The one they ask" },
];

export function myScorecard(userId: string, tenantId: string): Scorecard {
  const from = monthStartDay();
  const fromStamp = `${from}T00:00:00`;

  const daysIn = scalar(
    "SELECT COUNT(DISTINCT day) FROM shifts WHERE user_id = ? AND day >= ?", userId, from,
  );
  const minutes = scalar(
    "SELECT COALESCE(SUM(minutes), 0) FROM shifts WHERE user_id = ? AND day >= ?", userId, from,
  );
  const tasksDone = scalar(
    `SELECT COUNT(*) FROM tasks
      WHERE tenant_id = ? AND done_by = ? AND status = 'done' AND done_at >= ?`,
    tenantId, userId, fromStamp,
  );
  const leadsWon = scalar(
    `SELECT COUNT(*) FROM leads
      WHERE tenant_id = ? AND owner_id = ? AND status = 'converted' AND updated_at >= ?`,
    tenantId, userId, fromStamp,
  );
  const notes = scalar(
    `SELECT COUNT(*) FROM pipeline_notes
      WHERE tenant_id = ? AND author_id = ? AND kind = 'note' AND created_at >= ?`,
    tenantId, userId, fromStamp,
  );
  const moved = scalar(
    `SELECT COUNT(*) FROM activity_log
      WHERE tenant_id = ? AND actor_id = ? AND kind = 'stage.changed' AND created_at >= ?`,
    tenantId, userId, fromStamp,
  );
  const streak = streakOf(userId);

  // A converted enquiry is worth more than a note, because it is worth more
  // to the office. Nothing here is worth anything unless it was real work.
  const points = leadsWon * 15 + moved * 6 + tasksDone * 4 + notes * 2 + daysIn * 2;

  const idx = LEVELS.reduce((n, l, i) => (points >= l.at ? i : n), 0);
  const next = LEVELS[idx + 1];
  const level = {
    n: idx + 1,
    label: LEVELS[idx].label,
    into: points - LEVELS[idx].at,
    span: next ? next.at - LEVELS[idx].at : Math.max(1, points - LEVELS[idx].at),
  };

  const badges: Badge[] = [
    {
      id: "streak", label: "On time", how: "Five working days clocked in a row",
      got: streak, need: 5, icon: "flame",
      tint: "bg-tint-peach", ink: "text-tint-peach-ink", fill: "bg-tint-peach-ink",
    },
    {
      id: "leads", label: "Closer", how: "Turn three enquiries into students this month",
      got: leadsWon, need: 3, icon: "inbox",
      tint: "bg-tint-sky", ink: "text-tint-sky-ink", fill: "bg-tint-sky-ink",
    },
    {
      id: "tasks", label: "Cleared", how: "Finish twenty tasks this month",
      got: tasksDone, need: 20, icon: "tasks",
      tint: "bg-tint-amber", ink: "text-tint-amber-ink", fill: "bg-tint-amber-ink",
    },
    {
      id: "moved", label: "Mover", how: "Move ten students a stage forward",
      got: moved, need: 10, icon: "students",
      tint: "bg-tint-lilac", ink: "text-tint-lilac-ink", fill: "bg-tint-lilac-ink",
    },
    {
      id: "notes", label: "Writes it down", how: "Leave thirty notes on student files",
      got: notes, need: 30, icon: "pen",
      tint: "bg-tint-mint", ink: "text-tint-mint-ink", fill: "bg-tint-mint-ink",
    },
    {
      id: "days", label: "Present", how: "Be in on twenty days this month",
      got: daysIn, need: 20, icon: "clock",
      tint: "bg-tint-rose", ink: "text-tint-rose-ink", fill: "bg-tint-rose-ink",
    },
  ];

  return {
    month: new Date().toLocaleDateString("en-GB", { month: "long", timeZone: "Asia/Kathmandu" }),
    streak, daysIn,
    hours: Math.round(minutes / 6) / 10,
    tasksDone, leadsWon, notes, moved,
    points, level, badges,
  };
}
