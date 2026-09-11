import { all, now, one, run, scalar, uid } from "@/lib/db";
import { activeSmsProvider, normaliseNepaliNumber } from "@/lib/sms/provider";

/**
 * SMS goes through the same outbox table email does.
 *
 * The table already carried a `channel` column for exactly this. Reusing it
 * means one place to look for "what did we send this student", rather than a
 * consultancy having to check two.
 *
 * The one thing SMS needs that email does not is a spending cap. Email that
 * loops is embarrassing; SMS that loops is an invoice, at roughly NPR 1.40 a
 * message, and the consultancy is the one who pays.
 */

/** Messages one branch may queue in an hour. A deliberate, low ceiling. */
const HOURLY_CAP = 200;

export function queueSms(input: {
  tenantId: string;
  userId: string;
  to: string;
  kind: string;
  body: string;
  dedupeKey?: string;
}): { ok: boolean; reason?: string } {
  const to = normaliseNepaliNumber(input.to);
  if (!to) return { ok: false, reason: `${input.to} is not a Nepali mobile number.` };

  if (input.dedupeKey && one("SELECT 1 FROM notifications WHERE dedupe_key = ?", input.dedupeKey)) {
    return { ok: false, reason: "Already sent." };
  }

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const recent = scalar(
    `SELECT COUNT(*) FROM notifications
      WHERE tenant_id = ? AND channel = 'sms' AND created_at >= ?`,
    input.tenantId, hourAgo,
  );
  if (recent >= HOURLY_CAP) {
    return {
      ok: false,
      reason: `That is ${HOURLY_CAP} messages from this consultancy in an hour. Stopped, because the next one costs money and this looks like a loop rather than a campaign.`,
    };
  }

  run(
    `INSERT INTO notifications (id, tenant_id, user_id, channel, kind, subject, body, status, dedupe_key, created_at)
     VALUES (?,?,?, 'sms', ?,?,?, 'queued', ?, ?)`,
    uid(), input.tenantId, input.userId, input.kind,
    // Subject is meaningless for SMS but the column is NOT NULL, so it carries
    // the number instead of an empty string. That makes the outbox readable.
    to, input.body, input.dedupeKey ?? null, now(),
  );
  return { ok: true };
}

type Pending = { id: string; user_id: string; subject: string; body: string };

export async function flushSms(limit = 40) {
  const provider = activeSmsProvider();
  const pending = all<Pending>(
    `SELECT id, user_id, subject, body FROM notifications
      WHERE status = 'queued' AND channel = 'sms'
      ORDER BY created_at LIMIT ?`,
    limit,
  );

  let sent = 0;
  let failed = 0;
  for (const m of pending) {
    // The recipient number was stored in subject when it was queued, so a
    // later change to the user's phone cannot redirect a queued message.
    const result = await provider.send({ to: m.subject, body: m.body });
    if (result.ok) {
      run("UPDATE notifications SET status = 'sent', sent_at = ?, error = NULL WHERE id = ?", now(), m.id);
      sent++;
    } else {
      run("UPDATE notifications SET status = 'failed', error = ? WHERE id = ?", result.detail, m.id);
      failed++;
    }
  }
  return { sent, failed, provider: provider.id };
}
