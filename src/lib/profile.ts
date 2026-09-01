import { now, one, run } from "@/lib/db";
import { country } from "@/lib/countries";
import { npr } from "@/lib/terms";

export type StudentProfile = {
  user_id: string;
  tenant_id: string;
  target_country: string | null;
  study_level: string | null;
  intended_course: string | null;
  target_intake: string | null;
  academic_summary: string | null;
  last_qualification: string | null;
  last_gpa: string | null;
  study_gap_years: number | null;
  work_experience: string | null;
  english_test: string | null;
  english_score: string | null;
  budget_npr: number | null;
  funding_source: string | null;
  sponsor_relation: string | null;
  sponsor_occupation: string | null;
  sponsor_income_npr: number | null;
  ties_to_nepal: string | null;
  career_plan: string | null;
  updated_at: string | null;
};

export const PROFILE_FIELDS = [
  "target_country", "study_level", "intended_course", "target_intake",
  "academic_summary", "last_qualification", "last_gpa", "study_gap_years",
  "work_experience", "english_test", "english_score", "budget_npr",
  "funding_source", "sponsor_relation", "sponsor_occupation",
  "sponsor_income_npr", "ties_to_nepal", "career_plan",
] as const;

/** Stored codes are compact; these are what a person should read. */
export const FUNDING_LABEL: Record<string, string> = {
  family_income: "Family income and savings",
  education_loan: "Education loan",
  loan_and_family: "Education loan plus family",
  scholarship: "Scholarship",
  self: "Own earnings",
};
export const LEVEL_LABEL: Record<string, string> = {
  diploma: "Diploma / Certificate",
  bachelors: "Bachelors",
  masters: "Masters",
  phd: "PhD",
};
export const label = (map: Record<string, string>, code: string | null | undefined) =>
  code ? map[code] ?? code : null;

/**
 * The FIRST number in a free-text field.
 *
 * Students write "3.42 / 4.0" and "6.5 overall, no band below 6". Stripping
 * every non-digit turns those into 3.424 and 6.56, which is worse than having
 * no value at all — it silently produces a wrong match.
 */
export function firstNumber(text: string | null | undefined): number {
  if (!text) return 0;
  const m = String(text).match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

/** A Nepali GPA is usually out of 4; convert to a rough percentage. */
export function toPercent(gpaOrPercent: string | null | undefined): number {
  const n = firstNumber(gpaOrPercent);
  if (n <= 0) return 0;
  if (n <= 4) return Math.round(n * 20 + 5);   // 3.42 -> 73%
  if (n <= 100) return Math.round(n);
  return 0;
}

export function getProfile(userId: string): StudentProfile | null {
  return one<StudentProfile>("SELECT * FROM student_profiles WHERE user_id = ?", userId);
}

export function ensureProfile(userId: string, tenantId: string): StudentProfile {
  const existing = getProfile(userId);
  if (existing) return existing;
  run(
    "INSERT INTO student_profiles (user_id, tenant_id, updated_at) VALUES (?,?,?)",
    userId, tenantId, now(),
  );
  return getProfile(userId)!;
}

export function saveProfile(userId: string, tenantId: string, values: Record<string, string>) {
  ensureProfile(userId, tenantId);
  const sets: string[] = [];
  const params: Array<string | number | null> = [];
  for (const field of PROFILE_FIELDS) {
    if (!(field in values)) continue;
    const raw = (values[field] ?? "").trim();
    sets.push(`${field} = ?`);
    if (field === "study_gap_years" || field === "budget_npr" || field === "sponsor_income_npr") {
      params.push(raw === "" ? null : Number(raw.replace(/[^0-9.]/g, "")) || 0);
    } else {
      params.push(raw === "" ? null : raw);
    }
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  params.push(now(), userId);
  run(`UPDATE student_profiles SET ${sets.join(", ")} WHERE user_id = ?`, ...params);
}

/** How complete is the profile? Drives the nudge on the dashboard. */
export function profileCompleteness(p: StudentProfile | null): { pct: number; missing: string[] } {
  const important: Array<[keyof StudentProfile, string]> = [
    ["target_country", "Target country"],
    ["study_level", "Study level"],
    ["intended_course", "Intended course"],
    ["last_qualification", "Last qualification"],
    ["last_gpa", "Last GPA or percentage"],
    ["english_test", "English test"],
    ["funding_source", "Who is funding you"],
    ["sponsor_relation", "Sponsor relationship"],
    ["sponsor_income_npr", "Sponsor annual income"],
    ["budget_npr", "Total budget"],
    ["ties_to_nepal", "Ties to Nepal"],
    ["career_plan", "Career plan after study"],
  ];
  if (!p) return { pct: 0, missing: important.map(([, label]) => label) };
  const missing = important.filter(([key]) => {
    const v = p[key];
    return v === null || v === undefined || v === "";
  }).map(([, label]) => label);
  return { pct: Math.round(((important.length - missing.length) / important.length) * 100), missing };
}

/**
 * The profile rewritten as plain sentences for the model. Every AI module uses
 * this, which is why a student is never asked the same thing twice.
 */
export function profileBrief(p: StudentProfile | null, studentName: string): string {
  if (!p) return `Student name: ${studentName}. No profile details on file yet.`;
  const c = p.target_country ? country(p.target_country) : null;
  const lines = [
    `Student name: ${studentName}`,
    `Destination: ${c ? `${c.name} (${c.visa})` : "not chosen"}`,
    `Study level: ${p.study_level ?? "not stated"}`,
    `Intended course: ${p.intended_course ?? "not stated"}`,
    `Target intake: ${p.target_intake ?? "not stated"}`,
    `Last qualification: ${p.last_qualification ?? "not stated"} (result: ${p.last_gpa ?? "not stated"})`,
    `Study gap: ${p.study_gap_years === null ? "not stated" : `${p.study_gap_years} year(s)`}`,
    `Work experience: ${p.work_experience ?? "none stated"}`,
    `English test: ${p.english_test ?? "not taken"} ${p.english_score ? `(score ${p.english_score})` : ""}`,
    `Total budget: ${npr(p.budget_npr)}`,
    `Funding source: ${p.funding_source ?? "not stated"}`,
    `Sponsor: ${p.sponsor_relation ?? "not stated"}, occupation ${p.sponsor_occupation ?? "not stated"}, annual income ${npr(p.sponsor_income_npr)}`,
    `Ties to Nepal: ${p.ties_to_nepal ?? "not stated"}`,
    `Career plan after study: ${p.career_plan ?? "not stated"}`,
  ];
  return lines.join("\n");
}
