"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { clockIn, clockOut, type ClockResult } from "@/modules/attendance/data";

/**
 * The clock.
 *
 * Location is taken here every time, and never at sign-in. Opening the console
 * is something somebody does from a desk, a bus or their sofa; clocking in is
 * the deliberate act that says a working day has started. Asking at sign-in
 * would be both redundant and pointless: stopping somebody reading a student
 * file from home achieves nothing.
 */

const n = (v: FormDataEntryValue | null): number | null => {
  const x = Number(String(v ?? ""));
  return Number.isFinite(x) ? x : null;
};

async function requestInfo() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent"),
  };
}

export async function punch(_prev: ClockResult | null, formData: FormData): Promise<ClockResult> {
  const { user, scope } = await requireScope();
  if (!isStaff(user.role)) {
    return { ok: false, within: false, distance: -1, message: "Only staff clock in." };
  }

  const lat = n(formData.get("lat"));
  const lng = n(formData.get("lng"));
  const fix = lat !== null && lng !== null
    ? { lat, lng, accuracy: n(formData.get("accuracy")) }
    : null;

  const input = {
    fix,
    reason: String(formData.get("reason") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
    ...(await requestInfo()),
  };

  const result = String(formData.get("direction")) === "out"
    ? clockOut(scope, input)
    : clockIn(scope, input);

  revalidatePath("/app/attendance");
  revalidatePath("/app");
  return result;
}
