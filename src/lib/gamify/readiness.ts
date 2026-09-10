import { all, one, scalar } from "@/lib/db";
import { STEPS } from "@/modules/checklist/steps";

/**
 * How ready a student actually is, as one number.
 *
 * Two rules shaped this, and both matter more than the maths:
 *
 *  1. **It scores readiness, not activity.** Points come from a document a
 *     counsellor verified, a step genuinely finished, a band actually reached.
 *     Nothing here rewards opening the app, and nothing rewards running an AI
 *     tool. Those cost the consultancy real money per use, and a scoring
 *     system that pays students to spend their branch's credits would be a
 *     quiet betrayal of the people paying for it.
 *
 *  2. **It cannot flatter.** A student three weeks from a deadline with no
 *     financial documents should see a low number, because that is the truth
 *     and the whole point is to prompt them while there is still time. A score
 *     that always looks encouraging is worth nothing.
 */

export type Facet = {
  id: string;
  label: string;
  /** Points earned out of `max`. */
  points: number;
  max: number;
  /** One line saying what would move it, written for the student. */
  next: string | null;
  icon: string;
  tint: string;
};

export type Readiness = {
  score: number;          // 0–100
  facets: Facet[];
  band: { id: string; label: string; blurb: string; tint: string };
  /** The single most useful thing to do next. */
  nextBest: { label: string; href: string; why: string } | null;
};

/** Bands are named for where the student stands, not for how they are doing. */
const BANDS = [
  { id: "starting",  min: 0,  label: "Just starting",     tint: "wash",  blurb: "Nothing is late yet. This is the cheapest time to get organised." },
  { id: "moving",    min: 25, label: "Moving",            tint: "sky",   blurb: "The shape of your application is there. Keep the dated things dated." },
  { id: "shaping",   min: 50, label: "Taking shape",      tint: "lilac", blurb: "Over halfway. What is left is mostly paperwork and practice." },
  { id: "strong",    min: 75, label: "Nearly there",      tint: "mint",  blurb: "A strong file. Close the last gaps before they become urgent." },
  { id: "ready",     min: 95, label: "Ready",             tint: "mint",  blurb: "Everything that can be done in advance has been done." },
];

const bandFor = (score: number) => [...BANDS].reverse().find((b) => score >= b.min) ?? BANDS[0];

/** English requirement by destination, as a band on the IELTS scale. */
const ENGLISH_TARGET: Record<string, number> = {
  AU: 6.5, UK: 6.5, CA: 6.5, US: 6.5, NZ: 6.5, IE: 6.5,
};

const PROFILE_FIELDS = [
  "target_country", "study_level", "intended_course", "target_intake",
  "last_qualification", "last_gpa", "english_test", "english_score",
  "budget_npr", "funding_source", "ties_to_nepal", "career_plan",
] as const;

/** Pull the first number out of "6.5 overall" or "3.42 / 4.0". */
const firstNumber = (v: unknown): number | null => {
  const m = String(v ?? "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export function readinessFor(studentId: string, tenantId: string): Readiness {
  const profile = one<Record<string, unknown>>(
    "SELECT * FROM student_profiles WHERE user_id = ?", studentId,
  );

  // --- profile: 10 ---------------------------------------------------------
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = profile?.[f];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  const profilePoints = Math.round((filled / PROFILE_FIELDS.length) * 10);

  // --- checklist: 35 -------------------------------------------------------
  const doneSteps = scalar(
    "SELECT COUNT(*) FROM checklist_items WHERE student_id = ? AND status = 'done'", studentId,
  );
  const totalSteps = STEPS.length;
  const checklistPoints = Math.round(Math.min(1, doneSteps / Math.max(1, totalSteps)) * 35);

  // --- documents: 25 -------------------------------------------------------
  // Verified only. An uploaded file nobody has checked is not evidence of
  // anything, and counting it would let a student feel finished while their
  // counsellor still has a pile to work through.
  const verified = scalar(
    "SELECT COUNT(*) FROM documents WHERE student_id = ? AND status = 'verified'", studentId,
  );
  const CORE_DOCS = 8;
  const docPoints = Math.round(Math.min(1, verified / CORE_DOCS) * 25);

  // --- English: 15 ---------------------------------------------------------
  const target = ENGLISH_TARGET[String(profile?.target_country ?? "")] ?? 6.5;
  const claimed = firstNumber(profile?.english_score);
  const bestMock = scalar(
    "SELECT MAX(overall_band) FROM test_attempts WHERE user_id = ? AND status = 'marked'", studentId,
  );
  const bestEnglish = Math.max(claimed ?? 0, bestMock);
  const englishPoints = bestEnglish <= 0 ? 0 : Math.round(Math.min(1, bestEnglish / target) * 15);

  // --- the written and spoken parts: 15 ------------------------------------
  const sopScored = scalar(
    `SELECT COUNT(*) FROM sop_documents WHERE user_id = ? AND status IN ('reviewed','final')`, studentId,
  );
  const interviewsDone = scalar(
    "SELECT COUNT(*) FROM interview_sessions WHERE user_id = ? AND status = 'complete'", studentId,
  );
  // Capped at one of each: this is "have you rehearsed", not "how many times".
  const practicePoints = Math.min(1, sopScored) * 8 + Math.min(1, interviewsDone) * 7;

  const facets: Facet[] = [
    {
      id: "profile", label: "Your details", points: profilePoints, max: 10,
      icon: "👤", tint: "sky",
      next: filled < PROFILE_FIELDS.length
        ? `${PROFILE_FIELDS.length - filled} more field${PROFILE_FIELDS.length - filled === 1 ? "" : "s"} to fill in`
        : null,
    },
    {
      id: "checklist", label: "Steps done", points: checklistPoints, max: 35,
      icon: "✅", tint: "lilac",
      next: doneSteps < totalSteps ? `${totalSteps - doneSteps} of ${totalSteps} still to do` : null,
    },
    {
      id: "documents", label: "Papers verified", points: docPoints, max: 25,
      icon: "🗂️", tint: "amber",
      next: verified < CORE_DOCS ? `${CORE_DOCS - verified} core document${CORE_DOCS - verified === 1 ? "" : "s"} not verified yet` : null,
    },
    {
      id: "english", label: "English", points: englishPoints, max: 15,
      icon: "📝", tint: "mint",
      next: bestEnglish <= 0
        ? "No score recorded yet"
        : bestEnglish < target
          ? `${bestEnglish.toFixed(1)} against a target of ${target.toFixed(1)}`
          : null,
    },
    {
      id: "practice", label: "Rehearsed", points: practicePoints, max: 15,
      icon: "🎙️", tint: "rose",
      next: sopScored === 0 && interviewsDone === 0
        ? "Statement not scored, interview not sat"
        : sopScored === 0
          ? "Statement not scored yet"
          : interviewsDone === 0
            ? "No mock interview yet"
            : null,
    },
  ];

  const score = facets.reduce((sum, f) => sum + f.points, 0);

  // The next best action is the facet furthest from full, because that is
  // where a given hour buys the most readiness.
  const HREF: Record<string, { href: string; label: string }> = {
    profile:   { href: "/app/profile",    label: "Finish your profile" },
    checklist: { href: "/app/checklist",  label: "Open your plan" },
    documents: { href: "/app/documents",  label: "Upload what is missing" },
    english:   { href: "/app/mock-tests", label: "Sit a mock test" },
    practice:  { href: "/app/sop",        label: "Get your statement scored" },
  };
  const weakest = facets
    .filter((f) => f.next)
    .sort((a, b) => (b.max - b.points) - (a.max - a.points))[0];

  return {
    score,
    facets,
    band: bandFor(score),
    nextBest: weakest
      ? { ...HREF[weakest.id], why: weakest.next ?? "" }
      : null,
  };
}

/**
 * Weeks in a row with at least one thing moved forward.
 *
 * Weekly rather than daily, deliberately. Applying to university is not a
 * daily activity. There are legitimate weeks where the only correct action is
 * waiting for a bank letter. A daily streak would break constantly through no
 * fault of the student and teach them to ignore it, which is worse than having
 * no streak at all.
 */
export function weeklyStreak(studentId: string): { weeks: number; activeThisWeek: boolean } {
  const rows = all<{ created_at: string }>(
    `SELECT created_at FROM activity_log
      WHERE student_id = ?
        AND kind NOT IN ('account.created','account.invited','module.changed')
      ORDER BY created_at DESC
      LIMIT 400`,
    studentId,
  );
  if (rows.length === 0) return { weeks: 0, activeThisWeek: false };

  // Monday-based week index, so a week is a week rather than a rolling 7 days.
  const weekOf = (iso: string) => Math.floor((new Date(iso).getTime() - 345600000) / 604800000);
  const active = new Set(rows.map((r) => weekOf(r.created_at)));
  const thisWeek = weekOf(new Date().toISOString());

  const activeThisWeek = active.has(thisWeek);
  // Count back from this week, or from last week if this one has not started.
  let cursor = activeThisWeek ? thisWeek : thisWeek - 1;
  let weeks = 0;
  while (active.has(cursor)) { weeks++; cursor--; }

  return { weeks, activeThisWeek };
}
