import type { Role } from "@/lib/auth/roles";

/**
 * A Scope is proof of "who is asking". Nothing reads consultancy data without
 * one, and every query in the repositories filters on scope.tenantId.
 *
 * When this moves to PostgreSQL the same tenant id is also pushed into the
 * database session, so PostgreSQL's row-level security enforces the rule a
 * second time — a bug in a module still cannot leak another consultancy.
 */
export type Scope = {
  tenantId: string;
  userId: string;
  role: Role;
};

/** Super admins are the only ones allowed to look across consultancies. */
export function assertCrossTenant(scope: Scope) {
  if (scope.role !== "super_admin") {
    throw new Error("Not allowed to read across consultancies");
  }
}
