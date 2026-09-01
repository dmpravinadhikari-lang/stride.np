"use server";

import { revalidatePath } from "next/cache";
import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { one } from "@/lib/db";
import { saveProfile } from "@/lib/profile";
import { setStatus } from "@/modules/checklist/data";
import { stepById } from "@/modules/checklist/steps";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function mayEdit(scope: { userId: string; tenantId: string; role: string }, studentId: string) {
  if (scope.userId === studentId) return true;
  if (!isStaff(scope.role as never)) return false;
  return Boolean(one("SELECT 1 FROM users WHERE id = ? AND tenant_id = ?", studentId, scope.tenantId));
}

export async function toggleStep(formData: FormData) {
  const { scope } = await requireScope();
  const studentId = clean(formData.get("student_id")) || scope.userId;
  const stepId = clean(formData.get("step_id"));
  const status = clean(formData.get("status"));
  if (!mayEdit(scope, studentId) || !stepById(stepId)) return;
  if (!["todo", "doing", "done", "skipped"].includes(status)) return;

  setStatus(scope, studentId, stepId, status);
  revalidatePath("/app/checklist");
  revalidatePath(`/app/pipeline/${studentId}`);
}

/** The intake month is what gives every step a date, so it is editable here. */
export async function setIntake(formData: FormData) {
  const { scope } = await requireScope();
  saveProfile(scope.userId, scope.tenantId, { target_intake: clean(formData.get("target_intake")) });
  revalidatePath("/app/checklist");
  revalidatePath("/app/profile");
}
