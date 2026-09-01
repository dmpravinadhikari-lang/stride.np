import { all, one, scalar } from "@/lib/db";
import { getProfile, profileCompleteness } from "@/lib/profile";
import { country } from "@/lib/countries";
import { stageOf } from "@/modules/pipeline/stages";
import { requiredFor, kindById } from "@/modules/documents/kinds";
import { calculate } from "@/modules/cost/calculate";
import { COST, type Level } from "@/modules/cost/data";
import type { CountryCode } from "@/lib/countries";

/**
 * Everything a parent is shown — and nothing else.
 *
 * Deliberately excluded: any document file, the text of the statement, any
 * interview transcript, and anything a student wrote in confidence. A parent
 * sees where their money is going and whether the application is on track.
 * That is the whole remit.
 */
export type ParentSummary = {
  studentName: string;
  consultancy: string;
  counsellor: string | null;
  counsellorPhone: string | null;
  destination: { name: string; flag: string; visa: string } | null;
  course: string | null;
  intake: string | null;
  stage: { label: string; blurb: string };
  profilePct: number;
  documents: { held: number; needed: number; stillNeeded: string[] };
  english: { claimed: string | null; bestMock: number | null };
  interview: { best: number | null; runs: number };
  nextAction: { what: string; due: string | null } | null;
  money: {
    wholeCourseNpr: number;
    beforeYouFlyNpr: number;
    mustShowNpr: number;
    mustShowFormula: string;
  } | null;
};

export function buildSummary(tenantId: string, studentId: string): ParentSummary | null {
  const student = one<{ full_name: string }>(
    "SELECT full_name FROM users WHERE id = ? AND tenant_id = ?", studentId, tenantId,
  );
  if (!student) return null;

  const tenant = one<{ name: string }>("SELECT name FROM tenants WHERE id = ?", tenantId);
  const entry = one<{ stage: string; next_action: string | null; next_action_due: string | null; counsellor_id: string | null }>(
    "SELECT stage, next_action, next_action_due, counsellor_id FROM pipeline_entries WHERE student_id = ? AND tenant_id = ?",
    studentId, tenantId,
  );
  const counsellor = entry?.counsellor_id
    ? one<{ full_name: string; phone: string | null }>("SELECT full_name, phone FROM users WHERE id = ?", entry.counsellor_id)
    : null;

  const profile = getProfile(studentId);
  const stage = stageOf(entry?.stage ?? "enquiry");
  const c = profile?.target_country ? country(profile.target_country) : null;

  // documents — names of what is still outstanding, never the files themselves
  const required = requiredFor(profile?.target_country ?? null, entry?.stage ?? "applying");
  const heldKinds = new Set(
    all<{ kind: string }>("SELECT DISTINCT kind FROM documents WHERE student_id = ? AND tenant_id = ?", studentId, tenantId)
      .map((r) => r.kind),
  );
  const stillNeeded = required.filter((k) => !heldKinds.has(k.id)).map((k) => kindById(k.id)?.label ?? k.id);

  const bestMock = one<{ b: number | null }>(
    "SELECT MAX(overall_band) AS b FROM test_attempts WHERE user_id = ? AND status = 'complete' AND mode = 'full'",
    studentId,
  )?.b ?? null;

  const reports = all<{ report: string | null }>(
    "SELECT report FROM interview_sessions WHERE user_id = ? AND status = 'complete'", studentId,
  );
  let bestInterview: number | null = null;
  for (const r of reports) {
    try {
      const o = r.report ? (JSON.parse(r.report) as { overall?: number }).overall : undefined;
      if (typeof o === "number" && (bestInterview === null || o > bestInterview)) bestInterview = o;
    } catch { /* ignore a malformed report */ }
  }

  let money: ParentSummary["money"] = null;
  if (profile?.target_country) {
    const level = (["diploma", "bachelors", "masters"].includes(profile.study_level ?? "")
      ? profile.study_level : "masters") as Level;
    const cc = profile.target_country as CountryCode;
    const r = calculate({
      country: cc, level, years: COST[cc].years[level], tuition: 0,
      livingBand: "typical", londonOrEquivalent: false,
      savingsNpr: profile.budget_npr ?? 0, sponsorIncomeNpr: profile.sponsor_income_npr ?? 0, partTime: 0,
    });
    money = {
      wholeCourseNpr: r.wholeCourseTotal,
      beforeYouFlyNpr: r.beforeYouGoTotal,
      mustShowNpr: r.visaFunds.npr,
      mustShowFormula: r.visaFunds.formula,
    };
  }

  return {
    studentName: student.full_name,
    consultancy: tenant?.name ?? "",
    counsellor: counsellor?.full_name ?? null,
    counsellorPhone: counsellor?.phone ?? null,
    destination: c ? { name: c.name, flag: c.flag, visa: c.visa } : null,
    course: profile?.intended_course ?? null,
    intake: profile?.target_intake ?? null,
    stage: { label: stage.label, blurb: stage.blurb },
    profilePct: profileCompleteness(profile).pct,
    documents: { held: required.length - stillNeeded.length, needed: required.length, stillNeeded },
    english: { claimed: profile?.english_score ?? null, bestMock },
    interview: { best: bestInterview, runs: scalar("SELECT COUNT(*) FROM interview_sessions WHERE user_id = ?", studentId) },
    nextAction: entry?.next_action ? { what: entry.next_action, due: entry.next_action_due } : null,
    money,
  };
}
