import { all } from "@/lib/db";
import { MODULES, moduleById } from "@/lib/modules/registry";
import type { ModuleDef } from "@/lib/modules/types";

/**
 * What one student is actually entitled to open.
 *
 * Three gates, applied in this order, most general first:
 *
 *   1. The plan. What the consultancy is paying for.
 *   2. The consultancy switch (`tenant_modules`). What this branch has chosen
 *      to run at all, a consultancy that does not handle US applications can
 *      turn the visa interview off for everybody.
 *   3. The student switch (`student_modules`). A deliberate exception for one
 *      person. A student sitting an interview next month gets the interview
 *      module; the one still choosing a country does not need it yet.
 *
 * Only the third table stores exceptions, so an empty `student_modules` means
 * "this student follows the consultancy default" rather than "this student has
 * nothing".
 */

export type Entitlement = {
  mod: ModuleDef;
  enabled: boolean;
  /** Why it is off, so the interface can explain rather than just hide. */
  reason: "on" | "not-in-plan" | "off-for-branch" | "off-for-student";
};

/** Consultancy-level switches. Absent row means on. */
function branchSwitches(tenantId: string): Map<string, boolean> {
  const rows = all<{ module_id: string; enabled: number }>(
    "SELECT module_id, enabled FROM tenant_modules WHERE tenant_id = ?", tenantId,
  );
  return new Map(rows.map((r) => [r.module_id, r.enabled === 1]));
}

/** Per-student exceptions. Absent row means "follow the branch". */
function studentSwitches(studentId: string): Map<string, boolean> {
  const rows = all<{ module_id: string; enabled: number }>(
    "SELECT module_id, enabled FROM student_modules WHERE student_id = ?", studentId,
  );
  return new Map(rows.map((r) => [r.module_id, r.enabled === 1]));
}

/**
 * Every student-facing module with a verdict attached. Staff modules and the
 * public calculators are excluded: the first are never a student's business,
 * the second are open to the whole internet and are not worth gating.
 */
export function entitlementsFor(
  studentId: string,
  tenantId: string,
  plan: string,
): Entitlement[] {
  const branch = branchSwitches(tenantId);
  const student = studentSwitches(studentId);

  return MODULES.filter((m) => m.access === "member").map((mod) => {
    if (!mod.plans.includes(plan as never)) {
      return { mod, enabled: false, reason: "not-in-plan" as const };
    }
    if (branch.get(mod.id) === false) {
      return { mod, enabled: false, reason: "off-for-branch" as const };
    }
    const override = student.get(mod.id);
    if (override === false) {
      return { mod, enabled: false, reason: "off-for-student" as const };
    }
    return { mod, enabled: true, reason: "on" as const };
  });
}

/** The set of module ids this student may open. Used to build their sidebar. */
export function enabledModuleIds(studentId: string, tenantId: string, plan: string): Set<string> {
  const ids = new Set<string>();
  for (const e of entitlementsFor(studentId, tenantId, plan)) if (e.enabled) ids.add(e.mod.id);
  // Public tools are always reachable, signed in or not.
  for (const m of MODULES) if (m.access === "public") ids.add(m.id);
  return ids;
}

/**
 * The single question a page guard asks. Returns false for a module a student
 * has not been given, so a hand-typed URL is refused the same way the hidden
 * sidebar link would have been.
 */
export function studentMayOpen(
  moduleId: string,
  studentId: string,
  tenantId: string,
  plan: string,
): boolean {
  const mod = moduleById(moduleId);
  if (!mod) return false;
  if (mod.access === "public") return true;
  if (mod.access === "staff") return false;
  return enabledModuleIds(studentId, tenantId, plan).has(moduleId);
}

/** Modules a consultancy is allowed to toggle for an individual student. */
export const TOGGLEABLE = MODULES.filter((m) => m.perStudent);
