"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { run } from "@/lib/db";
import { PLAN_IDS } from "@/lib/plans";

export async function setTenantPlan(formData: FormData) {
  await requireCapability("platform:tenants");
  const tenantId = String(formData.get("tenant_id") ?? "");
  const plan = String(formData.get("plan") ?? "");
  if (!PLAN_IDS.includes(plan as never)) return;
  run("UPDATE tenants SET plan = ? WHERE id = ?", plan, tenantId);
  revalidatePath("/app/admin");
}

export async function setTenantActive(formData: FormData) {
  await requireCapability("platform:tenants");
  const tenantId = String(formData.get("tenant_id") ?? "");
  const active = String(formData.get("active") ?? "1") === "1" ? 1 : 0;
  run("UPDATE tenants SET active = ? WHERE id = ?", active, tenantId);
  revalidatePath("/app/admin");
}
