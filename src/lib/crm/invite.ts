import { now, run, uid } from "@/lib/db";
import { flushQueue, queueEmail } from "@/lib/email/queue";
import { logActivity } from "@/lib/crm/activity";
import { branchUrl } from "@/lib/tenancy/host";

/**
 * Sending a student their way in.
 *
 * The student never chooses a password, because the student never signs up.
 * The consultancy enters their name and email; this generates credentials and
 * posts them, and records that it did so.
 *
 * The address in the message is the consultancy's own, happypanda.stride.np, 
 * so the student arrives somewhere that looks like the organisation they
 * walked into, rather than a platform they have never heard of.
 */

export function inviteBody(opts: {
  studentName: string;
  branchName: string;
  branchSlug: string;
  email: string;
  password: string;
  counsellorName?: string | null;
}): string {
  const url = branchUrl(opts.branchSlug);
  const from = opts.counsellorName
    ? `${opts.counsellorName} at ${opts.branchName}`
    : opts.branchName;

  return [
    `Namaste ${opts.studentName},`,
    ``,
    `${from} has set up your study abroad file. You can sign in and follow it yourself, where your application has reached, what paperwork is still outstanding, and what happens next.`,
    ``,
    `Sign in at:  https://${url}`,
    `Email:       ${opts.email}`,
    `Password:    ${opts.password}`,
    ``,
    `Please change that password once you are in, Profile, then Password.`,
    ``,
    `Anything you are unsure about, ask ${opts.branchName} directly. They can see the same file you can.`,
    ``,
    `,  ${opts.branchName}`,
  ].join("\n");
}

/**
 * Queue the welcome message and record the send.
 *
 * The invite row is written whatever happens to the email, so staff can see a
 * send was attempted and resend it. Silence is the worst outcome here: a
 * consultancy that believes a student was invited, and a student who never
 * heard anything, is exactly the failure this record exists to prevent.
 */
export function sendInvite(opts: {
  tenantId: string;
  studentId: string;
  studentName: string;
  email: string;
  password: string;
  branchName: string;
  branchSlug: string;
  sentById: string;
  sentByName: string;
  counsellorName?: string | null;
}): { ok: boolean; note: string } {
  const body = inviteBody(opts);

  const result = queueEmail({
    tenantId: opts.tenantId,
    userId: opts.studentId,
    kind: "student_invite",
    subject: `Your file at ${opts.branchName} is open`,
    body,
    // Re-sending is a deliberate act with a fresh password, so the key carries
    // a timestamp rather than collapsing every resend into one.
    dedupeKey: `invite:${opts.studentId}:${Date.now()}`,
  });

  run(
    `INSERT INTO student_invites (id, tenant_id, student_id, sent_to, channel, sent_by, status, created_at)
     VALUES (?,?,?,?, 'email', ?, ?, ?)`,
    uid(), opts.tenantId, opts.studentId, opts.email, opts.sentById,
    result === "queued" ? "sent" : "failed", now(),
  );

  logActivity({ tenantId: opts.tenantId }, {
    studentId: opts.studentId,
    actorId: opts.sentById,
    actorLabel: opts.sentByName,
    kind: "account.invited",
    summary: `Sign-in details sent to ${opts.email}.`,
    detail: { channel: "email", branch: opts.branchSlug },
  });

  /*
   * Posted now, not on the next cron run.
   *
   * Every other message in the product can wait for the scheduled flush; this
   * one cannot. A student is told at the counter to expect an email, and a
   * consultancy that has not set up cron yet, which is every consultancy on
   * its first day, would have had that email sit in a table for ever.
   */
  void flushQueue(5).catch(() => {});

  return result === "queued"
    ? { ok: true, note: `Sign-in details are on their way to ${opts.email}.` }
    : { ok: false, note: `Could not queue the email to ${opts.email}. Send them again from their file.` };
}
