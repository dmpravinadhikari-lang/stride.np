import { all, now, run, scalar, uid } from "@/lib/db";
import { branchFilter, type Scope } from "@/lib/db/scope";

/**
 * The in-app bell.
 *
 * Distinct from the outbox in `notifications`, which is what we sent someone
 * by email or SMS. An alert is something waiting for a person inside the app.
 *
 * Alerts are cheap and disposable. They are not a record of anything: the
 * activity log is the record, and losing an alert loses nothing. That is why
 * raising one never throws, and why it is safe to call from the middle of a
 * more important operation.
 */

export type Alert = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export function raiseAlert(
  scope: Pick<Scope, "tenantId" | "branchId">,
  input: {
    userId?: string | null;
    teamId?: string | null;
    kind: string;
    title: string;
    body?: string | null;
    href?: string | null;
    /**
     * Optional. A nightly job that raises "three documents outstanding" every
     * night would become noise nobody reads, so give those a key that is the
     * same each night and the second one is dropped.
     */
    dedupeKey?: string | null;
  },
): void {
  if (!input.userId && !input.teamId) return;   // nobody to tell
  try {
    run(
      `INSERT INTO alerts (id, tenant_id, branch_id, user_id, team_id, kind, title, body, href, dedupe_key, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      uid(), scope.tenantId, scope.branchId ?? null,
      input.userId ?? null, input.teamId ?? null,
      input.kind, input.title, input.body ?? null, input.href ?? null,
      input.dedupeKey ?? null, now(),
    );
  } catch {
    // A duplicate key, or anything else. An alert is never worth failing the
    // operation that raised it.
  }
}

/** Unread alerts for this person, including those sitting with their teams. */
export function alertsFor(scope: Scope, limit = 30): Alert[] {
  return all<Alert>(
    `SELECT a.id, a.kind, a.title, a.body, a.href, a.read_at, a.created_at
       FROM alerts a
      WHERE a.tenant_id = ?
        AND ( a.user_id = ?
              OR a.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?) )
        AND a.read_at IS NULL
      ORDER BY a.created_at DESC
      LIMIT ?`,
    scope.tenantId, scope.userId, scope.userId, limit,
  );
}

export const unreadCount = (scope: Scope): number =>
  scalar(
    `SELECT COUNT(*) FROM alerts
      WHERE tenant_id = ?
        AND ( user_id = ?
              OR team_id IN (SELECT team_id FROM team_members WHERE user_id = ?) )
        AND read_at IS NULL`,
    scope.tenantId, scope.userId, scope.userId,
  );

/** Clearing a team alert clears it for the whole team, which is the point. */
export function markRead(scope: Scope, id: string): void {
  run(
    `UPDATE alerts SET read_at = ?
      WHERE id = ? AND tenant_id = ?
        AND ( user_id = ?
              OR team_id IN (SELECT team_id FROM team_members WHERE user_id = ?) )`,
    now(), id, scope.tenantId, scope.userId, scope.userId,
  );
}

export function markAllRead(scope: Scope): void {
  run(
    `UPDATE alerts SET read_at = ?
      WHERE tenant_id = ? AND read_at IS NULL
        AND ( user_id = ?
              OR team_id IN (SELECT team_id FROM team_members WHERE user_id = ?) )`,
    now(), scope.tenantId, scope.userId, scope.userId,
  );
}

/** Everything raised across a branch, for an owner glancing at the office. */
export const branchAlerts = (scope: Scope, limit = 40) => {
  const b = branchFilter(scope, "a");
  return all<Alert & { who: string | null }>(
    `SELECT a.id, a.kind, a.title, a.body, a.href, a.read_at, a.created_at,
            u.full_name AS who
       FROM alerts a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.tenant_id = ?${b.sql}
      ORDER BY a.created_at DESC LIMIT ?`,
    scope.tenantId, ...b.params, limit,
  );
};
