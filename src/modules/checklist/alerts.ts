import { localDay } from "@/lib/dates";
import { all } from "@/lib/db";
import { queueEmail } from "@/lib/email/queue";
import { getProfile } from "@/lib/profile";
import { buildSchedule, needsAttention, parseIntake } from "@/modules/checklist/schedule";
import { progressFor } from "@/modules/checklist/data";
import { BRAND } from "@/lib/brand";

/**
 * The nightly sweep.
 *
 * Finds every student whose checklist has something overdue or landing within a
 * fortnight and queues one email, one per student per day, not one per step,
 * because five emails in a morning gets the sender blocked and the student
 * annoyed.
 */
export function sweepDeadlines(today = new Date()) {
  const students = all<{ id: string; tenant_id: string; branch_id: string | null; full_name: string }>(
    "SELECT id, tenant_id, branch_id, full_name FROM users WHERE role = 'student' AND active = 1",
  );

  let queued = 0, skipped = 0, quiet = 0;
  const day = localDay(today);

  for (const s of students) {
    const profile = getProfile(s.id);
    const intake = parseIntake(profile?.target_intake);
    if (!intake) { quiet++; continue; }   // no intake, no dates, nothing to chase

    const scope = {
      tenantId: s.tenant_id, userId: s.id, role: "student" as const,
      branchId: s.branch_id ?? null, allBranches: false,
    };
    const schedule = buildSchedule(profile?.target_country ?? null, intake, progressFor(scope, s.id), today);
    const urgent = schedule.filter(needsAttention);
    if (urgent.length === 0) { quiet++; continue; }

    const overdue = urgent.filter((u) => u.state === "overdue");
    const lines = urgent.slice(0, 6).map((u) => {
      const when = u.dueOn ? u.dueOn.toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "no date";
      const tag = u.state === "overdue" ? `OVERDUE (was due ${when})` : u.state === "due-soon" ? `due ${when}` : `start now, due ${when}`;
      return `- ${u.step.title}, ${tag}\n  ${u.step.detail}`;
    });

    const subject = overdue.length
      ? `${overdue.length} thing${overdue.length === 1 ? " is" : "s are"} overdue on your application`
      : `${urgent.length} thing${urgent.length === 1 ? "" : "s"} to do on your application`;

    const body = [
      `Namaste ${s.full_name.split(" ")[0]},`,
      "",
      overdue.length
        ? `${overdue.length} thing${overdue.length === 1 ? " is" : "s are"} past its date, and ${urgent.length} in total need attention:`
        : "Your application checklist has these coming up:",
      "",
      ...lines,
      urgent.length > 6 ? `\n...and ${urgent.length - 6} more needing attention.` : "",
      "",
      `See the full plan: ${BRAND.domain}/app/checklist`,
      "",
      `,  ${BRAND.name}`,
    ].filter(Boolean).join("\n");

    const result = queueEmail({
      tenantId: s.tenant_id, userId: s.id, kind: "checklist-deadline",
      subject, body,
      // One per student per day, whatever else changes.
      dedupeKey: `checklist:${s.id}:${day}`,
    });
    if (result === "queued") queued++; else skipped++;
  }

  return { students: students.length, queued, alreadySent: skipped, nothingDue: quiet };
}
