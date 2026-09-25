"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { EMAIL_KIND_IDS } from "@/lib/email/kinds";
import { setPref } from "@/lib/email/notify";

/**
 * Saving the switches.
 *
 * An unticked box sends nothing at all, so the form is read as "everything
 * not in this list is off" rather than as a list of changes. That is the only
 * way a checkbox form can turn something off.
 */
export async function saveEmailPrefs(formData: FormData) {
  const user = await requireUser();
  const on = new Set(formData.getAll("kind").map(String));
  for (const kind of EMAIL_KIND_IDS) setPref(user.id, kind, on.has(kind));
  revalidatePath("/app/profile");
}
