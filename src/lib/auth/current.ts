import { redirect } from "next/navigation";
import { readSession, type SessionUser } from "@/lib/auth/session";
import type { Scope } from "@/lib/db/scope";
import type { Role } from "@/lib/auth/roles";

export const currentUser = readSession;

export async function requireUser(): Promise<SessionUser> {
  const user = await readSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/app");
  return user;
}

export const scopeOf = (user: SessionUser): Scope => ({
  tenantId: user.tenantId,
  userId: user.id,
  role: user.role,
});

export async function requireScope(): Promise<{ user: SessionUser; scope: Scope }> {
  const user = await requireUser();
  return { user, scope: scopeOf(user) };
}
