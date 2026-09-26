import { redirect } from "next/navigation";
import { requireUser, scopeOf } from "@/lib/auth/current";
import { can } from "@/lib/auth/access";
import type { Capability } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import type { Scope } from "@/lib/db/scope";
import { one } from "@/lib/db";

/**
 * The gate every protected screen and action should go through.
 *
 * requireCapability answers "may this role do this at all".
 * assertOwnStudent answers "and is this particular student theirs", the two
 * questions that together make up every access decision in OfficeYak.
 */
export async function requireCapability(
  capability: Capability,
): Promise<{ user: SessionUser; scope: Scope }> {
  const user = await requireUser();
  if (!can(user, capability)) redirect("/app");
  return { user, scope: scopeOf(user) };
}

/** True when the scope may act on this student. Ownership, or same consultancy. */
export function ownsStudent(scope: Scope, studentId: string): boolean {
  if (scope.userId === studentId) return true;
  if (!can({ id: scope.userId, role: scope.role, position: scope.position }, "students:view")) return false;
  return Boolean(one("SELECT 1 FROM users WHERE id = ? AND tenant_id = ?", studentId, scope.tenantId));
}

/** Same, but for a server action, returns rather than redirects. */
export function allowed(scope: Scope, capability: Capability, studentId?: string): boolean {
  if (!can({ id: scope.userId, role: scope.role, position: scope.position }, capability)) return false;
  if (studentId && !ownsStudent(scope, studentId)) return false;
  return true;
}
