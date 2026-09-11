import { all, now, one, run, scalar, uid } from "@/lib/db";
import { branchFilter, type Scope } from "@/lib/db/scope";
import { monthRange, type Calendar } from "@/modules/payroll/nepali-month";

/**
 * Payroll.
 *
 * A run is prepared as a draft, checked, then marked paid, at which point it
 * is locked. Nothing about a paid run changes afterwards, because a payslip
 * that can be edited after it was issued is not a payslip.
 */

export type PayrollPerson = {
  id: string; user_id: string | null; name: string; position: string | null;
  monthly_salary: number | null; bank_name: string | null; bank_account: string | null;
  pan: string | null; pay_scheme: string; active: number; branch_id: string | null;
};

export type PayrollRun = {
  id: string; branch_id: string | null; branch_name: string | null;
  month: string; calendar: Calendar; status: string;
  created_at: string; paid_at: string | null;
};

export type PayrollLine = {
  id: string; person_id: string; name: string; position: string | null;
  basic: number; allowance: number; bonus: number;
  ssf: number; pf: number; tds: number; cit: number; advance: number;
  other: number; other_label: string | null;
  days_expected: number | null; days_present: number | null; days_absent: number | null;
  note: string | null;
};

export const gross = (l: PayrollLine) => l.basic + l.allowance + l.bonus;
export const deductions = (l: PayrollLine) => l.ssf + l.pf + l.tds + l.cit + l.advance + l.other;
export const net = (l: PayrollLine) => gross(l) - deductions(l);

export const peopleFor = (scope: Scope): PayrollPerson[] => {
  const b = branchFilter(scope);
  return all<PayrollPerson>(
    `SELECT id, user_id, name, position, monthly_salary, bank_name, bank_account,
            pan, pay_scheme, active, branch_id
       FROM payroll_people
      WHERE tenant_id = ? AND active = 1${b.sql}
      ORDER BY name`,
    scope.tenantId, ...b.params,
  );
};

export const runsFor = (scope: Scope): PayrollRun[] => {
  const b = branchFilter(scope, "r");
  return all<PayrollRun>(
    `SELECT r.id, r.branch_id, br.name AS branch_name, r.month, r.calendar,
            r.status, r.created_at, r.paid_at
       FROM payroll_runs r LEFT JOIN branches br ON br.id = r.branch_id
      WHERE r.tenant_id = ?${b.sql}
      ORDER BY r.month DESC, br.name`,
    scope.tenantId, ...b.params,
  );
};

export const runById = (scope: Scope, id: string): PayrollRun | null =>
  one<PayrollRun>(
    `SELECT r.id, r.branch_id, br.name AS branch_name, r.month, r.calendar,
            r.status, r.created_at, r.paid_at
       FROM payroll_runs r LEFT JOIN branches br ON br.id = r.branch_id
      WHERE r.id = ? AND r.tenant_id = ?`,
    id, scope.tenantId,
  );

export const linesFor = (runId: string): PayrollLine[] =>
  all<PayrollLine>(
    `SELECT l.*, p.name, p.position
       FROM payroll_lines l JOIN payroll_people p ON p.id = l.person_id
      WHERE l.run_id = ? ORDER BY p.name`,
    runId,
  );

/**
 * Open a run for a month, filling in each person's basic pay and the
 * attendance they worked.
 *
 * The attendance figures are written into the line here and never read again,
 * so approving a late clock-in next week cannot silently change a payslip that
 * has already gone out.
 */
export function openRun(
  scope: Scope,
  input: { branchId: string; month: string; calendar: Calendar },
): { id: string | null; reason?: string } {
  const existing = one<{ id: string }>(
    "SELECT id FROM payroll_runs WHERE tenant_id = ? AND branch_id = ? AND month = ?",
    scope.tenantId, input.branchId, input.month,
  );
  if (existing) return { id: existing.id, reason: "That month is already open." };

  const range = monthRange(input.month, input.calendar);
  if (!range) return { id: null, reason: `${input.month} is not a month this understands.` };

  const runId = uid();
  run(
    `INSERT INTO payroll_runs (id, tenant_id, branch_id, month, calendar, status, created_by, created_at)
     VALUES (?,?,?,?,?, 'draft', ?, ?)`,
    runId, scope.tenantId, input.branchId, input.month, input.calendar, scope.userId, now(),
  );

  const people = all<PayrollPerson>(
    `SELECT id, user_id, name, monthly_salary, pay_scheme FROM payroll_people
      WHERE tenant_id = ? AND branch_id = ? AND active = 1`,
    scope.tenantId, input.branchId,
  );

  // Working days in the month for this branch: every day that is not a
  // recorded holiday. Deliberately simple, and stored rather than recomputed.
  const holidays = scalar(
    `SELECT COUNT(*) FROM holidays
      WHERE tenant_id = ? AND date BETWEEN ? AND ?`,
    scope.tenantId, range.from, range.to,
  );
  const totalDays =
    Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / 864e5) + 1;
  const expected = Math.max(0, totalDays - holidays);

  for (const p of people) {
    const present = p.user_id
      ? scalar(
          `SELECT COUNT(DISTINCT day) FROM shifts
            WHERE user_id = ? AND day BETWEEN ? AND ?`,
          p.user_id, range.from, range.to,
        )
      : 0;

    run(
      `INSERT INTO payroll_lines
         (id, run_id, person_id, basic, days_expected, days_present, days_absent, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid(), runId, p.id, p.monthly_salary ?? 0,
      expected, present, Math.max(0, expected - present), now(),
    );
  }

  return { id: runId };
}

const NUMERIC = [
  "basic", "allowance", "bonus", "ssf", "pf", "tds", "cit", "advance", "other",
] as const;

export function updateLine(
  scope: Scope, runId: string, lineId: string, patch: Record<string, unknown>,
): boolean {
  // A paid run is locked. This is the only place that enforces it, so it is
  // checked here rather than trusted to the page.
  const r = one<{ status: string }>(
    "SELECT status FROM payroll_runs WHERE id = ? AND tenant_id = ?", runId, scope.tenantId,
  );
  if (!r || r.status !== "draft") return false;

  const sets: string[] = [];
  const params: Array<string | number | null> = [];
  for (const k of NUMERIC) {
    if (patch[k] === undefined) continue;
    const n = Math.max(0, Math.round(Number(patch[k]) || 0));
    sets.push(`${k} = ?`); params.push(n);
  }
  for (const k of ["other_label", "note"]) {
    if (patch[k] === undefined) continue;
    sets.push(`${k} = ?`); params.push(String(patch[k] ?? "").trim() || null);
  }
  if (sets.length === 0) return false;
  sets.push("updated_at = ?"); params.push(now(), lineId, runId);
  run(`UPDATE payroll_lines SET ${sets.join(", ")} WHERE id = ? AND run_id = ?`, ...params);
  return true;
}

export function markPaid(scope: Scope, runId: string): boolean {
  const r = one<{ status: string }>(
    "SELECT status FROM payroll_runs WHERE id = ? AND tenant_id = ?", runId, scope.tenantId,
  );
  if (!r || r.status !== "draft") return false;
  run(
    "UPDATE payroll_runs SET status = 'paid', paid_by = ?, paid_at = ? WHERE id = ?",
    scope.userId, now(), runId,
  );
  return true;
}
