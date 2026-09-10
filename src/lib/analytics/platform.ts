import { all, scalar } from "@/lib/db";
import { band, pct, trend, type Metric, type Verdict } from "@/lib/analytics/metric";

/**
 * What the platform owner needs to know.
 *
 * Different question from the branch view. A consultancy owner asks "are my
 * students moving?"; the platform owner asks "are my consultancies still
 * here, and does the unit economics work?"
 *
 * The most valuable thing here is the churn signal. A consultancy does not
 * cancel. It goes quiet for a month and then cancels. Quiet is the number to
 * watch, and it is knowable weeks before an invoice goes unpaid.
 */

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

export type BranchHealth = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  students: number;
  activeStudents: number;
  eventsThisMonth: number;
  lastActivityDays: number | null;
  health: Verdict;
  reading: string;
};

export type PlatformAnalytics = {
  headline: Metric[];
  branches: BranchHealth[];
  /** One paragraph an owner can read instead of the whole table. */
  summary: string;
};

export function platformAnalytics(): PlatformAnalytics {
  const tenants = all<{ id: string; name: string; slug: string; plan: string }>(
    "SELECT id, name, slug, plan FROM tenants WHERE kind = 'consultancy' AND active = 1 ORDER BY name",
  );

  const branches: BranchHealth[] = tenants.map((t) => {
    const students = scalar(
      "SELECT COUNT(*) FROM users WHERE tenant_id = ? AND role = 'student' AND active = 1", t.id);
    const activeStudents = scalar(
      `SELECT COUNT(DISTINCT student_id) FROM activity_log
        WHERE tenant_id = ? AND student_id IS NOT NULL AND created_at >= ?`, t.id, daysAgo(14));
    const eventsThisMonth = scalar(
      "SELECT COUNT(*) FROM activity_log WHERE tenant_id = ? AND created_at >= ?", t.id, daysAgo(30));

    const lastRow = all<{ last: string }>(
      "SELECT MAX(created_at) AS last FROM activity_log WHERE tenant_id = ?", t.id)[0];
    const lastActivityDays = lastRow?.last
      ? Math.floor((Date.now() - new Date(lastRow.last).getTime()) / 864e5)
      : null;

    // Silence is the churn signal, so it dominates the verdict.
    let health: Verdict;
    let reading: string;
    if (lastActivityDays === null) {
      health = "bad";
      reading = "Never used. The account was set up and nothing has happened since, worth a call before it is written off.";
    } else if (lastActivityDays > 21) {
      health = "bad";
      reading = `Nothing for ${lastActivityDays} days. This is what churn looks like a month before the invoice is refused.`;
    } else if (lastActivityDays > 7 || eventsThisMonth < 10) {
      health = "watch";
      reading = "Logging in but barely using it. Usually means one counsellor tried it and the rest of the office did not.";
    } else if (students > 0 && pct(activeStudents, students) >= 40) {
      health = "good";
      reading = "Staff and students both active. This is what a branch that has adopted it looks like.";
    } else {
      health = "watch";
      reading = "Staff are using it but students are not signing in. Their invitations may not be reaching anyone.";
    }

    return { ...t, students, activeStudents, eventsThisMonth, lastActivityDays, health, reading };
  });

  // ---- platform totals ----------------------------------------------------
  const totalStudents = scalar(
    "SELECT COUNT(*) FROM users WHERE role = 'student' AND active = 1");
  const newStudents30 = scalar(
    "SELECT COUNT(*) FROM users WHERE role = 'student' AND created_at >= ?", daysAgo(30));
  const newStudentsPrev30 = scalar(
    "SELECT COUNT(*) FROM users WHERE role = 'student' AND created_at >= ? AND created_at < ?",
    daysAgo(60), daysAgo(30));

  const activeBranches = branches.filter((b) => b.health === "good").length;
  const atRisk = branches.filter((b) => b.health === "bad").length;

  const aiCostMonth = all<{ c: number }>(
    "SELECT COALESCE(SUM(est_cost_usd),0) AS c FROM usage_events WHERE created_at >= ?", daysAgo(30),
  )[0]?.c ?? 0;

  const activeStudentsAll = scalar(
    `SELECT COUNT(DISTINCT student_id) FROM activity_log
      WHERE student_id IS NOT NULL AND created_at >= ?`, daysAgo(14));

  const costPerActive = activeStudentsAll > 0 ? aiCostMonth / activeStudentsAll : 0;
  const adoptionRate = pct(activeBranches, Math.max(1, branches.length));

  const headline: Metric[] = [
    {
      id: "branches",
      label: "Consultancies live",
      display: String(branches.length),
      value: branches.length,
      basis: `${activeBranches} genuinely active, ${atRisk} at risk`,
      meaning:
        "Consultancy accounts that exist. The number that matters is the second one, an account that is not being used is not a customer, it is a cancellation that has not been processed yet.",
      verdict: branches.length === 0 ? "neutral" : band(adoptionRate, { good: 70, watch: 40 }),
      action: atRisk > 0
        ? `${atRisk} ${atRisk === 1 ? "branch has" : "branches have"} gone quiet. Ring them this week, silence is recoverable, a cancelled invoice is not.`
        : null,
    },
    {
      id: "students",
      label: "Students on the platform",
      display: String(totalStudents),
      value: totalStudents,
      basis: `${newStudents30} enrolled in the last 30 days`,
      trend: trend(newStudents30, newStudentsPrev30, "up"),
      meaning:
        "Every student your consultancies have enrolled. Growth here is a direct read on whether they are putting real caseloads in, rather than trying it with two files.",
      verdict: "neutral",
      action: newStudents30 === 0 && totalStudents > 0
        ? "Nobody enrolled anyone this month. Either the intake season is quiet, or enrolment is too much of a chore, worth asking."
        : null,
    },
    {
      id: "cost",
      label: "AI cost per active student",
      display: costPerActive > 0 ? `$${costPerActive.toFixed(2)}` : "$0.00",
      value: costPerActive,
      basis: `$${aiCostMonth.toFixed(2)} over 30 days · ${activeStudentsAll} active students`,
      meaning:
        "What one genuinely active student costs you in AI calls each month. This is the number that decides whether a plan price works, everything else on a VPS is close to fixed.",
      verdict: costPerActive === 0 ? "neutral" : band(costPerActive, { good: 0.5, watch: 1.5, higherIsBetter: false }),
      action: costPerActive > 1.5
        ? "Cost per student is high enough to eat a Starter plan. Check which module is responsible before raising prices."
        : null,
    },
    {
      id: "adoption",
      label: "Branches actually using it",
      display: `${adoptionRate}%`,
      value: adoptionRate,
      basis: `${activeBranches} of ${branches.length}`,
      meaning:
        "The share of your consultancies where both staff and students are active. This predicts renewal better than anything else on this page.",
      verdict: branches.length < 3 ? "neutral" : band(adoptionRate, { good: 70, watch: 40 }),
      action: branches.length < 3
        ? "Too few branches to read a rate. Judge them individually below until there are a handful."
        : adoptionRate < 40
          ? "Most branches are not really using it. That is an onboarding problem, not a feature problem, sit with one and watch where they stop."
          : null,
    },
  ];

  const summary = branches.length === 0
    ? "No consultancies yet. Everything below fills in once the first one is set up."
    : atRisk > 0
      ? `${activeBranches} of ${branches.length} branches are properly active. ${atRisk} ${atRisk === 1 ? "has" : "have"} gone quiet and ${atRisk === 1 ? "needs" : "need"} a call. Cost per active student is $${costPerActive.toFixed(2)} a month.`
      : `All ${branches.length} branches are in use, ${activeBranches} of them heavily. Cost per active student is $${costPerActive.toFixed(2)} a month.`;

  return { headline, branches, summary };
}
