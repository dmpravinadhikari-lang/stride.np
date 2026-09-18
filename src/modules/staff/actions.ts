"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { hashPassword } from "@/lib/auth/password";
import { all, now, one, run, uid } from "@/lib/db";

export type StaffState = { ok: boolean; message?: string; password?: string };

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function tempPassword(): string {
  const words = ["himal", "chautari", "sagar", "gurans", "makalu", "bagmati", "pokhara", "annapurna"];
  return `${words[randomBytes(1)[0] % words.length]}-${randomBytes(2).toString("hex")}`;
}

/**
 * Gives a new member of staff their own login.
 *
 * Only a consultancy admin can do this, and only inside their own
 * consultancy. The password is shown once to the admin who created it, the
 * same way a student's is, so it can be handed over in person.
 */
export async function addStaffMember(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const user = await requireRole("super_admin", "tenant_admin");
  const scope = scopeOf(user);

  const fullName = clean(formData.get("full_name"));
  const email = clean(formData.get("email")).toLowerCase();
  const phone = clean(formData.get("phone"));
  const role = clean(formData.get("role")) === "tenant_admin" ? "tenant_admin" : "counsellor";
  const branchId = clean(formData.get("branch_id")) || null;

  if (fullName.length < 2) return { ok: false, message: "Enter their full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "That email address does not look right." };
  if (one("SELECT 1 FROM users WHERE email = ?", email)) {
    return { ok: false, message: "Someone already has an account with that email." };
  }
  if (branchId && !one("SELECT 1 FROM branches WHERE id = ? AND tenant_id = ?", branchId, scope.tenantId)) {
    return { ok: false, message: "Choose one of your own offices." };
  }

  const password = tempPassword();
  const id = uid();
  run(
    `INSERT INTO users (id, tenant_id, email, password_hash, full_name, phone, role, student_plan, email_verified, active, created_at)
     VALUES (?,?,?,?,?,?,?, NULL, 0, 1, ?)`,
    id, scope.tenantId, email, hashPassword(password), fullName, phone || null, role, now(),
  );
  run("UPDATE users SET branch_id = ? WHERE id = ?", branchId, id);

  revalidatePath("/app/people");
  return {
    ok: true,
    message: `${fullName} can now log in with ${email} and this password.`,
    password,
  };
}

/** A team is a desk work can be given to, such as "Visa desk". */
export async function addTeam(formData: FormData) {
  const user = await requireRole("super_admin", "tenant_admin");
  const scope = scopeOf(user);

  const name = clean(formData.get("name"));
  const branchId = clean(formData.get("branch_id")) || null;
  if (name.length < 2) return;
  if (branchId && !one("SELECT 1 FROM branches WHERE id = ? AND tenant_id = ?", branchId, scope.tenantId)) return;

  const teamId = uid();
  run(
    "INSERT INTO teams (id, tenant_id, branch_id, name, created_at) VALUES (?,?,?,?,?)",
    teamId, scope.tenantId, branchId, name, now(),
  );

  // Members are ticked on the same form, so a team is never created empty.
  const allowed = new Set(
    all<{ id: string }>(
      "SELECT id FROM users WHERE tenant_id = ? AND role <> 'student' AND active = 1", scope.tenantId,
    ).map((r) => r.id),
  );
  for (const memberId of formData.getAll("member_id").map(String)) {
    if (!allowed.has(memberId)) continue;
    run("INSERT OR IGNORE INTO team_members (team_id, user_id, joined_at) VALUES (?,?,?)", teamId, memberId, now());
  }

  revalidatePath("/app/people");
  revalidatePath("/app/tasks");
}
