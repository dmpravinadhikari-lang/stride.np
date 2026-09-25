import { addDays, localDay } from "@/lib/dates";
import { all, now, one, run, uid } from "@/lib/db";
import { branchFilter, type Scope } from "@/lib/db/scope";

/**
 * Tasks.
 *
 * The pipeline has one `next_action` per student, which is one task per file
 * and no way for anyone to see their own day. This is the table a counsellor
 * actually works from, and the reason they open the product each morning.
 *
 * A task belongs to a person or to a team, never both. The team case is how
 * work survives somebody being on leave: it sits with the visa desk rather
 * than with Bikash, and whoever picks it up claims it.
 */

export type Task = {
  id: string;
  title: string;
  detail: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  team_id: string | null;
  team_name: string | null;
  student_id: string | null;
  student_name: string | null;
  due_on: string | null;
  priority: string;
  status: string;
  created_at: string;
};

const SELECT = `
  SELECT t.id, t.title, t.detail, t.assignee_id, t.team_id, t.student_id,
         t.due_on, t.priority, t.status, t.created_at,
         a.full_name AS assignee_name,
         g.name      AS team_name,
         s.full_name AS student_name
    FROM tasks t
    LEFT JOIN users a ON a.id = t.assignee_id
    LEFT JOIN teams g ON g.id = t.team_id
    LEFT JOIN users s ON s.id = t.student_id`;

/** Overdue first, then today, then the rest. Nothing without a date at the top. */
const ORDER = `
  ORDER BY CASE WHEN t.due_on IS NULL THEN 1 ELSE 0 END,
           t.due_on,
           CASE t.priority WHEN 'urgent' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END`;

/**
 * One person's day: what is theirs, plus anything sitting unclaimed with a
 * team they are on.
 */
export function myTasks(scope: Scope, includeDone = false): Task[] {
  const status = includeDone ? "" : " AND t.status = 'open'";
  return all<Task>(
    `${SELECT}
      WHERE t.tenant_id = ?${status}
        AND ( t.assignee_id = ?
              OR t.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?) )
      ${ORDER}`,
    scope.tenantId, scope.userId, scope.userId,
  );
}

/** Everything open in the branch, for whoever is running it. */
export function branchTasks(scope: Scope, filter?: { status?: string; branchId?: string }): Task[] {
  const b = branchFilter(scope, "t");
  const status = filter?.status ?? "open";
  // Head office can look at one office. Branch staff are already limited to
  // their own, and naming a branch here cannot widen that.
  const pick = filter?.branchId && scope.allBranches ? " AND t.branch_id = ?" : "";
  return all<Task>(
    `${SELECT} WHERE t.tenant_id = ? AND t.status = ?${b.sql}${pick} ${ORDER}`,
    scope.tenantId, status, ...b.params, ...(pick ? [filter!.branchId!] : []),
  );
}

export const tasksForStudent = (scope: Scope, studentId: string): Task[] =>
  all<Task>(
    `${SELECT} WHERE t.tenant_id = ? AND t.student_id = ? ${ORDER}`,
    scope.tenantId, studentId,
  );

export function createTask(
  scope: Scope,
  input: {
    title: string;
    detail?: string | null;
    assigneeId?: string | null;
    teamId?: string | null;
    studentId?: string | null;
    dueOn?: string | null;
    priority?: string;
  },
): string | null {
  const title = input.title.trim();
  if (title.length < 2) return null;

  // A task with no owner is a task nobody does. If the caller named neither a
  // person nor a team it falls to whoever created it, which is at least
  // someone.
  const assignee = input.assigneeId || (input.teamId ? null : scope.userId);

  const id = uid();
  run(
    `INSERT INTO tasks
       (id, tenant_id, branch_id, title, detail, assignee_id, team_id, student_id,
        due_on, priority, status, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?, 'open', ?,?,?)`,
    id, scope.tenantId, scope.branchId ?? null, title, input.detail?.trim() || null,
    assignee, input.teamId || null, input.studentId || null,
    input.dueOn || null, input.priority ?? "normal",
    scope.userId, now(), now(),
  );
  return id;
}

/** Returns the task as it was, so the caller can describe what changed. */
export function completeTask(scope: Scope, id: string): Task | null {
  const before = one<Task>(`${SELECT} WHERE t.id = ? AND t.tenant_id = ?`, id, scope.tenantId);
  if (!before) return null;
  run(
    "UPDATE tasks SET status = 'done', done_at = ?, done_by = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
    now(), scope.userId, now(), id, scope.tenantId,
  );
  return before;
}

/**
 * Taking a team task for yourself.
 *
 * Only possible while it is still unclaimed, so two people cannot both think
 * they have it. The team link is kept, so it is still visible as the visa
 * desk's work rather than disappearing into one person's list.
 */
export function claimTask(scope: Scope, id: string): boolean {
  const row = one<{ assignee_id: string | null }>(
    "SELECT assignee_id FROM tasks WHERE id = ? AND tenant_id = ? AND status = 'open'",
    id, scope.tenantId,
  );
  if (!row || row.assignee_id) return false;
  run(
    "UPDATE tasks SET assignee_id = ?, updated_at = ? WHERE id = ? AND assignee_id IS NULL",
    scope.userId, now(), id,
  );
  return true;
}

/** How a task reads relative to today. */
export function dueState(due: string | null): "none" | "overdue" | "today" | "soon" | "later" {
  if (!due) return "none";
  const today = localDay();
  if (due < today) return "overdue";
  if (due === today) return "today";
  const in3 = addDays(today, 3);
  return due <= in3 ? "soon" : "later";
}

export const teamsFor = (scope: Scope) => {
  const b = branchFilter(scope);
  return all<{ id: string; name: string }>(
    `SELECT id, name FROM teams WHERE tenant_id = ?${b.sql} ORDER BY name`,
    scope.tenantId, ...b.params,
  );
};

export const staffFor = (scope: Scope) => {
  const b = branchFilter(scope);
  return all<{ id: string; full_name: string }>(
    `SELECT id, full_name FROM users
      WHERE tenant_id = ? AND role IN ('counsellor','tenant_admin') AND active = 1${b.sql}
      ORDER BY full_name`,
    scope.tenantId, ...b.params,
  );
};
