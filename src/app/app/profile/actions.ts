"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { PROFILE_FIELDS, saveProfile } from "@/lib/profile";

export type ProfileState = { ok: boolean; message?: string };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const values: Record<string, string> = {};
  for (const field of PROFILE_FIELDS) values[field] = String(formData.get(field) ?? "");
  saveProfile(user.id, user.tenantId, values);
  revalidatePath("/app/profile");
  revalidatePath("/app");
  return { ok: true, message: "Saved. Every tool now works from these details." };
}
