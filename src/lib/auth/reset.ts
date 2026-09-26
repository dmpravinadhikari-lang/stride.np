import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { all, now, one, run, uid } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { queueEmail, flushQueue } from "@/lib/email/queue";
import { BRAND } from "@/lib/brand";
import { branchUrl } from "@/lib/tenancy/host";

/**
 * Forgetting a password, and getting back in without asking anybody.
 *
 * OfficeYak had no way to do this. An owner who forgot their password had no
 * route back into their own consultancy's account, and a student had to ring
 * the office and ask a counsellor to mint them a new one. For a product sold
 * as something an office runs without support, that is the single most
 * expensive omission there is.
 *
 * Three rules shape it:
 *
 *   The answer is the same whether or not the address has an account. Telling
 *   a stranger "no such account" is telling them which addresses to try next.
 *   The token is stored hashed and used once. A leaked table is not a set of
 *   working keys, and a link forwarded to somebody else has already expired.
 *   Using it ends every session on the account, because the commonest reason
 *   a person resets a password is that they think somebody else has it.
 */

const LIFETIME_MINUTES = 60;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export type ResetRequest = { sent: boolean };

/** Starts a reset. Returns nothing about whether the address exists. */
export async function requestReset(email: string, ip: string | null): Promise<ResetRequest> {
  const person = one<{ id: string; full_name: string; tenant_id: string; auth_method: string }>(
    `SELECT u.id, u.full_name, u.tenant_id, u.auth_method
       FROM users u JOIN tenants t ON t.id = u.tenant_id
      WHERE u.email = ? AND u.active = 1 AND t.active = 1`,
    email.trim().toLowerCase(),
  );
  // Somebody who signs in with Google has no password to reset, and telling
  // them to check their email would leave them waiting for nothing.
  if (!person || person.auth_method === "google") return { sent: false };

  // Any earlier link stops working the moment a new one is asked for.
  run("UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL", now(), person.id);

  const token = randomBytes(32).toString("base64url");
  run(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, requested_ip, created_at)
     VALUES (?,?,?,?,?,?)`,
    uid(), person.id, hash(token),
    new Date(Date.now() + LIFETIME_MINUTES * 60_000).toISOString(), ip, now(),
  );

  const tenant = one<{ name: string; slug: string }>(
    "SELECT name, slug FROM tenants WHERE id = ?", person.tenant_id,
  );
  const link = `https://${branchUrl(tenant?.slug ?? "app")}/reset/${token}`;

  queueEmail({
    tenantId: person.tenant_id,
    userId: person.id,
    // Marked urgent so it is not held by quiet hours: somebody is sitting
    // there right now, locked out, waiting for it.
    kind: "password.reset",
    subject: `Setting a new ${BRAND.name} password`,
    body: [
      `${person.full_name.split(" ")[0]},`,
      "",
      `Somebody asked to set a new password for this account at ${tenant?.name ?? BRAND.name}.`,
      "",
      `Set it here: ${link}`,
      "",
      `The link works once and stops working in ${LIFETIME_MINUTES} minutes.`,
      "",
      "If this was not you, nothing has changed and you can ignore this. Your password still works.",
      "",
      "--",
      BRAND.name,
    ].join("\n"),
    dedupeKey: `reset:${person.id}:${Date.now()}`,
  });
  void flushQueue(5).catch(() => {});

  return { sent: true };
}

export type TokenCheck =
  | { ok: true; userId: string; name: string }
  | { ok: false; why: "unknown" | "expired" | "used" };

export function checkToken(token: string): TokenCheck {
  const row = one<{ id: string; user_id: string; expires_at: string; used_at: string | null; full_name: string }>(
    `SELECT r.id, r.user_id, r.expires_at, r.used_at, u.full_name
       FROM password_resets r JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = ?`,
    hash(token),
  );
  if (!row) return { ok: false, why: "unknown" };
  if (row.used_at) return { ok: false, why: "used" };
  if (new Date(row.expires_at) < new Date()) return { ok: false, why: "expired" };
  return { ok: true, userId: row.user_id, name: row.full_name };
}

/** Sets the new password, burns the token, and ends every session. */
export function completeReset(token: string, password: string): { ok: boolean; message: string } {
  const check = checkToken(token);
  if (!check.ok) {
    return {
      ok: false,
      message: check.why === "expired"
        ? "That link has expired. Ask for a new one, it takes a moment."
        : check.why === "used"
          ? "That link has already been used. Ask for a new one if you still need it."
          : "That link is not one we recognise. Ask for a new one.",
    };
  }
  if (password.trim().length < 8) return { ok: false, message: "Use a password of at least 8 characters." };

  run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(password.trim()), check.userId);
  run("UPDATE password_resets SET used_at = ? WHERE token_hash = ?", now(), hash(token));
  // Everywhere that account was signed in is signed out, which is the point.
  run("DELETE FROM sessions WHERE user_id = ?", check.userId);

  return { ok: true, message: "Password set. Sign in with it now." };
}

/** Housekeeping, so the table does not grow for ever. */
export const purgeOldResets = () =>
  all("DELETE FROM password_resets WHERE created_at < ?", new Date(Date.now() - 30 * 864e5).toISOString());
