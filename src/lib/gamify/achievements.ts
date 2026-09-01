import { all, one, scalar } from "@/lib/db";

/**
 * Things a student has actually achieved.
 *
 * Every one of these corresponds to a real step towards getting on a plane.
 * None of them can be earned by logging in, clicking around, or repeatedly
 * running an AI tool — the last of those would cost the consultancy money
 * every time a student went hunting for a badge.
 *
 * They are also written to be worth reading when locked: the hint tells you
 * exactly what to do, so the list doubles as a to-do list for anyone who likes
 * collecting things.
 */

export type Achievement = {
  id: string;
  label: string;
  /** Shown once earned — what it means. */
  blurb: string;
  /** Shown while locked — precisely what earns it. */
  hint: string;
  icon: string;
  earned: boolean;
  /** Grouped so the list reads as a journey rather than a pile. */
  phase: "Decide" | "Prepare" | "Apply" | "Depart";
};

export function achievementsFor(studentId: string): Achievement[] {
  const profile = one<Record<string, unknown>>(
    "SELECT * FROM student_profiles WHERE user_id = ?", studentId,
  );

  const has = (f: string) => {
    const v = profile?.[f];
    return v !== null && v !== undefined && String(v).trim() !== "";
  };

  const stepsDone = scalar(
    "SELECT COUNT(*) FROM checklist_items WHERE student_id = ? AND status = 'done'", studentId);
  const verifiedDocs = scalar(
    "SELECT COUNT(*) FROM documents WHERE student_id = ? AND status = 'verified'", studentId);
  const mocks = all<{ overall_band: number | null }>(
    "SELECT overall_band FROM test_attempts WHERE user_id = ? AND status = 'marked' ORDER BY completed_at", studentId);
  const bands = mocks.map((m) => m.overall_band ?? 0).filter((b) => b > 0);
  const bestBand = bands.length ? Math.max(...bands) : 0;
  const improved = bands.length >= 2 && bands[bands.length - 1] > bands[0];

  const sopsScored = scalar(
    `SELECT COUNT(*) FROM sop_documents WHERE user_id = ? AND status IN ('reviewed','final')`, studentId);
  const interviews = scalar(
    "SELECT COUNT(*) FROM interview_sessions WHERE user_id = ? AND status = 'complete'", studentId);
  const parentLinks = scalar(
    "SELECT COUNT(*) FROM parent_links WHERE student_id = ?", studentId);

  const list: Achievement[] = [
    // --- Decide -----------------------------------------------------------
    { id: "profile", phase: "Decide", icon: "👤",
      label: "Told us who you are",
      blurb: "Your profile is filled in, so nothing has to ask you twice.",
      hint: "Complete every field on your profile",
      earned: ["target_country", "study_level", "intended_course", "target_intake"].every(has) },

    { id: "budget", phase: "Decide", icon: "💰",
      label: "Faced the numbers",
      blurb: "You know what this costs and where the money is coming from.",
      hint: "Add your budget and funding source to your profile",
      earned: has("budget_npr") && has("funding_source") },

    { id: "first-step", phase: "Decide", icon: "🌱",
      label: "Made a start",
      blurb: "The first step is ticked. Most people never get here.",
      hint: "Tick any one step on your plan",
      earned: stepsDone >= 1 },

    // --- Prepare ----------------------------------------------------------
    { id: "first-mock", phase: "Prepare", icon: "📝",
      label: "Sat a real mock",
      blurb: "You know your actual band rather than your hoped-for one.",
      hint: "Complete one full IELTS or PTE mock test",
      earned: bands.length >= 1 },

    { id: "improved", phase: "Prepare", icon: "📈",
      label: "Moved the needle",
      blurb: "Your band went up between mocks. That is the whole point of practising.",
      hint: "Score higher on a later mock than your first one",
      earned: improved },

    { id: "band-target", phase: "Prepare", icon: "🎯",
      label: "Hit the band",
      blurb: "You are at 6.5 or above — the bar most courses and visas ask for.",
      hint: "Reach an overall 6.5 in a mock test",
      earned: bestBand >= 6.5 },

    { id: "interview", phase: "Prepare", icon: "🎙️",
      label: "Been asked the hard question",
      blurb: "You have sat a mock interview and heard the follow-ups.",
      hint: "Complete one mock visa or credibility interview",
      earned: interviews >= 1 },

    { id: "sop", phase: "Prepare", icon: "✍️",
      label: "Statement assessed",
      blurb: "Your statement has been scored the way an assessor scores it.",
      hint: "Get one statement of purpose scored",
      earned: sopsScored >= 1 },

    // --- Apply ------------------------------------------------------------
    { id: "papers-3", phase: "Apply", icon: "📎",
      label: "Paperwork started",
      blurb: "Three documents verified by your counsellor.",
      hint: "Have three documents verified",
      earned: verifiedDocs >= 3 },

    { id: "papers-8", phase: "Apply", icon: "🗂️",
      label: "File in order",
      blurb: "Eight verified documents. This is the part that sinks most applications.",
      hint: "Have eight documents verified",
      earned: verifiedDocs >= 8 },

    { id: "halfway", phase: "Apply", icon: "⛰️",
      label: "Halfway up",
      blurb: "Half your plan is behind you.",
      hint: "Finish half the steps on your plan",
      earned: stepsDone >= 15 },

    { id: "parent", phase: "Apply", icon: "👪",
      label: "Brought them in",
      blurb: "The people paying can see where things stand without having to ask.",
      hint: "Share a parent link",
      earned: parentLinks >= 1 },

    // --- Depart -----------------------------------------------------------
    { id: "all-steps", phase: "Depart", icon: "🛫",
      label: "Ready to fly",
      blurb: "Every step on your plan is done.",
      hint: "Finish every step on your plan",
      earned: stepsDone >= 30 },
  ];

  return list;
}

export const earnedCount = (list: Achievement[]) => list.filter((a) => a.earned).length;

/** The nearest unearned one, for a single nudge rather than a wall of them. */
export function nextAchievement(list: Achievement[]): Achievement | null {
  const order: Achievement["phase"][] = ["Decide", "Prepare", "Apply", "Depart"];
  for (const phase of order) {
    const next = list.find((a) => a.phase === phase && !a.earned);
    if (next) return next;
  }
  return null;
}
