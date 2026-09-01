import { all, now, run, uid } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";

/**
 * The audit trail behind every student file.
 *
 * A consultancy is selling diligence. When a parent asks what has been done
 * for the money, or an owner asks why a file sat still for three weeks, the
 * answer has to be on the record rather than in somebody's memory. Everything
 * that happens to a student writes one line here.
 *
 * Two deliberate choices:
 *
 *  - `actor_label` stores the person's name as text at the time of the event.
 *    Joining to users() would make the timeline read "unknown" the day a
 *    counsellor leaves and their account is deactivated — exactly when an
 *    accurate history matters most.
 *
 *  - Nothing here is ever updated or deleted. A record that can be edited
 *    after a complaint is not a record.
 */

export type ActivityKind =
  | "account.created"
  | "account.invited"
  | "account.first_login"
  | "profile.updated"
  | "stage.changed"
  | "counsellor.assigned"
  | "action.set"
  | "note.added"
  | "module.changed"
  | "doc.uploaded"
  | "doc.verified"
  | "doc.rejected"
  | "doc.deleted"
  | "practice.interview"
  | "practice.mock_test"
  | "practice.sop"
  | "parent.link_created"
  | "parent.link_revoked"
  | "email.sent";

export type Activity = {
  id: string;
  student_id: string | null;
  actor_id: string | null;
  actor_label: string;
  kind: ActivityKind;
  summary: string;
  detail: string | null;
  created_at: string;
};

/**
 * Record one event. Deliberately forgiving: an audit write must never be the
 * reason a student's upload fails, so a failure here is swallowed rather than
 * thrown. A missing line in the log is a smaller problem than a broken action.
 */
export function logActivity(
  scope: Pick<Scope, "tenantId">,
  entry: {
    studentId?: string | null;
    actorId?: string | null;
    actorLabel: string;
    kind: ActivityKind;
    summary: string;
    detail?: unknown;
  },
): void {
  try {
    run(
      `INSERT INTO activity_log (id, tenant_id, student_id, actor_id, actor_label, kind, summary, detail, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      uid(),
      scope.tenantId,
      entry.studentId ?? null,
      entry.actorId ?? null,
      entry.actorLabel,
      entry.kind,
      entry.summary,
      entry.detail === undefined ? null : JSON.stringify(entry.detail),
      now(),
    );
  } catch {
    // Intentionally silent — see the note above.
  }
}

/** The timeline for one student, newest first. */
export function activityFor(scope: Pick<Scope, "tenantId">, studentId: string, limit = 100): Activity[] {
  return all<Activity>(
    `SELECT id, student_id, actor_id, actor_label, kind, summary, detail, created_at
       FROM activity_log
      WHERE tenant_id = ? AND student_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
    scope.tenantId, studentId, limit,
  );
}

/** Everything happening across the consultancy — the CRM's front page. */
export function recentActivity(scope: Pick<Scope, "tenantId">, limit = 60): Array<Activity & { student_name: string | null }> {
  return all<Activity & { student_name: string | null }>(
    `SELECT a.id, a.student_id, a.actor_id, a.actor_label, a.kind, a.summary, a.detail, a.created_at,
            u.full_name AS student_name
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.student_id
      WHERE a.tenant_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?`,
    scope.tenantId, limit,
  );
}

/** How an event is drawn in a timeline: an icon and a tone. */
export const ACTIVITY_STYLE: Record<string, { icon: string; tint: string }> = {
  "account.created":     { icon: "👤", tint: "sky" },
  "account.invited":     { icon: "✉️", tint: "sky" },
  "account.first_login": { icon: "🔓", tint: "mint" },
  "profile.updated":     { icon: "✏️", tint: "lilac" },
  "stage.changed":       { icon: "→",  tint: "brand" },
  "counsellor.assigned": { icon: "🧑‍🏫", tint: "lilac" },
  "action.set":          { icon: "⏰", tint: "amber" },
  "note.added":          { icon: "💬", tint: "wash" },
  "module.changed":      { icon: "🎛️", tint: "lilac" },
  "doc.uploaded":        { icon: "📎", tint: "sky" },
  "doc.verified":        { icon: "✓",  tint: "mint" },
  "doc.rejected":        { icon: "!",  tint: "rose" },
  "doc.deleted":         { icon: "🗑️", tint: "wash" },
  "practice.interview":  { icon: "🎙️", tint: "rose" },
  "practice.mock_test":  { icon: "📝", tint: "sky" },
  "practice.sop":        { icon: "✍️", tint: "lilac" },
  "parent.link_created": { icon: "👪", tint: "mint" },
  "parent.link_revoked": { icon: "👪", tint: "wash" },
  "email.sent":          { icon: "✉️", tint: "sky" },
};

export const styleFor = (kind: string) => ACTIVITY_STYLE[kind] ?? { icon: "•", tint: "wash" };
