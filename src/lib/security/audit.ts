import "server-only";
import { all, now, run, uid } from "@/lib/db";

/**
 * The trail: who looked at something private, and who changed what.
 *
 * Distinct from the activity log, which is the story of a student's file and
 * is written for counsellors to read. This is written for the day somebody
 * asks a harder question: who opened that family's bank statement, who gave
 * the new receptionist the payroll screen, whose account was it that
 * downloaded forty passports on a Saturday.
 *
 * Three rules keep it honest:
 *
 *   It records the act, never the contents. A row says a document was opened;
 *   it does not hold the document, or the salary, or the passport number.
 *   Nothing here is deleted by the product. There is no screen that removes a
 *   row, because a trail somebody can tidy is not a trail.
 *   Writing it never breaks the thing it is recording. An audit insert that
 *   throws would mean a failed database write could stop a counsellor doing
 *   their job, so it is wrapped and swallowed.
 */

export type AuditEntry = {
  tenantId: string;
  /** Who did it. Null only when the system itself did. */
  actorId: string | null;
  /** A short verb phrase: "payroll.viewed", "document.opened", "access.changed". */
  action: string;
  /** What it was done to: a user id, a document id, a pay run. */
  subjectId?: string | null;
  /** One line a person can read, with no private content in it. */
  detail?: string | null;
  ip?: string | null;
};

export function audit(e: AuditEntry): void {
  try {
    run(
      `INSERT INTO audit_log (id, tenant_id, actor_id, action, subject_id, detail, ip, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid(), e.tenantId, e.actorId, e.action, e.subjectId ?? null,
      e.detail ?? null, e.ip ?? null, now(),
    );
  } catch {
    /* Never break the operation being recorded. */
  }
}

/** Somebody's position or exceptions were changed by somebody else. */
export const logAccessChange = (input: {
  tenantId: string; actorId: string; subjectId: string; what: string; detail: string;
}) =>
  audit({
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: `access.${input.what}`,
    subjectId: input.subjectId,
    detail: input.detail,
  });

/**
 * A private screen was opened.
 *
 * Reads are recorded for the few areas where reading is itself the sensitive
 * act: payroll, documents, the audit trail. Recording every read of every
 * screen would produce a log nobody can search and would tell a reader
 * nothing.
 */
export const logSensitiveRead = (input: {
  tenantId: string; actorId: string; area: string; subjectId?: string | null; detail?: string;
}) =>
  audit({
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: `${input.area}.viewed`,
    subjectId: input.subjectId ?? null,
    detail: input.detail ?? null,
  });

export type AuditRow = {
  id: string; action: string; detail: string | null; created_at: string;
  actor_name: string | null; subject_name: string | null; ip: string | null;
};

/** The trail for one consultancy, newest first. */
export const recentAudit = (tenantId: string, limit = 100, action?: string): AuditRow[] =>
  all<AuditRow>(
    `SELECT a.id, a.action, a.detail, a.created_at, a.ip,
            actor.full_name AS actor_name, subject.full_name AS subject_name
       FROM audit_log a
       LEFT JOIN users actor ON actor.id = a.actor_id
       LEFT JOIN users subject ON subject.id = a.subject_id
      WHERE a.tenant_id = ?${action ? " AND a.action LIKE ?" : ""}
      ORDER BY a.created_at DESC LIMIT ?`,
    ...(action ? [tenantId, `${action}%`, limit] : [tenantId, limit]),
  );
