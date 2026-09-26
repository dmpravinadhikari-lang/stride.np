"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requireRole, requireUser } from "@/lib/auth/current";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { all, one, run, scalar } from "@/lib/db";
import { guard } from "@/lib/security/rate-limit";
import { sessionSecret } from "@/lib/security/secrets";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export type AccountState = { ok: boolean; message?: string };

/* ------------------------------------------------------------- your details */

export async function saveMyDetails(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const fullName = clean(formData.get("full_name"));
  const phone = clean(formData.get("phone"));

  if (fullName.length < 2) return { ok: false, message: "Enter your full name." };

  run("UPDATE users SET full_name = ?, phone = ? WHERE id = ?", fullName, phone || null, user.id);
  revalidatePath("/app/profile");
  revalidatePath("/app");
  return { ok: true, message: "Saved." };
}

/* ---------------------------------------------------------------- password */

/**
 * Changing your own password.
 *
 * The current one is asked for, because a console left open on a desk should
 * not be a way to take somebody's account. Every other session is ended, so
 * changing it after a laptop goes missing actually locks the laptop out.
 */
export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();

  const limited = await guard("login", `password:${user.id}`);
  if (!limited.ok) return { ok: false, message: limited.message };

  const current = clean(formData.get("current"));
  const next = clean(formData.get("next"));
  const again = clean(formData.get("again"));

  const row = one<{ password_hash: string; auth_method: string }>(
    "SELECT password_hash, auth_method FROM users WHERE id = ?", user.id,
  );
  if (!row) return { ok: false, message: "Account not found." };
  if (row.auth_method === "google") {
    return { ok: false, message: "You sign in with Google, so there is no password to change here." };
  }
  if (!verifyPassword(current, row.password_hash)) {
    return { ok: false, message: "That is not your current password." };
  }
  if (next.length < 8) return { ok: false, message: "Use at least 8 characters." };
  if (next !== again) return { ok: false, message: "The two new passwords are not the same." };
  if (verifyPassword(next, row.password_hash)) {
    return { ok: false, message: "That is the password you already have. Pick a different one." };
  }

  run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(next), user.id);
  await endOtherSessions(user.id);

  revalidatePath("/app/profile");
  return { ok: true, message: "Password changed. Anywhere else you were signed in has been signed out." };
}

/* ------------------------------------------------------------- the sessions */

const sign = (value: string) =>
  createHmac("sha256", sessionSecret())
    .update(value).digest("hex").slice(0, 32);

/** The id of the session this request is using, so it is the one kept. */
async function currentSessionId(): Promise<string | null> {
  const raw = (await cookies()).get("officeyak_session")?.value;
  if (!raw) return null;
  const [id, mac] = raw.split(".");
  if (!id || !mac) return null;
  const expected = sign(id);
  if (mac.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? id : null;
}

async function endOtherSessions(userId: string): Promise<number> {
  const keep = await currentSessionId();
  const before = scalar("SELECT COUNT(*) FROM sessions WHERE user_id = ?", userId);
  run("DELETE FROM sessions WHERE user_id = ? AND id <> ?", userId, keep ?? "");
  return Math.max(0, before - 1);
}

/** How many other places this account is signed in. */
export async function otherSessionCount(): Promise<number> {
  const user = await requireUser();
  const keep = await currentSessionId();
  return scalar(
    "SELECT COUNT(*) FROM sessions WHERE user_id = ? AND id <> ? AND expires_at > ?",
    user.id, keep ?? "", new Date().toISOString(),
  );
}

export async function signOutEverywhereElse() {
  const user = await requireUser();
  await endOtherSessions(user.id);
  revalidatePath("/app/profile");
}

/* --------------------------------------------------------- the consultancy */

/**
 * The consultancy's own details, edited by whoever runs it.
 *
 * The subdomain is not here on purpose. It is printed on cards, saved in
 * students' browsers and written into every invite email already sent:
 * changing it quietly would break all of that, so it is shown and not edited.
 */
export async function saveConsultancy(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireRole("super_admin", "tenant_admin");

  const name = clean(formData.get("name"));
  const email = clean(formData.get("contact_email")).toLowerCase();
  const phone = clean(formData.get("contact_phone"));
  const address = clean(formData.get("address"));

  if (name.length < 2) return { ok: false, message: "Enter your consultancy's name." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "That contact email does not look right." };
  }

  run(
    "UPDATE tenants SET name = ?, contact_email = ?, contact_phone = ?, address = ? WHERE id = ?",
    name, email || null, phone || null, address || null, user.tenantId,
  );
  revalidatePath("/app/profile");
  revalidatePath("/app");
  return { ok: true, message: "Saved. This is the name on invites and payslips." };
}

/** What the consultancy is using, against what the plan allows. */
export async function consultancyUsage() {
  const user = await requireRole("super_admin", "tenant_admin");
  const tenant = one<{ name: string; slug: string; plan: string; contact_email: string | null; contact_phone: string | null; address: string | null }>(
    "SELECT name, slug, plan, contact_email, contact_phone, address FROM tenants WHERE id = ?", user.tenantId,
  );
  return {
    tenant,
    students: scalar(
      "SELECT COUNT(*) FROM pipeline_entries WHERE tenant_id = ? AND stage NOT IN ('departed','lost')",
      user.tenantId,
    ),
    offices: scalar("SELECT COUNT(*) FROM branches WHERE tenant_id = ? AND active = 1", user.tenantId),
    staff: scalar(
      "SELECT COUNT(*) FROM users WHERE tenant_id = ? AND role <> 'student' AND active = 1",
      user.tenantId,
    ),
    admins: all<{ full_name: string; email: string }>(
      `SELECT full_name, email FROM users
        WHERE tenant_id = ? AND role = 'tenant_admin' AND active = 1 ORDER BY full_name`,
      user.tenantId,
    ),
  };
}
