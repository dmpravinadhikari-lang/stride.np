import { all, now, one, run } from "@/lib/db";
import { queueEmail } from "@/lib/email/queue";
import { EMAIL_KINDS, isEmailKind, type EmailKind } from "@/lib/email/kinds";
import { BRAND } from "@/lib/brand";

/**
 * Telling somebody something, by email, once.
 *
 * Three rules, and the middle one is why this file exists rather than each
 * module calling the queue itself:
 *
 *   1. The person can turn any kind off, and absence of a row means on.
 *   2. Nobody is emailed about something they did themselves. An office of
 *      four people assigning each other work all morning would otherwise send
 *      each of them a mailbox full of their own clicks.
 *   3. The same message never goes twice, which the queue enforces on the
 *      dedupe key.
 */

export function wants(userId: string, kind: EmailKind): boolean {
  const row = one<{ enabled: number }>(
    "SELECT enabled FROM notification_prefs WHERE user_id = ? AND kind = ?", userId, kind,
  );
  return row ? row.enabled === 1 : true;
}

export function setPref(userId: string, kind: string, enabled: boolean) {
  if (!isEmailKind(kind)) return;
  run(
    `INSERT INTO notification_prefs (user_id, kind, enabled, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(user_id, kind) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
    userId, kind, enabled ? 1 : 0, now(),
  );
}

export const prefsFor = (userId: string) =>
  Object.fromEntries(
    all<{ kind: string; enabled: number }>(
      "SELECT kind, enabled FROM notification_prefs WHERE user_id = ?", userId,
    ).map((r) => [r.kind, r.enabled === 1]),
  ) as Record<string, boolean>;

/** The link that takes somebody straight to the thing the email is about. */
const linkTo = (slug: string | null, href: string) =>
  slug ? `https://${slug}.${BRAND.domain}${href}` : `https://${BRAND.domain}${href}`;

export type Notice = {
  tenantId: string;
  /** Who it is for. */
  userId: string | null;
  /** Everybody on this team, minus whoever caused it. */
  teamId?: string | null;
  /** Who did the thing. Never emailed about their own action. */
  actorId?: string | null;
  kind: EmailKind;
  subject: string;
  /** One or two sentences. Plain language, no markup. */
  line: string;
  /** Where it happened, relative, for example /app/tasks. */
  href: string;
  /** The button on the email. */
  cta?: string;
  dedupeKey: string;
};

/**
 * Queue one notice for whoever it concerns.
 *
 * Returns how many messages were written, which is what the tests assert on
 * and what a caller can log without caring who ended up on the list.
 */
export function notify(n: Notice): number {
  const targets = new Set<string>();
  if (n.userId) targets.add(n.userId);
  if (n.teamId) {
    for (const m of all<{ user_id: string }>(
      "SELECT user_id FROM team_members WHERE team_id = ?", n.teamId,
    )) targets.add(m.user_id);
  }
  if (n.actorId) targets.delete(n.actorId);
  if (targets.size === 0) return 0;

  const slug = one<{ slug: string }>("SELECT slug FROM tenants WHERE id = ?", n.tenantId)?.slug ?? null;
  let queued = 0;

  for (const userId of targets) {
    const person = one<{ full_name: string; active: number }>(
      "SELECT full_name, active FROM users WHERE id = ? AND tenant_id = ?", userId, n.tenantId,
    );
    if (!person || person.active !== 1) continue;
    if (!wants(userId, n.kind)) continue;

    const body = render({
      name: person.full_name.split(" ")[0],
      line: n.line,
      url: linkTo(slug, n.href),
      cta: n.cta ?? "Open it",
      kindLabel: EMAIL_KINDS[n.kind].label,
    });

    const result = queueEmail({
      tenantId: n.tenantId, userId, kind: n.kind,
      subject: n.subject, body,
      // The key has the person in it, or the first recipient would swallow
      // the message for everybody else on the team.
      dedupeKey: `${n.dedupeKey}:${userId}`,
    });
    if (result === "queued") queued++;
  }
  return queued;
}

/**
 * The message itself, in plain text.
 *
 * Plain text on purpose: it arrives the same in Gmail, in Outlook and on a
 * five year old Android phone, it cannot break, and it never lands in the
 * promotions tab because it looks like a newsletter.
 */
function render(m: { name: string; line: string; url: string; cta: string; kindLabel: string }): string {
  return [
    `${m.name},`,
    "",
    m.line,
    "",
    `${m.cta}: ${m.url}`,
    "",
    "--",
    `${BRAND.name}`,
    `You get this because "${m.kindLabel}" is on. Turn it off in your profile.`,
  ].join("\n");
}
