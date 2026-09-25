import "server-only";
import { all, now, one, run, uid } from "@/lib/db";
import { branchFilter, visibilityFilter, type Scope } from "@/lib/db/scope";
import { localDay } from "@/lib/dates";

/**
 * Enquiries, before they are students.
 *
 * The difference matters for two reasons. A walk-in who gives a name and a
 * number cannot be an account, because an account needs an email and an
 * invented one is an address reminders go to for two years. And an owner
 * counting students wants students, not everybody who ever put their head
 * round the door.
 *
 * A lead becomes a student the moment somebody commits, and the conversion
 * writes the link both ways so neither list double counts the same person.
 */

export type Lead = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  destination: string | null;
  study_level: string | null;
  intake: string | null;
  english_test: string | null;
  source: string | null;
  priority: string | null;
  note: string | null;
  owner_id: string | null;
  owner_name: string | null;
  status: string;
  follow_up_on: string | null;
  student_id: string | null;
  channel: string;
  branch_id: string | null;
  branch_name: string | null;
  created_at: string;
};

const SELECT = `
  SELECT l.id, l.full_name, l.phone, l.email, l.destination, l.study_level, l.intake,
         l.english_test, l.source, l.priority, l.note, l.owner_id, l.status,
         l.follow_up_on, l.student_id, l.channel, l.branch_id, l.created_at,
         o.full_name AS owner_name, b.name AS branch_name
    FROM leads l
    LEFT JOIN users o ON o.id = l.owner_id
    LEFT JOIN branches b ON b.id = l.branch_id`;

export type LeadFilter = { status?: string; mine?: boolean; branchId?: string; due?: boolean };

export function listLeads(scope: Scope, filter: LeadFilter = {}): Lead[] {
  const where = ["l.tenant_id = ?"];
  const params: Array<string | number> = [scope.tenantId];
  // Office, or only their own enquiries when the consultancy has held them
  // to that. An enquiry nobody owns is still shown to anybody at the office,
  // because an unclaimed walk-in that only a manager can see is a walk-in
  // that waits for the manager.
  const v = visibilityFilter(scope, { alias: "l", ownerCol: "owner_id" });
  if (v.sql) {
    where.push(
      (scope.see ?? "office") === "own"
        ? `(l.owner_id = ? OR l.owner_id IS NULL)${branchFilter(scope, "l").sql}`
        : v.sql.replace(/^ AND /, ""),
    );
    params.push(...v.params);
  }
  if (filter.branchId && scope.allBranches) { where.push("l.branch_id = ?"); params.push(filter.branchId); }
  if (filter.status) { where.push("l.status = ?"); params.push(filter.status); }
  else where.push("l.status IN ('new','contacted')");   // open enquiries by default
  if (filter.mine) { where.push("l.owner_id = ?"); params.push(scope.userId); }
  if (filter.due) { where.push("l.follow_up_on IS NOT NULL AND l.follow_up_on <= ?"); params.push(localDay()); }

  return all<Lead>(
    `${SELECT} WHERE ${where.join(" AND ")}
      ORDER BY CASE l.priority WHEN 'hot' THEN 0 WHEN 'warm' THEN 1 ELSE 2 END,
               l.created_at DESC`,
    ...params,
  );
}

export const getLead = (scope: Scope, id: string): Lead | null => {
  const b = branchFilter(scope, "l");
  return one<Lead>(`${SELECT} WHERE l.id = ? AND l.tenant_id = ?${b.sql}`, id, scope.tenantId, ...b.params);
};

export const leadCounts = (scope: Scope) => {
  const b = branchFilter(scope, "l");
  const rows = all<{ status: string; n: number }>(
    `SELECT status, COUNT(*) n FROM leads l WHERE l.tenant_id = ?${b.sql} GROUP BY status`,
    scope.tenantId, ...b.params,
  );
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
  const converted = byStatus.converted ?? 0;
  const lost = byStatus.lost ?? 0;
  const today = localDay();
  return {
    ...byStatus,
    converted,
    lost,
    open: (byStatus.new ?? 0) + (byStatus.contacted ?? 0),
    dueToday: all<{ n: number }>(
      `SELECT COUNT(*) n FROM leads l
        WHERE l.tenant_id = ? AND l.status IN ('new','contacted')
          AND l.follow_up_on IS NOT NULL AND l.follow_up_on <= ?${b.sql}`,
      scope.tenantId, today, ...b.params,
    )[0]?.n ?? 0,
    todayNew: all<{ n: number }>(
      `SELECT COUNT(*) n FROM leads l WHERE l.tenant_id = ? AND substr(l.created_at,1,10) = ?${b.sql}`,
      scope.tenantId, today, ...b.params,
    )[0]?.n ?? 0,
  };
};

/**
 * Writing an enquiry down.
 *
 * Called from the reception tablet, where nobody is logged in, so it takes
 * the consultancy and office explicitly rather than from a session. Only a
 * name and a phone number are required, by design.
 */
export function createLead(input: {
  tenantId: string;
  branchId: string | null;
  fullName: string;
  phone: string;
  email?: string | null;
  destination?: string | null;
  studyLevel?: string | null;
  intake?: string | null;
  englishTest?: string | null;
  source?: string | null;
  note?: string | null;
  channel?: string;
  ownerId?: string | null;
  priority?: string | null;
}): string | null {
  const name = input.fullName.trim();
  const phone = input.phone.trim();
  if (name.length < 2 || phone.length < 6) return null;

  const id = uid();
  run(
    `INSERT INTO leads
       (id, tenant_id, branch_id, full_name, phone, email, destination, study_level, intake,
        english_test, source, priority, note, owner_id, status, follow_up_on, channel, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'new', ?, ?, ?, ?)`,
    id, input.tenantId, input.branchId, name, phone, input.email?.trim() || null,
    input.destination || null, input.studyLevel || null, input.intake || null,
    input.englishTest || null, input.source || null, input.priority || null,
    input.note?.trim() || null, input.ownerId || null,
    // Somebody standing at the desk expects a call, so it lands on today's
    // list rather than waiting for a person to remember to set a date.
    localDay(), input.channel ?? "walk_in", now(), now(),
  );
  return id;
}

export function updateLead(
  scope: Scope, id: string,
  patch: Partial<Record<"status" | "priority" | "owner_id" | "follow_up_on" | "note" | "email", string | null>>,
) {
  const COLUMNS = ["status", "priority", "owner_id", "follow_up_on", "note", "email"] as const;
  const sets: string[] = [];
  const params: Array<string | null> = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || !COLUMNS.includes(k as (typeof COLUMNS)[number])) continue;
    sets.push(`${k} = ?`);
    params.push(v === "" ? null : v);
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  params.push(now());
  const b = branchFilter(scope, "leads");
  run(
    `UPDATE leads SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?${b.sql}`,
    ...params, id, scope.tenantId, ...b.params,
  );
}

/** Ties the enquiry to the student file it became. */
export const markConverted = (scope: Scope, id: string, studentId: string) =>
  run(
    "UPDATE leads SET status = 'converted', student_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
    studentId, now(), id, scope.tenantId,
  );
