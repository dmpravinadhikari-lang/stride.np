import { redirect } from "next/navigation";
import { readSession, type SessionUser } from "@/lib/auth/session";
import type { Scope } from "@/lib/db/scope";
import type { Role } from "@/lib/auth/roles";
import { seeFor, can as actorCan } from "@/lib/auth/access";
import type { Capability } from "@/lib/auth/permissions";

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

export const scopeOf = (user: SessionUser): Scope => {
  // How far this person sees is now a stored decision with sensible defaults,
  // rather than an inference from their role alone: an office can hold a
  // junior counsellor to their own files, or give an accountant every branch.
  const see = seeFor({
    id: user.id, role: user.role, position: user.position,
    dataScope: user.dataScope, isHeadOffice: user.isHeadOffice,
  });
  return {
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role,
    position: user.position,
    see,
    branchId: user.branchId,
    allBranches: see === "all",
  };
};

/** May this person, with their position and their own exceptions, do this. */
export async function requirePermission(capability: Capability): Promise<SessionUser> {
  const user = await requireUser();
  if (!actorCan(
    { id: user.id, role: user.role, position: user.position, dataScope: user.dataScope },
    capability,
  )) redirect("/app");
  return user;
}

export async function requireScope(): Promise<{ user: SessionUser; scope: Scope }> {
  const user = await requireUser();
  return { user, scope: scopeOf(user) };
}
