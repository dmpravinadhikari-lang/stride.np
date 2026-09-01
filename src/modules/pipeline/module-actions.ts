"use server";

import { revalidatePath } from "next/cache";
import { now, run } from "@/lib/db";
import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { moduleById } from "@/lib/modules/registry";
import { logActivity } from "@/lib/crm/activity";
import { canView } from "@/modules/pipeline/data";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/**
 * Switch one feature on or off for one student.
 *
 * A student who has not chosen a country does not need a visa interview
 * simulator, and handing them every tool at once is how a product stops being
 * used at all. The counsellor decides what is in front of each person.
 *
 * Writes an explicit row either way rather than deleting to mean "on", so the
 * timeline can show a deliberate decision and the student's view does not
 * silently change when a consultancy default is edited later.
 */
export async function setStudentModule(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!isStaff(user.role)) return;

  const studentId = clean(formData.get("student_id"));
  const moduleId = clean(formData.get("module_id"));
  const enabled = clean(formData.get("enabled")) === "1";

  if (!canView(scope, studentId)) return;

  const mod = moduleById(moduleId);
  // Only features that were declared switchable. Without this check a crafted
  // form could turn off something structural, or reach a staff-only module.
  if (!mod || !mod.perStudent || mod.access !== "member") return;

  run(
    `INSERT INTO student_modules (student_id, tenant_id, module_id, enabled, set_by, set_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(student_id, module_id)
     DO UPDATE SET enabled = excluded.enabled, set_by = excluded.set_by, set_at = excluded.set_at`,
    studentId, scope.tenantId, moduleId, enabled ? 1 : 0, user.id, now(),
  );

  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "module.changed",
    summary: `${mod.name} turned ${enabled ? "on" : "off"} for this student.`,
    detail: { moduleId, enabled },
  });

  revalidatePath(`/app/pipeline/${studentId}`);
  revalidatePath("/app");
}
