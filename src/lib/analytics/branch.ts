import { all, scalar } from "@/lib/db";
import { band, pct, trend, type Metric } from "@/lib/analytics/metric";

/**
 * What a consultancy owner needs to know about their own branch.
 *
 * Every figure comes from work that already happened, the activity log, the
 * pipeline, the document table. Nothing here needs a tracking script, and
 * nothing leaves the server, which matters because this is data about named
 * students and the families paying for them.
 *
 * The interpretation attached to each number is the point. An owner should not
 * have to know that 62% activation is poor; the metric should say so, and say
 * what usually causes it.
 */

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

export type BranchAnalytics = {
  headline: Metric[];
  funnel: Array<{ stage: string; label: string; count: number; dropFromPrevious: number | null }>;
  /** Plain-English reading of the funnel as a whole. */
  funnelReading: string;
  quiet: Array<{ id: string; name: string; days: number; counsellor: string | null }>;
};

const STAGE_ORDER = [
  ["enquiry", "Enquiry"],
  ["counselling", "Counselling"],
  ["test_prep", "Test prep"],
  ["applying", "Applying"],
  ["offer", "Offer received"],
  ["visa", "Visa lodged"],
  ["departed", "Departed"],
] as const;

export function branchAnalytics(tenantId: string): BranchAnalytics {
  // ---- population ---------------------------------------------------------
  const students = scalar(
    "SELECT COUNT(*) FROM users WHERE tenant_id = ? AND role = 'student' AND active = 1", tenantId);

  const everSignedIn = scalar(
    `SELECT COUNT(*) FROM users
      WHERE tenant_id = ? AND role = 'student' AND active = 1 AND last_seen_at IS NOT NULL`, tenantId);

  const activeStudents = scalar(
    `SELECT COUNT(DISTINCT student_id) FROM activity_log
      WHERE tenant_id = ? AND student_id IS NOT NULL AND created_at >= ?`, tenantId, daysAgo(14));

  const activePrev = scalar(
    `SELECT COUNT(DISTINCT student_id) FROM activity_log
      WHERE tenant_id = ? AND student_id IS NOT NULL AND created_at >= ? AND created_at < ?`,
    tenantId, daysAgo(28), daysAgo(14));

  // ---- stalled files ------------------------------------------------------
  const quiet = all<{ id: string; name: string; last: string | null; counsellor: string | null }>(
    `SELECT u.id, u.full_name AS name, c.full_name AS counsellor,
            (SELECT MAX(a.created_at) FROM activity_log a WHERE a.student_id = u.id) AS last
       FROM users u
       JOIN pipeline_entries p ON p.student_id = u.id
       LEFT JOIN users c ON c.id = p.counsellor_id
      WHERE u.tenant_id = ? AND u.role = 'student' AND u.active = 1
        AND p.stage NOT IN ('departed','lost')
      ORDER BY last IS NULL DESC, last ASC`,
    tenantId,
  ).map((r) => ({
    id: r.id,
    name: r.name,
    counsellor: r.counsellor,
    days: r.last ? Math.floor((Date.now() - new Date(r.last).getTime()) / 864e5) : 999,
  })).filter((r) => r.days >= 21);

  const openFiles = scalar(
    `SELECT COUNT(*) FROM pipeline_entries
      WHERE tenant_id = ? AND stage NOT IN ('departed','lost')`, tenantId);

  // ---- document turnaround ------------------------------------------------
  const waitingDocs = scalar(
    `SELECT COUNT(*) FROM documents WHERE tenant_id = ? AND status = 'uploaded'`, tenantId);

  const oldestWaitDays = scalar(
    `SELECT CAST(julianday('now') - julianday(MIN(created_at)) AS INTEGER)
       FROM documents WHERE tenant_id = ? AND status = 'uploaded'`, tenantId);

  // ---- outcomes -----------------------------------------------------------
  const departed = scalar(
    "SELECT COUNT(*) FROM pipeline_entries WHERE tenant_id = ? AND stage = 'departed'", tenantId);
  const lost = scalar(
    "SELECT COUNT(*) FROM pipeline_entries WHERE tenant_id = ? AND stage = 'lost'", tenantId);
  const concluded = departed + lost;

  // ---- metrics, each with its reading -------------------------------------
  const activationRate = pct(everSignedIn, students);
  const engagementRate = pct(activeStudents, students);
  const stallRate = pct(quiet.length, Math.max(1, openFiles));
  const successRate = pct(departed, Math.max(1, concluded));

  const headline: Metric[] = [
    {
      id: "activation",
      label: "Students who signed in",
      display: `${activationRate}%`,
      value: activationRate,
      basis: `${everSignedIn} of ${students} enrolled`,
      meaning:
        "Of the students you have enrolled, how many have actually logged in at least once. This is the first thing that has to work, a student who never signs in gets no value from anything else here.",
      verdict: band(activationRate, { good: 80, watch: 55 }),
      action:
        activationRate >= 80
          ? null
          : activationRate >= 55
            ? "Some invitations are not landing. Check the email address on the files that have never signed in, and resend."
            : "Most of your students have never signed in. Usually this means the welcome email went to a mistyped address, or nobody told them to expect it. Mention it at the desk when you enrol someone.",
    },
    {
      id: "engagement",
      label: "Active in the last fortnight",
      display: `${engagementRate}%`,
      value: engagementRate,
      basis: `${activeStudents} of ${students} students`,
      trend: trend(activeStudents, activePrev, "up"),
      meaning:
        "How many of your students did something in the last two weeks, ticked a step, uploaded a paper, sat a mock. This is the closest thing to whether the product is genuinely part of how you work.",
      verdict: band(engagementRate, { good: 50, watch: 25 }),
      action:
        engagementRate >= 50
          ? null
          : "Students engage when a counsellor gives them something specific to do. Setting a next action on a file is the single thing that moves this number.",
    },
    {
      id: "stalled",
      label: "Files gone quiet",
      display: String(quiet.length),
      value: quiet.length,
      basis: `${quiet.length} of ${openFiles} open files, nothing for 21 days`,
      meaning:
        "Open files where nobody, student or staff, has done anything for three weeks. These are where students quietly drift to another consultancy, because nothing visible is happening.",
      verdict: band(stallRate, { good: 10, watch: 25, higherIsBetter: false }),
      action: quiet.length === 0 ? null : `Work down the list below. A call on the oldest ${Math.min(3, quiet.length)} is usually an hour well spent.`,
    },
    {
      id: "docs",
      label: "Documents awaiting you",
      display: String(waitingDocs),
      value: waitingDocs,
      basis: waitingDocs > 0 ? `oldest waiting ${oldestWaitDays} day${oldestWaitDays === 1 ? "" : "s"}` : "nothing in the queue",
      meaning:
        "Papers a student has uploaded that your staff have not verified or sent back yet. Every day one sits here is a day the student believes they have done their part and you believe you are waiting on them.",
      verdict: waitingDocs === 0 ? "good" : band(oldestWaitDays, { good: 2, watch: 5, higherIsBetter: false }),
      action:
        waitingDocs === 0
          ? null
          : oldestWaitDays > 5
            ? `Something has been waiting ${oldestWaitDays} days. Students read that silence as being ignored.`
            : "Clear these today so nobody is waiting on you.",
    },
    {
      id: "outcome",
      label: "Reached departure",
      display: concluded === 0 ? "None yet" : `${successRate}%`,
      value: successRate,
      basis: concluded === 0 ? "no files concluded yet" : `${departed} departed, ${lost} lost`,
      meaning:
        "Of the files that reached an end, how many ended with the student flying. The rest went elsewhere or stopped responding.",
      verdict: concluded < 5 ? "neutral" : band(successRate, { good: 70, watch: 50 }),
      action:
        concluded < 5
          ? "Too few concluded files to read anything into this yet. It becomes meaningful after about five."
          : successRate >= 70
            ? null
            : "Look at where the lost files were sitting when they stopped. If they cluster in one stage, that stage is where you are losing people.",
    },
  ];

  // ---- funnel with drop-off ----------------------------------------------
  const counts = new Map(
    all<{ stage: string; n: number }>(
      "SELECT stage, COUNT(*) AS n FROM pipeline_entries WHERE tenant_id = ? GROUP BY stage", tenantId,
    ).map((r) => [r.stage, r.n]),
  );

  let previous: number | null = null;
  const funnel = STAGE_ORDER.map(([stage, label]) => {
    const count = counts.get(stage) ?? 0;
    const drop = previous !== null && previous > 0 ? pct(previous - count, previous) : null;
    previous = count;
    return { stage, label, count, dropFromPrevious: drop };
  });

  // Where the biggest single fall happens, named in words.
  const worst = funnel
    .map((f, i) => ({ ...f, from: i > 0 ? funnel[i - 1].label : null }))
    .filter((f) => f.dropFromPrevious !== null && f.dropFromPrevious > 0)
    .sort((a, b) => (b.dropFromPrevious ?? 0) - (a.dropFromPrevious ?? 0))[0];

  const funnelReading = openFiles === 0
    ? "No files in the pipeline yet, so there is no shape to read."
    : worst
      ? `Most students fall away between ${worst.from} and ${worst.label}. That is where an extra conversation is worth the most.`
      : "Numbers are even across the stages, so nothing is obviously blocking.";

  return { headline, funnel, funnelReading, quiet: quiet.slice(0, 8) };
}
