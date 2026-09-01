import { all, one, scalar } from "@/lib/db";
import { STAGE_IDS, ACTIVE_STAGES, type Stage } from "@/modules/pipeline/stages";

/**
 * Reporting over the pipeline.
 *
 * Two rules held throughout: every query is filtered by tenant, and a rate is
 * never shown without the count behind it. "67% conversion" from three students
 * is noise, and a consultancy owner who acts on it will make a worse decision
 * than one who saw "2 of 3".
 */

export type Funnel = { stage: Stage; label: string; count: number };

export const funnel = (tenantId: string) => {
  const rows = new Map(
    all<{ stage: string; n: number }>(
      "SELECT stage, COUNT(*) n FROM pipeline_entries WHERE tenant_id = ? GROUP BY stage",
      tenantId,
    ).map((r) => [r.stage, r.n]),
  );
  return STAGE_IDS.map((stage) => ({ stage, count: rows.get(stage) ?? 0 }));
};

export type CounsellorLoad = {
  id: string | null; name: string; active: number; departed: number; lost: number;
  overdue: number; unassignedFlag: boolean;
};

export function counsellorLoad(tenantId: string): CounsellorLoad[] {
  const rows = all<{ id: string | null; name: string | null; stage: string; due: string | null }>(
    `SELECT p.counsellor_id AS id, c.full_name AS name, p.stage, p.next_action_due AS due
       FROM pipeline_entries p LEFT JOIN users c ON c.id = p.counsellor_id
      WHERE p.tenant_id = ?`,
    tenantId,
  );
  const byId = new Map<string, CounsellorLoad>();
  const now = Date.now();

  for (const r of rows) {
    const key = r.id ?? "__unassigned";
    if (!byId.has(key)) {
      byId.set(key, {
        id: r.id, name: r.name ?? "Unassigned", active: 0, departed: 0, lost: 0,
        overdue: 0, unassignedFlag: r.id === null,
      });
    }
    const entry = byId.get(key)!;
    if (r.stage === "departed") entry.departed++;
    else if (r.stage === "lost") entry.lost++;
    else entry.active++;
    if (r.due && new Date(r.due).getTime() < now) entry.overdue++;
  }
  return [...byId.values()].sort((a, b) => b.active - a.active);
}

export type Stalled = {
  student_id: string; full_name: string; stage: string;
  counsellor: string | null; days: number; lastNote: string | null;
};

/**
 * Students who have not moved stage in a while. Derived from the stage-change
 * notes, so it measures real movement rather than any edit to the row.
 */
export function stalled(tenantId: string, thresholdDays = 30): Stalled[] {
  const rows = all<{ student_id: string; full_name: string; stage: string; counsellor: string | null; since: string | null; note: string | null }>(
    `SELECT p.student_id, u.full_name, p.stage, c.full_name AS counsellor,
            (SELECT MAX(n.created_at) FROM pipeline_notes n
              WHERE n.student_id = p.student_id AND n.kind = 'stage_change') AS since,
            (SELECT n2.body FROM pipeline_notes n2
              WHERE n2.student_id = p.student_id ORDER BY n2.created_at DESC LIMIT 1) AS note
       FROM pipeline_entries p
       JOIN users u ON u.id = p.student_id
       LEFT JOIN users c ON c.id = p.counsellor_id
      WHERE p.tenant_id = ? AND p.stage NOT IN ('departed','lost')`,
    tenantId,
  );
  const now = Date.now();
  return rows
    .map((r) => ({
      student_id: r.student_id, full_name: r.full_name, stage: r.stage,
      counsellor: r.counsellor,
      days: Math.floor((now - new Date(r.since ?? new Date().toISOString()).getTime()) / 864e5),
      lastNote: r.note,
    }))
    .filter((r) => r.days >= thresholdDays)
    .sort((a, b) => b.days - a.days);
}

export type Engagement = {
  students: number;
  profileComplete: number;
  didMock: number;
  didInterview: number;
  wroteSop: number;
  uploadedDocs: number;
  avgMockBand: number | null;
  avgInterview: number | null;
};

export function engagement(tenantId: string): Engagement {
  const students = scalar("SELECT COUNT(*) FROM users WHERE tenant_id = ? AND role = 'student'", tenantId);
  const has = (sql: string) => scalar(sql, tenantId);

  const bands = all<{ b: number }>(
    `SELECT MAX(a.overall_band) b FROM test_attempts a JOIN users u ON u.id = a.user_id
      WHERE u.tenant_id = ? AND a.status = 'complete' AND a.overall_band IS NOT NULL
      GROUP BY a.user_id`, tenantId,
  ).map((r) => r.b);

  const reports = all<{ report: string | null }>(
    `SELECT s.report FROM interview_sessions s JOIN users u ON u.id = s.user_id
      WHERE u.tenant_id = ? AND s.status = 'complete'`, tenantId,
  );
  const scores: number[] = [];
  for (const r of reports) {
    try {
      const o = r.report ? (JSON.parse(r.report) as { overall?: number }).overall : undefined;
      if (typeof o === "number") scores.push(o);
    } catch { /* skip a malformed report */ }
  }

  const mean = (xs: number[]) => (xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)) : null);

  return {
    students,
    profileComplete: has(`SELECT COUNT(*) FROM student_profiles sp JOIN users u ON u.id = sp.user_id
                           WHERE u.tenant_id = ? AND sp.career_plan IS NOT NULL AND sp.sponsor_income_npr IS NOT NULL`),
    didMock: has(`SELECT COUNT(DISTINCT a.user_id) FROM test_attempts a JOIN users u ON u.id = a.user_id
                   WHERE u.tenant_id = ? AND a.status = 'complete'`),
    didInterview: has(`SELECT COUNT(DISTINCT s.user_id) FROM interview_sessions s JOIN users u ON u.id = s.user_id
                        WHERE u.tenant_id = ? AND s.status = 'complete'`),
    wroteSop: has(`SELECT COUNT(DISTINCT d.user_id) FROM sop_documents d WHERE d.tenant_id = ?`),
    uploadedDocs: has(`SELECT COUNT(DISTINCT d.student_id) FROM documents d WHERE d.tenant_id = ?`),
    avgMockBand: mean(bands),
    avgInterview: mean(scores),
  };
}

export type ByCountry = { code: string; count: number; avgBand: number | null };

export const byCountry = (tenantId: string): ByCountry[] =>
  all<{ code: string; count: number; avgBand: number | null }>(
    `SELECT sp.target_country AS code, COUNT(*) AS count,
            (SELECT ROUND(AVG(a.overall_band),1) FROM test_attempts a
              JOIN student_profiles s2 ON s2.user_id = a.user_id
             WHERE s2.target_country = sp.target_country AND s2.tenant_id = sp.tenant_id
               AND a.status = 'complete' AND a.overall_band IS NOT NULL) AS avgBand
       FROM student_profiles sp
      WHERE sp.tenant_id = ? AND sp.target_country IS NOT NULL
      GROUP BY sp.target_country ORDER BY count DESC`,
    tenantId,
  );

/** Everything a counsellor should look at this morning. */
export type Risk = { student_id: string; full_name: string; reason: string; severity: "high" | "medium" };

export function risks(tenantId: string): Risk[] {
  const out: Risk[] = [];
  const nowIso = new Date().toISOString();

  for (const r of all<{ student_id: string; full_name: string; next_action: string }>(
    `SELECT p.student_id, u.full_name, p.next_action FROM pipeline_entries p JOIN users u ON u.id = p.student_id
      WHERE p.tenant_id = ? AND p.next_action_due IS NOT NULL AND p.next_action_due < ?
        AND p.stage NOT IN ('departed','lost')`, tenantId, nowIso)) {
    out.push({ student_id: r.student_id, full_name: r.full_name, severity: "high", reason: `Next action overdue: ${r.next_action}` });
  }

  for (const r of all<{ student_id: string; full_name: string }>(
    `SELECT p.student_id, u.full_name FROM pipeline_entries p JOIN users u ON u.id = p.student_id
      WHERE p.tenant_id = ? AND p.counsellor_id IS NULL AND p.stage NOT IN ('departed','lost')`, tenantId)) {
    out.push({ student_id: r.student_id, full_name: r.full_name, severity: "medium", reason: "No counsellor assigned" });
  }

  for (const r of all<{ student_id: string; full_name: string; stage: string }>(
    `SELECT p.student_id, u.full_name, p.stage FROM pipeline_entries p JOIN users u ON u.id = p.student_id
      WHERE p.tenant_id = ? AND p.stage IN ('applying','offer','visa')
        AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.student_id = p.student_id)`, tenantId)) {
    out.push({ student_id: r.student_id, full_name: r.full_name, severity: "high", reason: `At ${r.stage} with no documents uploaded at all` });
  }

  for (const r of all<{ student_id: string; full_name: string }>(
    `SELECT p.student_id, u.full_name FROM pipeline_entries p JOIN users u ON u.id = p.student_id
      WHERE p.tenant_id = ? AND p.stage IN ('offer','visa')
        AND NOT EXISTS (SELECT 1 FROM interview_sessions s WHERE s.user_id = p.student_id AND s.status = 'complete')`, tenantId)) {
    out.push({ student_id: r.student_id, full_name: r.full_name, severity: "medium", reason: "Close to the visa stage and has never completed a mock interview" });
  }

  return out.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
}

export const activeCount = (tenantId: string) =>
  scalar(
    `SELECT COUNT(*) FROM pipeline_entries WHERE tenant_id = ? AND stage IN (${ACTIVE_STAGES.map(() => "?").join(",")})`,
    tenantId, ...ACTIVE_STAGES,
  );

/** Platform-wide, for the super admin. */
export const tenantSummary = () =>
  all<{ id: string; name: string; plan: string; kind: string; students: number; active: number; departed: number; credits: number }>(
    `SELECT t.id, t.name, t.plan, t.kind,
            (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.role = 'student') AS students,
            (SELECT COUNT(*) FROM pipeline_entries p WHERE p.tenant_id = t.id AND p.stage NOT IN ('departed','lost')) AS active,
            (SELECT COUNT(*) FROM pipeline_entries p WHERE p.tenant_id = t.id AND p.stage = 'departed') AS departed,
            (SELECT COALESCE(SUM(e.credits),0) FROM usage_events e WHERE e.tenant_id = t.id) AS credits
       FROM tenants t ORDER BY t.kind DESC, students DESC`,
  );

export const tenantName = (id: string) =>
  one<{ name: string }>("SELECT name FROM tenants WHERE id = ?", id)?.name ?? "";
