"use server";

import { revalidatePath } from "next/cache";
import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { one } from "@/lib/db";
import { createLink, newCode, revokeLink } from "@/modules/parents/data";

export type ParentState = { ok: boolean; message?: string; token?: string; code?: string };

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/** A student may share their own file. Staff may share any student at their branch. */
function mayShare(scope: { userId: string; tenantId: string; role: string }, studentId: string) {
  if (scope.userId === studentId) return true;
  if (!isStaff(scope.role as never)) return false;
  return Boolean(one("SELECT 1 FROM users WHERE id = ? AND tenant_id = ?", studentId, scope.tenantId));
}

export async function inviteParent(_prev: ParentState, formData: FormData): Promise<ParentState> {
  const { scope } = await requireScope();
  const studentId = clean(formData.get("student_id")) || scope.userId;
  if (!mayShare(scope, studentId)) return { ok: false, message: "You cannot share that student's progress." };

  const parentName = clean(formData.get("parent_name"));
  const relation = clean(formData.get("relation")) || "Parent";
  if (parentName.length < 2) return { ok: false, message: "Enter the parent's name." };

  // A code is on by default. It is what stops a forwarded link being readable
  // by whoever the message gets passed to next.
  const useCode = clean(formData.get("use_code")) !== "0";
  const code = useCode ? newCode() : null;

  const { token } = createLink(scope, { studentId, parentName, relation, code });
  revalidatePath("/app/parents");
  return {
    ok: true, token, code: code ?? undefined,
    message: `Link created for ${parentName}. ${code ? "Send the link, and tell them the code separately — by phone, not in the same message." : "Anyone with this link can see the progress page."}`,
  };
}

export async function revokeParentLink(formData: FormData) {
  const { scope } = await requireScope();
  const id = clean(formData.get("id"));
  const link = one<{ student_id: string }>(
    "SELECT student_id FROM parent_links WHERE id = ? AND tenant_id = ?", id, scope.tenantId,
  );
  if (!link || !mayShare(scope, link.student_id)) return;
  revokeLink(scope, id);
  revalidatePath("/app/parents");
}
