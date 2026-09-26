"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { scopeOf, requireUser } from "@/lib/auth/current";
import {
  recordCommission, setCommissionStatus, deleteCommission,
  type CommissionStatus,
} from "@/modules/partners/commission";

/**
 * Every action here is money, so every one of them asks for money:manage
 * rather than trusting that the page was only rendered for the right people.
 * A hidden button is not a permission.
 */

const npr = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

export async function addCommission(formData: FormData) {
  await requireCapability("money:manage");
  const scope = scopeOf(await requireUser());
  const expected = npr(formData.get("expected_npr"));
  if (expected <= 0) return;
  recordCommission(scope, {
    applicationId: String(formData.get("application_id") ?? "") || null,
    studentId: String(formData.get("student_id") ?? "") || null,
    partnerId: String(formData.get("partner_id") ?? "") || null,
    expectedNpr: expected,
    note: String(formData.get("note") ?? "") || null,
  });
  revalidatePath("/app/money");
}

export async function moveCommission(formData: FormData) {
  await requireCapability("money:manage");
  const scope = scopeOf(await requireUser());
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as CommissionStatus;
  if (!["expected", "invoiced", "received", "written_off"].includes(status)) return;
  const typed = formData.get("received_npr");
  setCommissionStatus(scope, id, status, typed ? npr(typed) : null);
  revalidatePath("/app/money");
}

export async function removeCommission(formData: FormData) {
  await requireCapability("money:manage");
  const scope = scopeOf(await requireUser());
  deleteCommission(scope, String(formData.get("id") ?? ""));
  revalidatePath("/app/money");
}
