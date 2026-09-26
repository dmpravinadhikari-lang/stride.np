import "server-only";
import { all } from "@/lib/db";
import { branchFilter, type Scope } from "@/lib/db/scope";
import { localDay, monthStartDay } from "@/lib/dates";
import { normaliseSource, type Source } from "@/modules/pipeline/sources";
import { type Stage } from "@/modules/pipeline/stages";

/**
 * The numbers an owner decides on.
 *
 * Two questions this answers that the day to day screens do not: which
 * channel is worth the money, and which files have stopped moving.
 */

/**
 * How long a file may sit in one stage before somebody should look at it.
 *
 * Time in the current stage, not age. Age flags every long file, and a
 * student on a September intake is legitimately with the office for a year.
 * Time in one stage flags the thing that actually goes wrong: nobody has
 * touched it. These are the office's own targets, never shown to a student.
 */
const STUCK_AFTER: Record<Stage, number | null> = {
  enquiry: 2,        // called back the same day or the next
  counselling: 21,
  test_prep: 90,     // a real IELTS run takes a term
  applying: 30,
  offer: 30,         // a deposit chased for weeks is how offers die
  visa: 60,
  departed: null,    // end states are never stuck
  lost: null,
};

export type StuckFile = {
  student_id: string; full_name: string; stage: Stage; branch_name: string | null;
  counsellor_name: string | null; since: string; days: number; limit: number;
};

/** Files sitting longer in their stage than the office allows for. */
export function stuckFiles(scope: Scope, limit = 25): StuckFile[] {
  const b = branchFilter(scope, "p");
  const rows = all<{
    student_id: string; full_name: string; stage: Stage; branch_name: string | null;
    counsellor_name: string | null; since: string;
  }>(
    `SELECT p.student_id, u.full_name, p.stage, br.name AS branch_name,
            c.full_name AS counsellor_name,
            COALESCE(
              (SELECT MAX(a.created_at) FROM activity_log a
                WHERE a.student_id = p.student_id AND a.kind = 'stage.changed'),
              p.created_at
            ) AS since
       FROM pipeline_entries p
       JOIN users u ON u.id = p.student_id
       LEFT JOIN users c ON c.id = p.counsellor_id
       LEFT JOIN branches br ON br.id = p.branch_id
      WHERE p.tenant_id = ? AND p.stage NOT IN ('departed','lost')${b.sql}`,
    scope.tenantId, ...b.params,
  );

  const today = Date.parse(`${localDay()}T00:00:00Z`);
  return rows
    .map((r) => {
      const cap = STUCK_AFTER[r.stage];
      if (cap === null) return null;
      const days = Math.floor((today - Date.parse(r.since)) / 864e5);
      return days > cap
        ? { ...r, days, limit: cap }
        : null;
    })
    .filter((r): r is StuckFile => r !== null)
    .sort((a, b2) => b2.days - a.days)
    .slice(0, limit);
}

export type SourceRow = {
  source: Source; students: number; departed: number; lost: number; open: number;
  /** Of the files that reached an end, how many ended with the student flying. */
  conversion: number | null;
};

/** Which channel actually produces students, not just phone numbers. */
export function bySource(scope: Scope): SourceRow[] {
  const b = branchFilter(scope, "p");
  const rows = all<{ source: string | null; stage: Stage; n: number }>(
    `SELECT p.source, p.stage, COUNT(*) n
       FROM pipeline_entries p
      WHERE p.tenant_id = ?${b.sql}
      GROUP BY p.source, p.stage`,
    scope.tenantId, ...b.params,
  );

  const acc = new Map<Source, SourceRow>();
  for (const r of rows) {
    const key = normaliseSource(r.source);
    const row = acc.get(key) ?? { source: key, students: 0, departed: 0, lost: 0, open: 0, conversion: null };
    row.students += r.n;
    if (r.stage === "departed") row.departed += r.n;
    else if (r.stage === "lost") row.lost += r.n;
    else row.open += r.n;
    acc.set(key, row);
  }
  return [...acc.values()]
    .map((r) => {
      const concluded = r.departed + r.lost;
      // A rate from two files is not a rate, so it is left empty rather than
      // printed as 50 percent next to a channel with two hundred.
      return { ...r, conversion: concluded >= 5 ? Math.round((r.departed / concluded) * 100) : null };
    })
    .sort((a, b2) => b2.students - a.students);
}

/** Files opened since the first of this month. */
export function newThisMonth(scope: Scope): number {
  const b = branchFilter(scope, "p");
  return all<{ n: number }>(
    `SELECT COUNT(*) n FROM pipeline_entries p
      WHERE p.tenant_id = ? AND p.created_at >= ?${b.sql}`,
    scope.tenantId, `${monthStartDay()}T00:00:00.000Z`, ...b.params,
  )[0]?.n ?? 0;
}

/** How many students each counsellor is carrying, and how much is late. */
export function counsellorLoad(scope: Scope) {
  const b = branchFilter(scope, "p");
  return all<{ id: string; full_name: string; branch_name: string | null; students: number; late: number }>(
    `SELECT c.id, c.full_name, br.name AS branch_name,
            COUNT(*) AS students,
            SUM(CASE WHEN p.next_action_due < ? THEN 1 ELSE 0 END) AS late
       FROM pipeline_entries p
       JOIN users c ON c.id = p.counsellor_id
       LEFT JOIN branches br ON br.id = c.branch_id
      WHERE p.tenant_id = ? AND p.stage NOT IN ('departed','lost')${b.sql}
      GROUP BY c.id
      ORDER BY students DESC`,
    localDay(), scope.tenantId, ...b.params,
  );
}

/** Where students are going, so a desk can be opened or closed on evidence. */
export function byDestination(scope: Scope) {
  const b = branchFilter(scope, "p");
  return all<{ destination: string | null; students: number; departed: number }>(
    `SELECT sp.target_country AS destination,
            COUNT(*) AS students,
            SUM(CASE WHEN p.stage = 'departed' THEN 1 ELSE 0 END) AS departed
       FROM pipeline_entries p
       LEFT JOIN student_profiles sp ON sp.user_id = p.student_id
      WHERE p.tenant_id = ?${b.sql}
      GROUP BY sp.target_country
      ORDER BY students DESC`,
    scope.tenantId, ...b.params,
  );
}
