"use server";

import { redirect } from "next/navigation";
import { now, one, run, uid } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { endSession, startSession } from "@/lib/auth/session";
import { ensureProfile } from "@/lib/profile";
import { guard, keyFor, reset } from "@/lib/security/rate-limit";
import { currentBranch } from "@/lib/tenancy/branch";
import { logActivity } from "@/lib/crm/activity";

export type AuthState = { ok: boolean; message?: string };

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "consultancy";

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));
  if (!email || !password) return { ok: false, message: "Enter your email and password." };

  // Limited per address AND per account, so one attacker cannot grind through
  // a password list and cannot lock a victim out by hammering their email.
  const byIp = await guard("login");
  if (!byIp.ok) return { ok: false, message: byIp.message };
  const byAccount = await guard("login", email);
  if (!byAccount.ok) return { ok: false, message: byAccount.message };

  const user = one<{ id: string; password_hash: string; active: number; tenant_id: string; full_name: string; role: string }>(
    "SELECT id, password_hash, active, tenant_id, full_name, role FROM users WHERE email = ?", email,
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { ok: false, message: "That email and password do not match an account." };
  }
  if (!user.active) return { ok: false, message: "This account has been switched off. Contact your consultancy." };

  // A branch address only opens that branch's accounts. Without this,
  // sprout.stride.np would happily sign in a Happy Panda student — the login
  // would work, the branding would be wrong, and the student would reasonably
  // conclude their file had been handed to a different consultancy.
  //
  // The message deliberately does not say whether the account exists
  // elsewhere; that would let anyone enumerate which consultancy a person
  // belongs to just by trying addresses.
  const branch = await currentBranch();
  if (branch && user.tenant_id !== branch.id) {
    return { ok: false, message: "That email and password do not match an account." };
  }

  // A correct password clears the counter, so an honest typo streak costs nothing.
  reset(await keyFor("login", email));

  // The first sign-in is worth recording: it is the moment a consultancy can
  // see their invitation actually landed, rather than assuming it did.
  const firstTime = !one("SELECT 1 FROM users WHERE id = ? AND last_seen_at IS NOT NULL", user.id);
  if (firstTime && user.role === "student") {
    logActivity({ tenantId: user.tenant_id }, {
      studentId: user.id, actorId: user.id, actorLabel: user.full_name,
      kind: "account.first_login",
      summary: `${user.full_name} signed in for the first time.`,
    });
    run("UPDATE student_invites SET status = 'accepted', accepted_at = ? WHERE student_id = ? AND status = 'sent'", now(), user.id);
  }

  run("UPDATE users SET last_seen_at = ? WHERE id = ?", now(), user.id);
  await startSession(user.id);
  redirect("/app");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = clean(formData.get("full_name"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));
  const phone = clean(formData.get("phone"));
  const orgName = clean(formData.get("org_name"));

  // Students do not sign themselves up. They are enrolled by the consultancy
  // that is advising them, which is what makes their file *their* file rather
  // than a stray account with no counsellor attached. Anything that arrives
  // here asking for a student account is rejected outright rather than
  // quietly downgraded, so a stale form or a scripted POST cannot create one.
  const accountType = "consultancy";

  const limited = await guard("signup");
  if (!limited.ok) return { ok: false, message: limited.message };

  if (fullName.length < 2) return { ok: false, message: "Enter your full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "That email address does not look right." };
  if (password.length < 8) return { ok: false, message: "Use a password of at least 8 characters." };
  if (orgName.length < 2) return { ok: false, message: "Enter your consultancy's name." };
  if (one("SELECT 1 FROM users WHERE email = ?", email)) {
    return { ok: false, message: "An account already uses that email. Try logging in." };
  }

  // The slug becomes the branch's own address, so it has to be unique and it
  // has to survive being read down a phone line to a student.
  let slug = slugify(orgName);
  if (one("SELECT 1 FROM tenants WHERE slug = ?", slug)) slug = `${slug}-${Math.floor(Math.random() * 900 + 100)}`;

  const tenantId = uid();
  run(
    `INSERT INTO tenants (id, slug, name, plan, kind, accent_color, contact_email, active, created_at)
     VALUES (?,?,?,'starter','consultancy','#07717F',?,1,?)`,
    tenantId, slug, orgName, email, now(),
  );

  const userId = uid();
  run(
    `INSERT INTO users (id, tenant_id, email, password_hash, full_name, phone, role, student_plan, email_verified, active, created_at)
     VALUES (?,?,?,?,?,?, 'tenant_admin', NULL, 0, 1, ?)`,
    userId, tenantId, email, hashPassword(password), fullName, phone || null, now(),
  );

  logActivity({ tenantId }, {
    actorId: userId, actorLabel: fullName,
    kind: "account.created",
    summary: `${orgName} set up on STRIDE at ${slug}.stride.np.`,
  });

  await startSession(userId);
  redirect("/app");
}

export async function logout() {
  await endSession();
  redirect("/");
}
