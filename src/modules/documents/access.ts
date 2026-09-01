import { one } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";
import { isStaff } from "@/lib/auth/roles";

/**
 * The single rule for who may touch a student's documents.
 *
 * A student may reach their own. Staff may reach any student at their own
 * consultancy. Nobody reaches across consultancies — including a super admin,
 * who has no business opening a stranger's passport scan.
 */
export function mayAccessStudent(scope: Scope, studentId: string): boolean {
  if (scope.userId === studentId) return true;
  if (!isStaff(scope.role)) return false;
  return Boolean(
    one("SELECT 1 FROM users WHERE id = ? AND tenant_id = ?", studentId, scope.tenantId),
  );
}
