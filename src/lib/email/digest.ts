import { all } from "@/lib/db";
import { localDay } from "@/lib/dates";
import { queueEmail } from "@/lib/email/queue";
import { wants } from "@/lib/email/notify";
import { BRAND } from "@/lib/brand";

/**
 * One email at the start of the day, per person, or none at all.
 *
 * The alternative is a message every time anything happens, which is how a
 * product ends up in a filter. This runs once, says only what is actually
 * waiting for that person, and sends nothing to somebody with a clear desk.
 */

type Row = {
  user_id: string; tenant_id: string; full_name: string; slug: string;
  late_tasks: number; due_today: number; late_followups: number; unassigned: number; role: string;
};

export function buildDigests(today = localDay()): Row[] {
  return all<Row>(
    `SELECT u.id AS user_id, u.tenant_id, u.full_name, t.slug, u.role,
            (SELECT COUNT(*) FROM tasks k
              WHERE k.status = 'open' AND k.due_on < ?
                AND (k.assignee_id = u.id
                     OR k.team_id IN (SELECT team_id FROM team_members m WHERE m.user_id = u.id))
            ) AS late_tasks,
            (SELECT COUNT(*) FROM tasks k
              WHERE k.status = 'open' AND k.due_on = ?
                AND (k.assignee_id = u.id
                     OR k.team_id IN (SELECT team_id FROM team_members m WHERE m.user_id = u.id))
            ) AS due_today,
            (SELECT COUNT(*) FROM pipeline_entries p
              WHERE p.counsellor_id = u.id AND p.stage NOT IN ('departed','lost')
                AND p.next_action_due IS NOT NULL AND p.next_action_due < ?
            ) AS late_followups,
            (SELECT COUNT(*) FROM pipeline_entries p2
              WHERE p2.tenant_id = u.tenant_id AND p2.counsellor_id IS NULL
                AND p2.stage NOT IN ('departed','lost')
                AND (u.role IN ('tenant_admin','super_admin') OR p2.branch_id = u.branch_id)
            ) AS unassigned
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
      WHERE u.role IN ('counsellor','tenant_admin') AND u.active = 1 AND t.active = 1`,
    today, today, today,
  );
}

/** Writes one message per person who has something waiting. */
export function queueMorningDigests(today = localDay()): { considered: number; queued: number } {
  const rows = buildDigests(today);
  let queued = 0;

  for (const r of rows) {
    // An admin is told about students nobody owns; a counsellor is not,
    // because handing files out is not their job.
    const isAdmin = r.role === "tenant_admin" || r.role === "super_admin";
    const unassigned = isAdmin ? r.unassigned : 0;
    const total = r.late_tasks + r.due_today + r.late_followups + unassigned;
    if (total === 0) continue;                     // a clear desk gets no email
    if (!wants(r.user_id, "day.digest")) continue;

    const lines: string[] = [];
    if (r.late_tasks) lines.push(`${r.late_tasks} task${r.late_tasks === 1 ? "" : "s"} past the date`);
    if (r.due_today) lines.push(`${r.due_today} task${r.due_today === 1 ? "" : "s"} due today`);
    if (r.late_followups) lines.push(`${r.late_followups} student${r.late_followups === 1 ? "" : "s"} whose next step is late`);
    if (unassigned) lines.push(`${unassigned} student${unassigned === 1 ? "" : "s"} with no counsellor`);

    const url = `https://${r.slug}.${BRAND.domain}/app`;
    const body = [
      `${r.full_name.split(" ")[0]},`,
      "",
      "Waiting for you this morning:",
      ...lines.map((l) => `  - ${l}`),
      "",
      `Open your day: ${url}`,
      "",
      "--",
      BRAND.name,
      'You get this because "My morning list" is on. Turn it off in your profile.',
    ].join("\n");

    const result = queueEmail({
      tenantId: r.tenant_id, userId: r.user_id, kind: "day.digest",
      subject: lines[0].charAt(0).toUpperCase() + lines[0].slice(1),
      body,
      // One per person per day, so running the job twice changes nothing.
      dedupeKey: `day.digest:${r.user_id}:${today}`,
    });
    if (result === "queued") queued++;
  }

  return { considered: rows.length, queued };
}
