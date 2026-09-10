import { all, now, run, uid } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";

/**
 * One row per application, per institution.
 *
 * The pipeline gives a student a single stage, which is the right summary but
 * the wrong detail: a student applies to four or six places at once and each
 * one moves on its own timetable. A counsellor cannot run their week from a
 * summary, and this is the table they actually work from.
 */

export type Application = {
  id: string;
  tenant_id: string;
  student_id: string;
  partner_id: string | null;
  institution: string;
  course: string | null;
  destination: string | null;
  intake: string | null;
  status: string;
  tuition_npr: number | null;
  deadline: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export const APPLICATION_STATUSES = [
  { id: "planned",     label: "Planned",      tone: "grey",   blurb: "Chosen, not sent yet." },
  { id: "submitted",   label: "Submitted",    tone: "brand",  blurb: "With the institution, waiting." },
  { id: "conditional", label: "Conditional",  tone: "gold",   blurb: "Offer subject to conditions." },
  { id: "offer",       label: "Offer",        tone: "teal",   blurb: "Unconditional offer in hand." },
  { id: "accepted",    label: "Accepted",     tone: "teal",   blurb: "Offer accepted, deposit paid." },
  { id: "rejected",    label: "Rejected",     tone: "danger", blurb: "Turned down." },
  { id: "deferred",    label: "Deferred",     tone: "gold",   blurb: "Moved to a later intake." },
  { id: "withdrawn",   label: "Withdrawn",    tone: "grey",   blurb: "Pulled by the student." },
] as const;

export const statusOf = (id: string) =>
  APPLICATION_STATUSES.find((s) => s.id === id) ?? APPLICATION_STATUSES[0];

/** Which statuses mean the student is still in play at that institution. */
export const OPEN_STATUSES = ["planned", "submitted", "conditional", "offer"];

export const applicationsFor = (scope: Scope, studentId: string): Application[] =>
  all<Application>(
    `SELECT * FROM applications
      WHERE tenant_id = ? AND student_id = ?
      ORDER BY CASE status
                 WHEN 'accepted' THEN 0 WHEN 'offer' THEN 1
                 WHEN 'conditional' THEN 2 WHEN 'submitted' THEN 3
                 WHEN 'planned' THEN 4 ELSE 5 END,
               COALESCE(deadline, '9999'), institution`,
    scope.tenantId, studentId,
  );

/** Everything open across the branch, soonest deadline first. */
export const openApplications = (scope: Scope) =>
  all<Application & { student_name: string }>(
    `SELECT a.*, u.full_name AS student_name
       FROM applications a JOIN users u ON u.id = a.student_id
      WHERE a.tenant_id = ? AND a.status IN ('planned','submitted','conditional','offer')
      ORDER BY COALESCE(a.deadline, '9999'), u.full_name`,
    scope.tenantId,
  );

export function createApplication(
  scope: Scope,
  input: { studentId: string; institution: string; partnerId?: string | null } & Partial<Application>,
): string {
  const id = uid();
  const t = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
  };
  run(
    `INSERT INTO applications
       (id, tenant_id, student_id, partner_id, institution, course, destination,
        intake, status, tuition_npr, deadline, note, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, scope.tenantId, input.studentId, input.partnerId ?? null,
    input.institution.trim(), t(input.course), t(input.destination), t(input.intake),
    input.status ?? "planned", input.tuition_npr ?? null, t(input.deadline), t(input.note),
    now(), now(),
  );
  return id;
}

export function setApplicationStatus(scope: Scope, id: string, status: string): void {
  if (!APPLICATION_STATUSES.some((s) => s.id === status)) return;
  run(
    "UPDATE applications SET status = ?, updated_at = ? WHERE tenant_id = ? AND id = ?",
    status, now(), scope.tenantId, id,
  );
}

/**
 * The pipeline stage a student's applications imply.
 *
 * Derived rather than typed in, so a counsellor who records an offer does not
 * then have to remember to move the student's stage as well. Returns null when
 * the applications say nothing useful, leaving whatever a human set alone.
 */
export function impliedStage(apps: Application[]): string | null {
  if (apps.length === 0) return null;
  if (apps.some((a) => a.status === "accepted")) return "offer";
  if (apps.some((a) => a.status === "offer" || a.status === "conditional")) return "offer";
  if (apps.some((a) => a.status === "submitted")) return "applying";
  if (apps.some((a) => a.status === "planned")) return "applying";
  return null;
}
