import { all, now, one, run, scalar, uid } from "@/lib/db";
import { branchFilter, type Scope } from "@/lib/db/scope";
import { localDay } from "@/lib/dates";
import { ACTIVE_STAGES, type Stage } from "@/modules/pipeline/stages";

/**
 * Staff-side queries.
 *
 * Everything here reads ACROSS students, which the student-facing repositories
 * deliberately never do. The wall is tenant_id: a counsellor at Happy Panda
 * cannot reach a Sprout student through any query in this file.
 */

export type PipelineRow = {
  student_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  active: number;
  stage: Stage;
  counsellor_id: string | null;
  counsellor_name: string | null;
  source: string | null;
  next_action: string | null;
  next_action_due: string | null;
  target_country: string | null;
  intended_course: string | null;
  english_test: string | null;
  english_score: string | null;
  best_mock: number | null;
  best_interview: number | null;
  sop_count: number;
  updated_at: string;
  /** Which office the file belongs to. Head office needs it in the list. */
  branch_id: string | null;
  branch_name: string | null;
};

const SELECT_ROW = `
  SELECT p.student_id, u.full_name, u.email, u.phone, u.active,
         p.stage, p.counsellor_id, c.full_name AS counsellor_name,
         p.source, p.next_action, p.next_action_due, p.updated_at,
         p.branch_id, br.name AS branch_name,
         sp.target_country, sp.intended_course, sp.english_test, sp.english_score,
         (SELECT MAX(a.overall_band) FROM test_attempts a
           WHERE a.user_id = p.student_id AND a.status = 'complete' AND a.mode = 'full') AS best_mock,
         (SELECT COUNT(*) FROM sop_documents d WHERE d.user_id = p.student_id) AS sop_count
    FROM pipeline_entries p
    JOIN users u ON u.id = p.student_id
    LEFT JOIN users c ON c.id = p.counsellor_id
    LEFT JOIN student_profiles sp ON sp.user_id = p.student_id
    LEFT JOIN branches br ON br.id = p.branch_id`;

/** Interview scores live inside a JSON report, so they are read separately. */
function bestInterviewFor(studentId: string): number | null {
  const rows = all<{ report: string | null }>(
    "SELECT report FROM interview_sessions WHERE user_id = ? AND status = 'complete'", studentId,
  );
  let best: number | null = null;
  for (const r of rows) {
    if (!r.report) continue;
    try {
      const overall = (JSON.parse(r.report) as { overall?: number }).overall;
      if (typeof overall === "number" && (best === null || overall > best)) best = overall;
    } catch { /* a malformed report must not break the board */ }
  }
  return best;
}

export type PipelineFilter = {
  stage?: string; mine?: boolean; q?: string;
  /** Head office looking at one office instead of all of them. */
  branchId?: string;
  /** The two lists an owner actually chases. */
  late?: boolean; unassigned?: boolean;
  sort?: "name" | "newest" | "late";
};

export function listPipeline(scope: Scope, filter?: PipelineFilter): PipelineRow[] {
  const where = ["p.tenant_id = ?"];
  const params: Array<string | number> = [scope.tenantId];
  // Branch staff see their own office. Head office and consultancy admins see
  // every branch, which is what branchFilter returns nothing for.
  const b = branchFilter(scope, "p");
  if (b.sql) { where.push(`p.branch_id = ?`); params.push(...b.params); }
  if (filter?.stage) { where.push("p.stage = ?"); params.push(filter.stage); }
  if (filter?.mine) { where.push("p.counsellor_id = ?"); params.push(scope.userId); }
  // Search the three things somebody standing at the counter would have: a
  // name, an email, a phone number.
  const q = filter?.q?.trim();
  if (q) {
    // SQLite has no default LIKE escape, so % and _ typed by a user would be
    // wildcards. The ESCAPE clause makes them literal.
    where.push(String.raw`(u.full_name LIKE ? ESCAPE '\' OR u.email LIKE ? ESCAPE '\' OR u.phone LIKE ? ESCAPE '\')`);
    const like = `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;
    params.push(like, like, like);
  }

  // Head office can narrow to one office. Branch staff already see only
  // their own, and passing a branch here cannot widen that.
  if (filter?.branchId && scope.allBranches) { where.push("p.branch_id = ?"); params.push(filter.branchId); }
  // A departed or lost file needs neither a counsellor nor a chase, so the
  // two chase lists leave them out. Otherwise the count on the tile and the
  // rows in the list disagree.
  if (filter?.unassigned) where.push("p.counsellor_id IS NULL AND p.stage NOT IN ('departed','lost')");
  if (filter?.late) {
    where.push("p.next_action_due IS NOT NULL AND p.next_action_due < ? AND p.stage NOT IN ('departed','lost')");
    params.push(localDay());
  }

  const order = filter?.sort === "newest"
    ? "p.created_at DESC"
    : filter?.sort === "late"
      ? "CASE WHEN p.next_action_due IS NULL THEN 1 ELSE 0 END, p.next_action_due"
      : "u.full_name";

  const rows = all<PipelineRow>(
    `${SELECT_ROW} WHERE ${where.join(" AND ")} ORDER BY ${order}`, ...params,
  );
  return rows.map((r) => ({ ...r, best_interview: bestInterviewFor(r.student_id) }));
}

export function getPipelineRow(scope: Scope, studentId: string): PipelineRow | null {
  const b = branchFilter(scope, "p");
  const row = one<PipelineRow>(
    `${SELECT_ROW} WHERE p.tenant_id = ? AND p.student_id = ?${b.sql}`,
    scope.tenantId, studentId, ...b.params,
  );
  return row ? { ...row, best_interview: bestInterviewFor(row.student_id) } : null;
}

export const stageCounts = (scope: Scope) =>
  Object.fromEntries(
    all<{ stage: string; n: number }>(
      `SELECT stage, COUNT(*) n FROM pipeline_entries
        WHERE tenant_id = ?${branchFilter(scope).sql} GROUP BY stage`,
      scope.tenantId, ...branchFilter(scope).params,
    ).map((r) => [r.stage, r.n]),
  ) as Record<string, number>;

export const activeStudentCount = (tenantId: string) =>
  scalar(
    `SELECT COUNT(*) FROM pipeline_entries WHERE tenant_id = ? AND stage IN (${ACTIVE_STAGES.map(() => "?").join(",")})`,
    tenantId, ...ACTIVE_STAGES,
  );

/** The offices this person is allowed to look at. */
export const officesFor = (scope: Scope) =>
  scope.allBranches
    ? all<{ id: string; name: string }>(
        "SELECT id, name FROM branches WHERE tenant_id = ? AND active = 1 ORDER BY is_head_office DESC, name",
        scope.tenantId,
      )
    : [];

/** How each office is doing, for whoever runs all of them. */
export const officeBreakdown = (scope: Scope) =>
  all<{ id: string; name: string; students: number; unassigned: number; late: number; departed: number; staff: number }>(
    `SELECT b.id, b.name,
            SUM(CASE WHEN p.stage NOT IN ('departed','lost') THEN 1 ELSE 0 END) AS students,
            SUM(CASE WHEN p.counsellor_id IS NULL AND p.stage NOT IN ('departed','lost') THEN 1 ELSE 0 END) AS unassigned,
            SUM(CASE WHEN p.next_action_due < ? AND p.stage NOT IN ('departed','lost') THEN 1 ELSE 0 END) AS late,
            SUM(CASE WHEN p.stage = 'departed' THEN 1 ELSE 0 END) AS departed,
            (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.role <> 'student' AND u.active = 1) AS staff
       FROM branches b
       LEFT JOIN pipeline_entries p ON p.branch_id = b.id
      WHERE b.tenant_id = ? AND b.active = 1
      GROUP BY b.id
      ORDER BY b.is_head_office DESC, b.name`,
    localDay(), scope.tenantId,
  );

export const counsellorsOf = (tenantId: string) =>
  all<{ id: string; full_name: string }>(
    "SELECT id, full_name FROM users WHERE tenant_id = ? AND role IN ('counsellor','tenant_admin') AND active = 1 ORDER BY full_name",
    tenantId,
  );

export function ensureEntry(
  tenantId: string, studentId: string, source?: string, branchId?: string | null,
) {
  if (one("SELECT 1 FROM pipeline_entries WHERE student_id = ?", studentId)) return;
  // The branch is taken from the caller where one is known, and otherwise from
  // the student's own record, so a file is never left unattached.
  const branch =
    branchId ??
    (one<{ branch_id: string | null }>("SELECT branch_id FROM users WHERE id = ?", studentId)
      ?.branch_id ?? null);
  run(
    `INSERT INTO pipeline_entries (student_id, tenant_id, branch_id, stage, source, created_at, updated_at)
     VALUES (?,?,?, 'enquiry', ?, ?, ?)`,
    studentId, tenantId, branch, source ?? null, now(), now(),
  );
}

export function updateEntry(
  scope: Scope, studentId: string,
  patch: { stage?: string; counsellor_id?: string | null; next_action?: string | null; next_action_due?: string | null },
) {
  // Column names are interpolated, so they are checked against a fixed list
  // rather than trusted. Values always go through placeholders.
  const COLUMNS = ["stage", "counsellor_id", "next_action", "next_action_due"] as const;
  const sets: string[] = [];
  const params: Array<string | null> = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (!COLUMNS.includes(key as (typeof COLUMNS)[number])) continue;
    sets.push(`${key} = ?`);
    params.push(value === "" ? null : (value as string));
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  params.push(now());
  run(
    `UPDATE pipeline_entries SET ${sets.join(", ")} WHERE student_id = ? AND tenant_id = ?`,
    ...params, studentId, scope.tenantId,
  );
}

export function addNote(
  scope: Scope, studentId: string, body: string, kind: "note" | "stage_change" = "note",
) {
  run(
    `INSERT INTO pipeline_notes (id, tenant_id, student_id, author_id, body, kind, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    uid(), scope.tenantId, studentId, scope.userId, body, kind, now(),
  );
}

export const notesFor = (scope: Scope, studentId: string) =>
  all<{ id: string; body: string; kind: string; created_at: string; author: string }>(
    `SELECT n.id, n.body, n.kind, n.created_at, u.full_name AS author
       FROM pipeline_notes n JOIN users u ON u.id = n.author_id
      WHERE n.student_id = ? AND n.tenant_id = ?
      ORDER BY n.created_at DESC`,
    studentId, scope.tenantId,
  );

/** A staff member may only open a student who belongs to their consultancy. */
export const canView = (scope: Scope, studentId: string) => {
  // Every server action that touches a student calls this, so the branch rule
  // applied here closes the whole write surface at once rather than screen by
  // screen. A counsellor in Pokhara cannot open, edit or act on a Butwal file
  // even with the id in hand.
  const b = branchFilter(scope);
  return Boolean(
    one(
      `SELECT 1 FROM pipeline_entries WHERE student_id = ? AND tenant_id = ?${b.sql}`,
      studentId, scope.tenantId, ...b.params,
    ),
  );
};

// --------------------------- a student's work, read by staff ---------------
// The student-facing repositories filter on user_id = the signed-in person.
// Staff need the same data for someone else, so these queries take the student
// explicitly and still require the tenant to match.

export type StaffSop = { id: string; title: string; country: string; updated_at: string; score: number | null };
export type StaffInterview = { id: string; kind: string; country: string; status: string; started_at: string; report: string | null };
export type StaffMock = { id: string; mode: string; only_kind: string | null; status: string; overall_band: number | null; started_at: string; paper_title: string };

export const sopsOfStudent = (scope: Scope, studentId: string) =>
  all<StaffSop>(
    `SELECT d.id, d.title, d.country, d.updated_at,
            (SELECT r.overall FROM sop_reviews r WHERE r.document_id = d.id ORDER BY r.created_at DESC LIMIT 1) AS score
       FROM sop_documents d
      WHERE d.user_id = ? AND d.tenant_id = ?
      ORDER BY d.updated_at DESC`,
    studentId, scope.tenantId,
  );

export const interviewsOfStudent = (scope: Scope, studentId: string) =>
  all<StaffInterview>(
    `SELECT id, kind, country, status, started_at, report
       FROM interview_sessions WHERE user_id = ? AND tenant_id = ?
      ORDER BY started_at DESC`,
    studentId, scope.tenantId,
  );

export const mocksOfStudent = (scope: Scope, studentId: string) =>
  all<StaffMock>(
    `SELECT a.id, a.mode, a.only_kind, a.status, a.overall_band, a.started_at, p.title AS paper_title
       FROM test_attempts a JOIN test_papers p ON p.id = a.paper_id
      WHERE a.user_id = ? AND a.tenant_id = ?
      ORDER BY a.started_at DESC`,
    studentId, scope.tenantId,
  );

export const profileOfStudent = (scope: Scope, studentId: string) =>
  one<Record<string, string | number | null>>(
    "SELECT * FROM student_profiles WHERE user_id = ? AND tenant_id = ?",
    studentId, scope.tenantId,
  );
