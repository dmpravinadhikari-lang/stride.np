import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { all, now, one, run, uid } from "@/lib/db";
import type { Role } from "@/lib/auth/roles";

const COOKIE = "stride_session";
const DAYS = 30;

const secret = () => process.env.STRIDE_SESSION_SECRET || "dev-only-secret";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex").slice(0, 32);

function unseal(raw: string | undefined): string | null {
  if (!raw) return null;
  const [id, mac] = raw.split(".");
  if (!id || !mac) return null;
  const expected = sign(id);
  if (mac.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? id : null;
}

export async function startSession(userId: string) {
  const id = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + DAYS * 864e5);
  run(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)",
    id, userId, expires.toISOString(), now(),
  );
  const jar = await cookies();
  jar.set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const id = unseal(jar.get(COOKIE)?.value);
  if (id) run("DELETE FROM sessions WHERE id = ?", id);
  jar.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: Role;
  studentPlan: string | null;
  tenantName: string;
  tenantSlug: string;
  tenantPlan: string;
  tenantAccent: string;
  tenantKind: string;
  /** The branch this person works at, and its name for the chrome. */
  branchId: string | null;
  branchName: string | null;
  /** True when they sit at head office and therefore see every branch. */
  isHeadOffice: boolean;
  /** The job they do here, which decides what they may touch. */
  position: string | null;
  /** An explicit "how far they see", set by an admin. Null means the default. */
  dataScope: string | null;
};

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const id = unseal(jar.get(COOKIE)?.value);
  if (!id) return null;

  const row = one<Record<string, string>>(
    `SELECT u.id, u.tenant_id, u.email, u.full_name, u.role, u.student_plan,
            t.name AS tenant_name, t.slug AS tenant_slug, t.plan AS tenant_plan,
            t.accent_color AS tenant_accent, t.kind AS tenant_kind, s.expires_at,
            u.branch_id, b.name AS branch_name, b.is_head_office,
            u.position, u.data_scope
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN tenants t ON t.id = u.tenant_id
       LEFT JOIN branches b ON b.id = u.branch_id
      WHERE s.id = ? AND u.active = 1 AND t.active = 1`,
    id,
  );
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    run("DELETE FROM sessions WHERE id = ?", id);
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as Role,
    studentPlan: row.student_plan ?? null,
    tenantName: row.tenant_name,
    tenantSlug: row.tenant_slug,
    tenantPlan: row.tenant_plan,
    tenantAccent: row.tenant_accent,
    tenantKind: row.tenant_kind,
    branchId: row.branch_id ?? null,
    branchName: row.branch_name ?? null,
    // A consultancy owner sees every branch whether or not they happen to sit
    // at the head office desk. Branch staff see their own.
    isHeadOffice: String(row.is_head_office) === "1",
    position: row.position ?? null,
    dataScope: row.data_scope ?? null,
  };
}

/** Housekeeping, called occasionally, cheap. */
export function purgeExpiredSessions() {
  run("DELETE FROM sessions WHERE expires_at < ?", now());
  return all("SELECT 1").length;
}
