import { all, now, one, run, uid } from "@/lib/db";
import { localDay } from "@/lib/dates";
import { queueEmail } from "@/lib/email/queue";
import { wants } from "@/lib/email/notify";
import { queueMorningDigests } from "@/lib/email/digest";
import { BRAND } from "@/lib/brand";

/**
 * The automations: what the product sends without anybody pressing anything.
 *
 * One catalogue, because it is also the screen an owner reads to decide what
 * their office gets. Each rule says who it goes to, how often it runs and
 * what it looks at, and each is switched per consultancy rather than per
 * deployment, since an office of three does not want the same post as an
 * office of forty.
 *
 * Three rules govern every one of them and are worth stating once:
 *
 *   Nothing goes out about an empty queue. An email that says "you have no
 *   work" teaches people to ignore the sender.
 *   Nothing goes out twice, which the dedupe key enforces on the queue.
 *   Anybody can turn their own copy off in their profile, and the rule still
 *   runs for everybody else.
 */

export type Cadence = "daily" | "weekly";

export type RuleResult = { considered: number; queued: number };

export type Rule = {
  id: string;
  label: string;
  /** What it does, in the words an owner would use. */
  blurb: string;
  /** Who receives it. */
  who: string;
  cadence: Cadence;
  /** On unless the consultancy switches it off. */
  defaultOn: boolean;
  run(tenantId: string, today: string): RuleResult;
};

const link = (slug: string | null, href: string) =>
  slug ? `https://${slug}.${BRAND.domain}${href}` : `https://${BRAND.domain}${href}`;

const slugOf = (tenantId: string) =>
  one<{ slug: string }>("SELECT slug FROM tenants WHERE id = ?", tenantId)?.slug ?? null;

const sign = (kindLabel: string) =>
  ["", "--", BRAND.name, `You get this because "${kindLabel}" is on. Turn it off in your profile.`].join("\n");

const plural = (n: number, one_: string, many: string) => `${n} ${n === 1 ? one_ : many}`;

/* ------------------------------------------------------------------ rules */

/**
 * Enquiries nobody has rung back.
 *
 * The one that earns the money. A walk-in written down on Sunday and still
 * marked new on Tuesday is a student who has already been called by the
 * consultancy across the road.
 */
const uncalledLeads: Rule = {
  id: "lead.uncalled",
  label: "Enquiries nobody has rung",
  blurb: "Every morning, each counsellor is sent their own enquiries that are still marked new after a day.",
  who: "The counsellor who owns the enquiry",
  cadence: "daily",
  defaultOn: true,
  run(tenantId, today) {
    const rows = all<{ owner_id: string; full_name: string; n: number; oldest: string }>(
      `SELECT l.owner_id, u.full_name, COUNT(*) n, MIN(l.created_at) oldest
         FROM leads l JOIN users u ON u.id = l.owner_id
        WHERE l.tenant_id = ? AND l.status = 'new' AND l.owner_id IS NOT NULL
          AND u.active = 1 AND l.created_at < ?
        GROUP BY l.owner_id`,
      tenantId, `${today}T00:00:00`,
    );
    const slug = slugOf(tenantId);
    let queued = 0;
    for (const r of rows) {
      if (!wants(r.owner_id, "lead.uncalled")) continue;
      const days = Math.max(1, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(r.oldest)) / 864e5));
      const body = [
        `${r.full_name.split(" ")[0]},`,
        "",
        `${plural(r.n, "enquiry is", "enquiries are")} still marked new. The oldest came in ${plural(days, "day", "days")} ago.`,
        "",
        "Ring them, or mark them contacted so the list is true.",
        "",
        `Open the board: ${link(slug, "/app/leads?mine=1")}`,
        sign("Enquiries nobody has rung"),
      ].join("\n");
      if (queueEmail({
        tenantId, userId: r.owner_id, kind: "lead.uncalled",
        subject: `${plural(r.n, "enquiry", "enquiries")} waiting for a call`,
        body, dedupeKey: `lead.uncalled:${r.owner_id}:${today}`,
      }) === "queued") queued += 1;
    }
    return { considered: rows.length, queued };
  },
};

/**
 * Enquiries nobody owns.
 *
 * Goes to whoever runs the office rather than to the whole floor: handing
 * work out is a manager's job, and mailing five counsellors about the same
 * unclaimed file is how four of them learn to ignore it.
 */
const unclaimedLeads: Rule = {
  id: "lead.unclaimed",
  label: "Enquiries with no counsellor",
  blurb: "Every morning, whoever runs an office is told how many enquiries there are sitting with nobody's name on them.",
  who: "Consultancy admins, by office",
  cadence: "daily",
  defaultOn: true,
  run(tenantId, today) {
    const rows = all<{ branch_id: string | null; branch_name: string | null; n: number }>(
      `SELECT l.branch_id, b.name AS branch_name, COUNT(*) n
         FROM leads l LEFT JOIN branches b ON b.id = l.branch_id
        WHERE l.tenant_id = ? AND l.status IN ('new','contacted') AND l.owner_id IS NULL
        GROUP BY l.branch_id`,
      tenantId,
    );
    if (rows.length === 0) return { considered: 0, queued: 0 };

    const admins = all<{ id: string; full_name: string; branch_id: string | null }>(
      `SELECT id, full_name, branch_id FROM users
        WHERE tenant_id = ? AND role = 'tenant_admin' AND active = 1`,
      tenantId,
    );
    const slug = slugOf(tenantId);
    let queued = 0;
    for (const a of admins) {
      if (!wants(a.id, "lead.unclaimed")) continue;
      // An admin attached to one office hears about that office. One with no
      // office set is the owner, and hears about all of them.
      const mine = a.branch_id ? rows.filter((r) => r.branch_id === a.branch_id) : rows;
      const total = mine.reduce((n, r) => n + r.n, 0);
      if (total === 0) continue;
      const lines = mine.map((r) => `  - ${r.branch_name ?? "No office set"}: ${r.n}`);
      const body = [
        `${a.full_name.split(" ")[0]},`,
        "",
        `${plural(total, "enquiry has", "enquiries have")} nobody's name on them.`,
        ...(mine.length > 1 ? ["", ...lines] : []),
        "",
        `Hand them out: ${link(slug, "/app/leads?unowned=1")}`,
        sign("Enquiries with no counsellor"),
      ].join("\n");
      if (queueEmail({
        tenantId, userId: a.id, kind: "lead.unclaimed",
        subject: `${plural(total, "enquiry", "enquiries")} with no counsellor`,
        body, dedupeKey: `lead.unclaimed:${a.id}:${today}`,
      }) === "queued") queued += 1;
    }
    return { considered: admins.length, queued };
  },
};

/** How long a file may sit in a stage before somebody should look at it. */
const STALE_AFTER: Record<string, number> = {
  enquiry: 2, counselling: 21, test_prep: 90, applying: 30, offer: 30, visa: 60,
};

/**
 * Files that have stopped moving.
 *
 * Weekly, not daily: a student in the middle of an IELTS course has not
 * stalled because nothing happened on Tuesday, and a daily version of this
 * would be the first thing anybody switched off.
 */
const stalledStudents: Rule = {
  id: "student.stalled",
  label: "Students who have not moved",
  blurb: "Once a week, each counsellor gets the files of theirs that have sat in one stage too long.",
  who: "The counsellor on the file",
  cadence: "weekly",
  defaultOn: true,
  run(tenantId, today) {
    const rows = all<{
      counsellor_id: string; full_name: string; student_name: string; stage: string; since: string;
    }>(
      `SELECT p.counsellor_id, c.full_name, s.full_name AS student_name, p.stage,
              COALESCE((SELECT MAX(a.created_at) FROM activity_log a
                         WHERE a.student_id = p.student_id AND a.kind = 'stage.changed'),
                       p.created_at) AS since
         FROM pipeline_entries p
         JOIN users s ON s.id = p.student_id
         JOIN users c ON c.id = p.counsellor_id
        WHERE p.tenant_id = ? AND p.stage NOT IN ('departed','lost') AND c.active = 1`,
      tenantId,
    );
    const stamp = Date.parse(`${today}T00:00:00Z`);
    const stalled = rows
      .map((r) => ({
        ...r,
        days: Math.floor((stamp - Date.parse(r.since)) / 864e5),
        cap: STALE_AFTER[r.stage] ?? null,
      }))
      .filter((r) => r.cap !== null && r.days > r.cap);

    const byPerson = new Map<string, typeof stalled>();
    for (const r of stalled) {
      const list = byPerson.get(r.counsellor_id) ?? [];
      list.push(r);
      byPerson.set(r.counsellor_id, list);
    }

    const slug = slugOf(tenantId);
    let queued = 0;
    for (const [userId, list] of byPerson) {
      if (!wants(userId, "student.stalled")) continue;
      const sorted = list.sort((a, b) => b.days - a.days).slice(0, 8);
      const body = [
        `${list[0].full_name.split(" ")[0]},`,
        "",
        `${plural(list.length, "file has", "files have")} not moved in a while:`,
        "",
        ...sorted.map((r) => `  - ${r.student_name}, ${r.days} days at ${r.stage.replace("_", " ")}`),
        ...(list.length > sorted.length ? [`  ...and ${list.length - sorted.length} more`] : []),
        "",
        "Move them on, or write a note saying why they are waiting.",
        "",
        `Open the board: ${link(slug, "/app/pipeline?late=1")}`,
        sign("Students who have not moved"),
      ].join("\n");
      if (queueEmail({
        tenantId, userId, kind: "student.stalled",
        subject: `${plural(list.length, "student has", "students have")} not moved`,
        body, dedupeKey: `student.stalled:${userId}:${today}`,
      }) === "queued") queued += 1;
    }
    return { considered: byPerson.size, queued };
  },
};

/**
 * Monday morning, for whoever owns the place.
 *
 * Seven days of the numbers an owner actually asks about, per office, in a
 * message short enough to read on a phone before opening the laptop.
 */
const ownerWeek: Rule = {
  id: "week.owner",
  label: "Weekly summary for the owner",
  blurb: "Monday morning: enquiries in, students won, files that stalled, who was in, for each office.",
  who: "Consultancy admins",
  cadence: "weekly",
  defaultOn: true,
  run(tenantId, today) {
    const from = new Date(Date.parse(`${today}T00:00:00Z`) - 7 * 864e5).toISOString().slice(0, 10);
    const offices = all<{ id: string; name: string; leads: number; won: number; students: number }>(
      `SELECT b.id, b.name,
              (SELECT COUNT(*) FROM leads l
                WHERE l.branch_id = b.id AND l.created_at >= ?) AS leads,
              (SELECT COUNT(*) FROM leads l2
                WHERE l2.branch_id = b.id AND l2.status = 'converted' AND l2.updated_at >= ?) AS won,
              (SELECT COUNT(*) FROM pipeline_entries p
                WHERE p.branch_id = b.id AND p.stage NOT IN ('departed','lost')) AS students
         FROM branches b
        WHERE b.tenant_id = ? AND b.active = 1
        ORDER BY b.name`,
      `${from}T00:00:00`, `${from}T00:00:00`, tenantId,
    );
    const admins = all<{ id: string; full_name: string }>(
      `SELECT id, full_name FROM users
        WHERE tenant_id = ? AND role = 'tenant_admin' AND active = 1`,
      tenantId,
    );
    if (offices.length === 0 || admins.length === 0) return { considered: 0, queued: 0 };

    const slug = slugOf(tenantId);
    const totals = offices.reduce(
      (t, o) => ({ leads: t.leads + o.leads, won: t.won + o.won, students: t.students + o.students }),
      { leads: 0, won: 0, students: 0 },
    );
    // A week in which nothing at all happened is not worth an email.
    if (totals.leads === 0 && totals.won === 0) return { considered: admins.length, queued: 0 };

    let queued = 0;
    for (const a of admins) {
      if (!wants(a.id, "week.owner")) continue;
      const body = [
        `${a.full_name.split(" ")[0]},`,
        "",
        `Last seven days: ${plural(totals.leads, "enquiry", "enquiries")} in, ${
          totals.won === 1 ? "1 became a student" : `${totals.won} became students`
        }, ${plural(totals.students, "file", "files")} open.`,
        "",
        ...offices.map((o) => `  - ${o.name}: ${o.leads} in, ${o.won} won, ${o.students} open`),
        "",
        `The full picture: ${link(slug, "/app/reports")}`,
        sign("Weekly summary for the owner"),
      ].join("\n");
      if (queueEmail({
        tenantId, userId: a.id, kind: "week.owner",
        subject: `Your week: ${totals.leads} in, ${totals.won} won`,
        body, dedupeKey: `week.owner:${a.id}:${today}`,
      }) === "queued") queued += 1;
    }
    return { considered: admins.length, queued };
  },
};

/** The morning list, which lived on its own before this catalogue existed. */
const morningList: Rule = {
  id: "day.digest",
  label: "The morning list",
  blurb: "One email at the start of the day, per person: what is late, what is due, who has nobody.",
  who: "Everybody who works here",
  cadence: "daily",
  defaultOn: true,
  run(tenantId, today) {
    const r = queueMorningDigests(today, tenantId);
    return { considered: r.considered, queued: r.queued };
  },
};

export const RULES: Rule[] = [morningList, uncalledLeads, unclaimedLeads, stalledStudents, ownerWeek];
export const ruleById = (id: string) => RULES.find((r) => r.id === id) ?? null;

/* ------------------------------------------------------- switches and runs */

/** Whether a consultancy has this automation on. Absence of a row means the default. */
export function ruleEnabled(tenantId: string, rule: Rule): boolean {
  const row = one<{ enabled: number }>(
    "SELECT enabled FROM tenant_automations WHERE tenant_id = ? AND rule_id = ?", tenantId, rule.id,
  );
  return row ? row.enabled === 1 : rule.defaultOn;
}

export function setRuleEnabled(tenantId: string, ruleId: string, enabled: boolean) {
  if (!ruleById(ruleId)) return;
  run(
    `INSERT INTO tenant_automations (tenant_id, rule_id, enabled, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(tenant_id, rule_id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
    tenantId, ruleId, enabled ? 1 : 0, now(),
  );
}

export type RunRow = { rule_id: string; ran_at: string; considered: number; queued: number };

/** The last time each rule ran here, for the screen that shows them. */
export const lastRuns = (tenantId: string): Record<string, RunRow> =>
  Object.fromEntries(
    all<RunRow>(
      `SELECT rule_id, ran_at, considered, queued FROM automation_runs
        WHERE tenant_id = ? AND id IN (
          SELECT id FROM automation_runs a2 WHERE a2.tenant_id = automation_runs.tenant_id
            AND a2.rule_id = automation_runs.rule_id ORDER BY a2.ran_at DESC LIMIT 1)`,
      tenantId,
    ).map((r) => [r.rule_id, r]),
  );

/**
 * Run every automation of one cadence, for every consultancy.
 *
 * Called by cron. It is safe to call twice: every message carries a dedupe
 * key with the day in it, so a second run writes nothing.
 */
export function runAutomations(cadence: Cadence, today = localDay()) {
  const tenants = all<{ id: string }>("SELECT id FROM tenants WHERE active = 1");
  const out: Array<{ tenant: string; rule: string; considered: number; queued: number }> = [];

  for (const t of tenants) {
    for (const rule of RULES) {
      if (rule.cadence !== cadence) continue;
      if (!ruleEnabled(t.id, rule)) continue;
      let result: RuleResult = { considered: 0, queued: 0 };
      try {
        result = rule.run(t.id, today);
      } catch (e) {
        // One consultancy's broken data must never stop the post for the rest.
        run(
          `INSERT INTO automation_runs (id, tenant_id, rule_id, ran_at, considered, queued, error)
           VALUES (?,?,?,?,?,?,?)`,
          uid(), t.id, rule.id, now(), 0, 0, e instanceof Error ? e.message : String(e),
        );
        continue;
      }
      run(
        `INSERT INTO automation_runs (id, tenant_id, rule_id, ran_at, considered, queued, error)
         VALUES (?,?,?,?,?,?,NULL)`,
        uid(), t.id, rule.id, now(), result.considered, result.queued,
      );
      out.push({ tenant: t.id, rule: rule.id, ...result });
    }
  }
  return out;
}
