import { localDay } from "@/lib/dates";
import { all, now, one, run, uid } from "@/lib/db";
import { branchFilter, type Scope } from "@/lib/db/scope";
import { verifyAt, type BranchPlace, type Fix } from "@/modules/attendance/geofence";

/**
 * The register.
 *
 * Two tables do the work. `attendance` is every clock event including the
 * refused ones, append-only, because a register that keeps only the successes
 * cannot answer why somebody's month looks short. `shifts` is the worked day
 * that a clock-in opens and a clock-out closes.
 */

export type OpenShift = { id: string; day: string; started_at: string };

export const today = () => localDay();

export function branchPlace(tenantId: string, branchId: string | null): BranchPlace | null {
  if (!branchId) return null;
  return one<BranchPlace>(
    `SELECT lat, lng, radius_m, accuracy_allowance_m, name
       FROM branches WHERE id = ? AND tenant_id = ?`,
    branchId, tenantId,
  );
}

/** The shift a person currently has open, if any. */
export const openShift = (scope: Scope): OpenShift | null =>
  one<OpenShift>(
    `SELECT id, day, started_at FROM shifts
      WHERE user_id = ? AND tenant_id = ? AND ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1`,
    scope.userId, scope.tenantId,
  );

type ClockInput = {
  /** What the day went on, written at the moment somebody closes it. */
  note?: string | null;
  fix: Fix | null;
  /** Required when somebody is outside the radius and clocking anyway. */
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type ClockResult = {
  ok: boolean;
  within: boolean;
  distance: number;
  message: string;
  /** True when the caller must supply a reason and try again. */
  needsReason?: boolean;
};

function record(
  scope: Scope, kind: "clock_in" | "clock_out",
  decision: "allowed" | "denied", v: ReturnType<typeof verifyAt>, input: ClockInput,
) {
  run(
    `INSERT INTO attendance
       (id, tenant_id, branch_id, user_id, kind, decision, reason, lat, lng,
        accuracy_m, distance_m, within, ip, user_agent, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    uid(), scope.tenantId, scope.branchId ?? null, scope.userId, kind, decision,
    input.reason ?? v.reason ?? null,
    input.fix?.lat ?? null, input.fix?.lng ?? null,
    input.fix?.accuracy ?? null,
    v.distance >= 0 ? v.distance : null,
    v.within ? 1 : 0,
    input.ip ?? null, (input.userAgent ?? "").slice(0, 300) || null, now(),
  );
}

export function clockIn(scope: Scope, input: ClockInput): ClockResult {
  if (openShift(scope)) {
    return { ok: false, within: false, distance: -1, message: "You are already clocked in." };
  }

  const place = branchPlace(scope.tenantId, scope.branchId);
  const v = verifyAt(place ?? { lat: null, lng: null, radius_m: null, accuracy_allowance_m: null }, input.fix);

  // Outside the radius is not automatically a refusal. People genuinely work
  // from a university fair or a partner's office, and a system that simply
  // says no teaches them to stop using it. It asks why instead, and the
  // answer goes on the record for a manager to read.
  if (!v.within && !input.reason) {
    record(scope, "clock_in", "denied", v, input);
    return {
      ok: false, within: false, distance: v.distance,
      message: v.reason ?? "You do not appear to be at the office.",
      needsReason: true,
    };
  }

  record(scope, "clock_in", "allowed", v, input);
  run(
    `INSERT INTO shifts (id, tenant_id, branch_id, user_id, day, started_at, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    uid(), scope.tenantId, scope.branchId ?? null, scope.userId, today(), now(), now(),
  );

  return {
    ok: true, within: v.within, distance: v.distance,
    message: v.within ? "Clocked in." : "Clocked in, away from the office. Your reason is on the record.",
  };
}

/**
 * What the office got done, day by day, in the words of whoever did it.
 *
 * Deliberately not counted, ranked or coloured. There is no target and no
 * word limit to hit, so a quiet Friday reads as a quiet Friday. What it is
 * for is remembering which files moved and who sat with the walk-in.
 */
export const workLog = (scope: Scope, from: string, to: string) => {
  const b = branchFilter(scope, "s");
  return all<{ day: string; full_name: string; branch_name: string | null; note: string; minutes: number | null }>(
    `SELECT s.day, u.full_name, br.name AS branch_name, s.note, s.minutes
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN branches br ON br.id = s.branch_id
      WHERE s.tenant_id = ? AND s.day BETWEEN ? AND ?
        AND s.note IS NOT NULL AND TRIM(s.note) <> ''${b.sql}
      ORDER BY s.day DESC, u.full_name`,
    scope.tenantId, from, to, ...b.params,
  );
};

export function clockOut(scope: Scope, input: ClockInput): ClockResult {
  const open = openShift(scope);
  if (!open) {
    return { ok: false, within: false, distance: -1, message: "You are not clocked in." };
  }

  const place = branchPlace(scope.tenantId, scope.branchId);
  const v = verifyAt(place ?? { lat: null, lng: null, radius_m: null, accuracy_allowance_m: null }, input.fix);

  // Clocking out is never refused. Refusing it would leave a shift open
  // forever and punish somebody for leaving, which helps nobody. The location
  // is still recorded, so a pattern of clocking out from home is visible.
  record(scope, "clock_out", "allowed", v, input);

  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(open.started_at).getTime()) / 60000),
  );
  run(
    "UPDATE shifts SET ended_at = ?, minutes = ?, note = ? WHERE id = ?",
    now(), minutes, input.note ?? null, open.id,
  );

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return {
    ok: true, within: v.within, distance: v.distance,
    message: `Clocked out. ${h}h ${m}m today.`,
  };
}

/* ------------------------------------------------------------ reporting -- */

export type DayRow = {
  user_id: string;
  full_name: string;
  day: string;
  minutes: number | null;
  started_at: string;
  ended_at: string | null;
  branch_name: string | null;
  away: number;
};

/** Every shift in a range, for whoever may see this branch. */
export function shiftsBetween(scope: Scope, from: string, to: string): DayRow[] {
  const b = branchFilter(scope, "s");
  return all<DayRow>(
    `SELECT s.user_id, u.full_name, s.day, s.minutes, s.started_at, s.ended_at,
            br.name AS branch_name,
            (SELECT COUNT(*) FROM attendance a
              WHERE a.user_id = s.user_id AND a.kind = 'clock_in'
                AND a.within = 0 AND a.decision = 'allowed'
                AND substr(a.created_at,1,10) = s.day) AS away
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN branches br ON br.id = s.branch_id
      WHERE s.tenant_id = ? AND s.day >= ? AND s.day <= ?${b.sql}
      ORDER BY s.day DESC, u.full_name`,
    scope.tenantId, from, to, ...b.params,
  );
}

export type PersonSummary = {
  user_id: string;
  full_name: string;
  branch_name: string | null;
  days: number;
  minutes: number;
  away_days: number;
  short_days: number;
};

/**
 * The HR report.
 *
 * Days present, hours worked, and two columns that are the point of the whole
 * thing: how often somebody clocked in from outside the office, and how many
 * days came in under the branch's own full day.
 */
export function hrSummary(scope: Scope, from: string, to: string, fullDayMinutes = 480): PersonSummary[] {
  const b = branchFilter(scope, "s");
  return all<PersonSummary>(
    `SELECT s.user_id, u.full_name, br.name AS branch_name,
            COUNT(DISTINCT s.day)                   AS days,
            COALESCE(SUM(s.minutes), 0)             AS minutes,
            COALESCE(SUM(CASE WHEN s.minutes IS NOT NULL AND s.minutes < ?
                              THEN 1 ELSE 0 END), 0) AS short_days,
            (SELECT COUNT(DISTINCT substr(a.created_at,1,10)) FROM attendance a
              WHERE a.user_id = s.user_id AND a.kind = 'clock_in'
                AND a.within = 0 AND a.decision = 'allowed'
                AND substr(a.created_at,1,10) BETWEEN ? AND ?) AS away_days
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN branches br ON br.id = s.branch_id
      WHERE s.tenant_id = ? AND s.day >= ? AND s.day <= ?${b.sql}
      GROUP BY s.user_id, u.full_name, br.name
      ORDER BY br.name, u.full_name`,
    fullDayMinutes, from, to, scope.tenantId, from, to, ...b.params,
  );
}

/** The refusals and the away-from-office clock-ins, which a manager reads. */
export const exceptions = (scope: Scope, from: string, to: string) => {
  const b = branchFilter(scope, "a");
  return all<{
    full_name: string; kind: string; decision: string; reason: string | null;
    distance_m: number | null; created_at: string; branch_name: string | null;
  }>(
    `SELECT u.full_name, a.kind, a.decision, a.reason, a.distance_m, a.created_at,
            br.name AS branch_name
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN branches br ON br.id = a.branch_id
      WHERE a.tenant_id = ? AND substr(a.created_at,1,10) BETWEEN ? AND ?
        AND (a.decision = 'denied' OR a.within = 0)${b.sql}
      ORDER BY a.created_at DESC LIMIT 100`,
    scope.tenantId, from, to, ...b.params,
  );
};

/**
 * Who is in, right now, across the offices this person can see.
 *
 * The owner's first question every morning, and until now it could only be
 * answered by opening the attendance screen and reading a table. It belongs on
 * the dashboard: three counts and a row of faces, and the detail is one press
 * away.
 *
 * Deliberately not a judgement. It says clocked in, finished, or not in yet,
 * and it does not say "late", because the office decides what late means and
 * a dashboard that scolds people is a dashboard they learn to resent.
 */
export type OnFloor = {
  id: string;
  full_name: string;
  branch_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  minutes: number | null;
};

export function whoIsIn(scope: Scope, day = localDay()): OnFloor[] {
  const b = branchFilter(scope, "u");
  return all<OnFloor>(
    `SELECT u.id, u.full_name, br.name AS branch_name,
            s.started_at, s.ended_at, s.minutes
       FROM users u
       LEFT JOIN branches br ON br.id = u.branch_id
       LEFT JOIN shifts s ON s.user_id = u.id AND s.day = ?
      WHERE u.tenant_id = ? AND u.active = 1
        AND u.role IN ('counsellor','tenant_admin')${b.sql}
      ORDER BY CASE WHEN s.started_at IS NOT NULL AND s.ended_at IS NULL THEN 0
                    WHEN s.started_at IS NOT NULL THEN 1 ELSE 2 END,
               br.name, u.full_name`,
    day, scope.tenantId, ...b.params,
  );
}
