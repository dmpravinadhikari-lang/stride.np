import type { Role } from "@/lib/auth/roles";

/**
 * A Scope is proof of "who is asking". Nothing reads consultancy data without
 * one, and every query in the repositories filters on scope.tenantId.
 *
 * When this moves to PostgreSQL the same tenant id is also pushed into the
 * database session, so PostgreSQL's row-level security enforces the rule a
 * second time, a bug in a module still cannot leak another consultancy.
 */
export type Scope = {
  tenantId: string;
  userId: string;
  role: Role;
  /** The branch this person works at. Null only for a platform super admin. */
  branchId: string | null;
  /**
   * True for head office staff and consultancy owners, who see every branch
   * under their tenant. False for branch staff, who see their own.
   *
   * This is the whole branch rule. It lives here rather than in each page so
   * that a new screen cannot forget it: the helper below is the only way a
   * query is meant to express "and this branch".
   */
  allBranches: boolean;
};

/**
 * The SQL fragment and parameter for "and only this branch", or an empty
 * fragment when the caller sees all of them.
 *
 * Used as:
 *   const b = branchFilter(scope, "p");
 *   all(`SELECT * FROM pipeline_entries p WHERE p.tenant_id = ? ${b.sql}`,
 *       scope.tenantId, ...b.params);
 *
 * Returning the params as an array rather than a value is what lets a caller
 * splat them without knowing whether there are none or one.
 */
export function branchFilter(scope: Scope, alias = ""): { sql: string; params: string[] } {
  if (scope.allBranches || !scope.branchId) return { sql: "", params: [] };
  const col = alias ? `${alias}.branch_id` : "branch_id";
  // A row that predates branches has a NULL branch_id and belongs to head
  // office. Branch staff should not see those, so NULL is excluded rather
  // than treated as "everyone's".
  return { sql: ` AND ${col} = ?`, params: [scope.branchId] };
}

/** Super admins are the only ones allowed to look across consultancies. */
export function assertCrossTenant(scope: Scope) {
  if (scope.role !== "super_admin") {
    throw new Error("Not allowed to read across consultancies");
  }
}
