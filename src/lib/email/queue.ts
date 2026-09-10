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

type Pending = { id: string; user_id: string; subject: string; body: string };

export async function flushQueue(limit = 50) {
  const provider = activeEmailProvider();
  const pending = all<Pending>(
    `SELECT n.id, n.user_id, n.subject, n.body FROM notifications n
      WHERE n.status = 'queued' ORDER BY n.created_at LIMIT ?`, limit,
  );

  let sent = 0, failed = 0;
  for (const p of pending) {
    const user = one<{ email: string }>("SELECT email FROM users WHERE id = ?", p.user_id);
    if (!user) {
      run("UPDATE notifications SET status = 'failed', error = ? WHERE id = ?", "no such user", p.id);
      failed++;
      continue;
    }
    const result = await provider.send({ to: user.email, subject: p.subject, body: p.body });
    if (result.ok) {
      run("UPDATE notifications SET status = 'sent', sent_at = ? WHERE id = ?", now(), p.id);
      sent++;
    } else {
      run("UPDATE notifications SET status = 'failed', error = ? WHERE id = ?", result.detail, p.id);
      failed++;
    }
  }
  return { provider: provider.id, considered: pending.length, sent, failed };
}
