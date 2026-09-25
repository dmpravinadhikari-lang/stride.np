import { all, now, one, run, uid } from "@/lib/db";
import { activeEmailProvider } from "@/lib/email/provider";

/**
 * Every message is written to the database first and sent afterwards.
 *
 * That means a failed send is retried rather than lost, the same reminder never
 * goes out twice (dedupe_key), and there is a record of what was sent to whom, 
 * which a consultancy owner will eventually ask for.
 */
export function queueEmail(input: {
  tenantId: string; userId: string; kind: string;
  subject: string; body: string; dedupeKey: string;
}): "queued" | "duplicate" {
  if (one("SELECT 1 FROM notifications WHERE dedupe_key = ?", input.dedupeKey)) return "duplicate";
  run(
    `INSERT INTO notifications (id, tenant_id, user_id, channel, kind, subject, body, status, dedupe_key, created_at)
     VALUES (?,?,?,'email',?,?,?,'queued',?,?)`,
    uid(), input.tenantId, input.userId, input.kind, input.subject, input.body, input.dedupeKey, now(),
  );
  return "queued";
}

type Pending = { id: string; user_id: string; subject: string; body: string; attempts: number | null; kind: string };

/** Five tries, then it waits for a person. */
const MAX_ATTEMPTS = 5;

/**
 * What must go out whatever the hour.
 *
 * Quiet hours protect people from the product nudging them at midnight. They
 * must never hold a message the person is waiting for: a student signed up at
 * nine in the evening is standing at the desk being told to check their email,
 * and "it will arrive at six" is not an answer anybody at that counter can
 * use. So anything somebody just triggered by hand goes now, and only the
 * scheduled post waits for morning.
 */
const URGENT = new Set(["student_invite", "account.invite", "password.reset"]);

/**
 * Nobody is emailed in the middle of the night, unless they asked for it.
 *
 * Work mail at two in the morning is read as an emergency, wakes a phone on a
 * bedside table and is the fastest way to have an office mute the sender. The
 * scheduled message waits in the queue and goes out with the morning run.
 */
export function inSendingHours(at: Date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kathmandu" }).format(at),
  );
  return hour >= 6 && hour < 21;
}

export async function flushQueue(limit = 50, at: Date = new Date()) {
  const provider = activeEmailProvider();
  const quiet = !inSendingHours(at);

  const pending = all<Pending>(
    `SELECT n.id, n.user_id, n.subject, n.body, n.attempts, n.kind FROM notifications n
      WHERE n.status = 'queued' ORDER BY n.created_at LIMIT ?`, limit,
  ).filter((p) => !quiet || URGENT.has(p.kind));

  if (pending.length === 0 && quiet) {
    return { provider: provider.id, considered: 0, sent: 0, failed: 0, held: "outside sending hours" };
  }

  let sent = 0, failed = 0, retrying = 0;
  for (const p of pending) {
    const attempts = (p.attempts ?? 0) + 1;
    const user = one<{ email: string; active: number }>(
      "SELECT email, active FROM users WHERE id = ?", p.user_id,
    );
    // A person who has left the consultancy is not written to, and the
    // message is closed rather than retried forever.
    if (!user || user.active !== 1) {
      run(
        "UPDATE notifications SET status = 'failed', error = ?, attempts = ? WHERE id = ?",
        user ? "account switched off" : "no such user", attempts, p.id,
      );
      failed++;
      continue;
    }
    const result = await provider.send({ to: user.email, subject: p.subject, body: p.body });
    if (result.ok) {
      run("UPDATE notifications SET status = 'sent', sent_at = ?, attempts = ? WHERE id = ?", now(), attempts, p.id);
      sent++;
    } else if (attempts >= MAX_ATTEMPTS) {
      run("UPDATE notifications SET status = 'failed', error = ?, attempts = ? WHERE id = ?", result.detail, attempts, p.id);
      failed++;
    } else {
      // Left queued on purpose: the next run tries it again.
      run("UPDATE notifications SET error = ?, attempts = ? WHERE id = ?", result.detail, attempts, p.id);
      retrying++;
    }
  }
  return { provider: provider.id, considered: pending.length, sent, failed, retrying };
}

/** What the outbox screen shows: the last messages, whatever happened to them. */
export const recentMail = (tenantId: string, limit = 25) =>
  all<{
    id: string; kind: string; subject: string; status: string; error: string | null;
    created_at: string; sent_at: string | null; full_name: string; email: string;
  }>(
    `SELECT n.id, n.kind, n.subject, n.status, n.error, n.created_at, n.sent_at,
            u.full_name, u.email
       FROM notifications n JOIN users u ON u.id = n.user_id
      WHERE n.tenant_id = ? ORDER BY n.created_at DESC LIMIT ?`,
    tenantId, limit,
  );

/** Counts for the header of that screen. */
export const mailTally = (tenantId: string) =>
  one<{ queued: number; sent: number; failed: number }>(
    `SELECT
       SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) queued,
       SUM(CASE WHEN status = 'sent'   THEN 1 ELSE 0 END) sent,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) failed
     FROM notifications WHERE tenant_id = ?`,
    tenantId,
  ) ?? { queued: 0, sent: 0, failed: 0 };
