import { all, one, now, run, uid } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";

/**
 * What the institutions owe, and whether it has arrived.
 *
 * The product already tracked money going out, in payroll, and nothing at all
 * coming in. A partner carried a commission rate and a note saying when it
 * was payable, and then the trail stopped: no consultancy could open
 * OfficeYak and answer "which placements have we been paid for".
 *
 * That is the question the business runs on. Commission is earned when a
 * student is placed and arrives months later, often the following year, and
 * the gap between those two dates is where consultancies run out of cash
 * while believing they are profitable. An office that cannot see the gap
 * cannot plan around it.
 *
 * Four states, and the order matters:
 *
 *   expected     the student is placed, the money is not yet claimable
 *   invoiced     claimed from the institution, now waiting
 *   received     it arrived, with the amount that actually arrived
 *   written_off  it is not coming, and we are saying so rather than
 *                carrying it forever as a figure that flatters the year
 *
 * Received records its own amount rather than assuming the expected figure.
 * Commission arrives short more often than anyone plans for: a scholarship
 * reduced the tuition it was calculated on, or a currency moved, or the
 * institution applied a deduction nobody had noticed in the agreement.
 * Recording what was expected and what came separately is what lets an owner
 * find out that a partner routinely pays ninety percent of what it agreed.
 *
 * Visibility: this is money, so it follows `money:view` and never appears to
 * a counsellor. A counsellor who knows which institution pays best has been
 * given a reason to recommend it.
 */

export type CommissionStatus = "expected" | "invoiced" | "received" | "written_off";

export const COMMISSION_STATUSES: { id: CommissionStatus; label: string; blurb: string }[] = [
  { id: "expected", label: "Expected", blurb: "Placed. Not claimable yet." },
  { id: "invoiced", label: "Invoiced", blurb: "Claimed, waiting to be paid." },
  { id: "received", label: "Received", blurb: "The money arrived." },
  { id: "written_off", label: "Written off", blurb: "It is not coming." },
];

export type Commission = {
  id: string;
  tenant_id: string;
  application_id: string | null;
  partner_id: string | null;
  student_id: string | null;
  expected_npr: number;
  received_npr: number | null;
  status: CommissionStatus;
  invoiced_on: string | null;
  received_on: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  /* Joined for display, so a list needs one query rather than one per row. */
  student_name?: string | null;
  partner_name?: string | null;
  institution?: string | null;
  intake?: string | null;
};

const SELECT = `
  SELECT c.*,
         u.full_name   AS student_name,
         p.name        AS partner_name,
         a.institution AS institution,
         a.intake      AS intake
    FROM commissions c
    LEFT JOIN users        u ON u.id = c.student_id
    LEFT JOIN partners     p ON p.id = c.partner_id
    LEFT JOIN applications a ON a.id = c.application_id
   WHERE c.tenant_id = ?`;

/** Everything, newest first, for the money screen. */
export const commissionsFor = (scope: Scope): Commission[] =>
  all<Commission>(`${SELECT} ORDER BY c.created_at DESC`, scope.tenantId);

/**
 * The summary an owner actually wants: what is owed, what is chased, what
 * arrived, and how much of the year's expectation has not turned up.
 */
export function commissionSummary(scope: Scope) {
  const rows = commissionsFor(scope);
  const sum = (f: (c: Commission) => number) => rows.reduce((t, c) => t + f(c), 0);

  const expected = rows.filter((c) => c.status === "expected");
  const invoiced = rows.filter((c) => c.status === "invoiced");
  const received = rows.filter((c) => c.status === "received");
  const writtenOff = rows.filter((c) => c.status === "written_off");

  /*
   * An invoice that has been out for more than sixty days is the number worth
   * a phone call. Institutions are not withholding it; it is usually sitting
   * with somebody who is waiting to be asked.
   */
  const sixtyDaysAgo = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const overdue = invoiced.filter((c) => (c.invoiced_on ?? "") < sixtyDaysAgo);

  const receivedTotal = sum((c) => (c.status === "received" ? (c.received_npr ?? 0) : 0));
  const receivedExpected = sum((c) => (c.status === "received" ? c.expected_npr : 0));

  return {
    rows,
    expected: { count: expected.length, npr: expected.reduce((t, c) => t + c.expected_npr, 0) },
    invoiced: { count: invoiced.length, npr: invoiced.reduce((t, c) => t + c.expected_npr, 0) },
    received: { count: received.length, npr: receivedTotal },
    writtenOff: { count: writtenOff.length, npr: writtenOff.reduce((t, c) => t + c.expected_npr, 0) },
    overdue: { count: overdue.length, npr: overdue.reduce((t, c) => t + c.expected_npr, 0), rows: overdue },
    /*
     * What proportion of what was agreed actually arrived. Below about ninety
     * five percent and something systematic is happening rather than the odd
     * scholarship, which is worth taking to the partner.
     */
    shortfallPct:
      receivedExpected > 0 ? Math.round(((receivedExpected - receivedTotal) / receivedExpected) * 100) : 0,
  };
}

/**
 * Placements with no commission recorded against them.
 *
 * This is the part that makes the feature usable rather than another ledger
 * to keep by hand. An accepted application to a partner with an agreed rate
 * is money the consultancy is owed, whether or not anybody wrote it down, so
 * the screen offers it rather than waiting to be told.
 */
export type Candidate = {
  application_id: string;
  student_id: string;
  student_name: string;
  partner_id: string | null;
  partner_name: string | null;
  institution: string;
  intake: string | null;
  tuition_npr: number | null;
  commission_rate: number | null;
  suggested_npr: number;
};

export function uninvoicedPlacements(scope: Scope): Candidate[] {
  return all<Candidate>(
    `SELECT a.id            AS application_id,
            a.student_id    AS student_id,
            u.full_name     AS student_name,
            a.partner_id    AS partner_id,
            p.name          AS partner_name,
            a.institution   AS institution,
            a.intake        AS intake,
            a.tuition_npr   AS tuition_npr,
            p.commission_rate AS commission_rate,
            CAST(COALESCE(a.tuition_npr, 0) * COALESCE(p.commission_rate, 0) / 100 AS INTEGER) AS suggested_npr
       FROM applications a
       JOIN users u    ON u.id = a.student_id
       LEFT JOIN partners p ON p.id = a.partner_id
      WHERE a.tenant_id = ?
        AND a.status = 'accepted'
        AND NOT EXISTS (SELECT 1 FROM commissions c WHERE c.application_id = a.id)
      ORDER BY a.updated_at DESC`,
    scope.tenantId,
  );
}

export function recordCommission(
  scope: Scope,
  input: { applicationId?: string | null; studentId?: string | null; partnerId?: string | null; expectedNpr: number; note?: string | null },
): string {
  const id = uid();
  const t = now();
  run(
    `INSERT INTO commissions (id, tenant_id, application_id, partner_id, student_id, expected_npr, status, note, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    id, scope.tenantId, input.applicationId ?? null, input.partnerId ?? null, input.studentId ?? null,
    Math.max(0, Math.round(input.expectedNpr)), "expected", input.note ?? null, t, t,
  );
  return id;
}

/**
 * Moving a commission along. The date is set from the transition rather than
 * asked for, because a date field somebody has to fill in is a date field
 * that ends up holding the day the form was submitted anyway.
 */
export function setCommissionStatus(
  scope: Scope,
  id: string,
  status: CommissionStatus,
  receivedNpr?: number | null,
): boolean {
  const existing = one<Commission>("SELECT * FROM commissions WHERE id = ? AND tenant_id = ?", id, scope.tenantId);
  if (!existing) return false;

  const today = new Date().toISOString().slice(0, 10);
  run(
    `UPDATE commissions
        SET status = ?,
            invoiced_on = CASE WHEN ? = 'invoiced' AND invoiced_on IS NULL THEN ? ELSE invoiced_on END,
            received_on = CASE WHEN ? = 'received' THEN ? ELSE received_on END,
            received_npr = CASE WHEN ? = 'received' THEN ? ELSE received_npr END,
            updated_at = ?
      WHERE id = ? AND tenant_id = ?`,
    status, status, today, status, today, status,
    // Falling back to the expected figure when none is typed keeps the common
    // case one click, and the shortfall reading honest when one is.
    status === "received" ? Math.round(receivedNpr ?? existing.expected_npr) : null,
    now(), id, scope.tenantId,
  );
  return true;
}

export function deleteCommission(scope: Scope, id: string): void {
  run("DELETE FROM commissions WHERE id = ? AND tenant_id = ?", id, scope.tenantId);
}
