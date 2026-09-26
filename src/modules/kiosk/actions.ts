"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireRole, requireUser, scopeOf } from "@/lib/auth/current";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { one, run } from "@/lib/db";
import { guard } from "@/lib/security/rate-limit";
import { clockIn, clockOut, openShift, type ClockResult } from "@/modules/attendance/data";
import { currentDevice, enrolDevice, forgetDevice, retireDevice } from "@/modules/kiosk/device";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const num = (v: FormDataEntryValue | null): number | null => {
  // An empty box is "no location", not zero. Number("") is 0, and 0,0 is a
  // real point in the Atlantic, so the old version reported anybody whose
  // browser blocks location as nine thousand kilometres from the office.
  const raw = String(v ?? "").trim();
  if (raw === "") return null;
  const x = Number(raw);
  return Number.isFinite(x) ? x : null;
};

/* ------------------------------------------------------------ the counter */

export type PunchState = ClockResult | null;

/**
 * Clocking in or out at the shared device.
 *
 * Nobody is signed in: the tablet is. So this builds a scope from the person
 * whose PIN was entered, and that scope can do exactly one thing, which is
 * punch their own clock. The person must belong to the office the device was
 * enrolled against, so a PIN that happens to match somebody at another branch
 * is refused rather than quietly clocking them in somewhere they are not.
 */
export async function kioskPunch(_prev: PunchState, formData: FormData): Promise<PunchState> {
  const device = await currentDevice();
  if (!device) {
    return { ok: false, within: false, distance: -1, message: "This device is not set up. Ask your manager." };
  }

  const userId = clean(formData.get("user_id"));
  const pin = clean(formData.get("pin"));

  // Per device and per person, so one wrong PIN cannot lock out the desk and
  // guessing somebody's four digits is not worth trying.
  const limited = await guard("login", `kiosk:${device.id}:${userId}`);
  if (!limited.ok) return { ok: false, within: false, distance: -1, message: limited.message };

  const person = one<{ id: string; full_name: string; pin_hash: string | null; role: string }>(
    `SELECT id, full_name, pin_hash, role FROM users
      WHERE id = ? AND tenant_id = ? AND branch_id = ? AND active = 1
        AND role IN ('counsellor','tenant_admin')`,
    userId, device.tenantId, device.branchId,
  );
  if (!person) {
    return { ok: false, within: false, distance: -1, message: "Not somebody who clocks in at this desk." };
  }
  if (!person.pin_hash) {
    return { ok: false, within: false, distance: -1, message: `${person.full_name.split(" ")[0]} has not set a PIN yet. Set one in your profile.` };
  }
  if (!verifyPassword(pin, person.pin_hash)) {
    return { ok: false, within: false, distance: -1, message: "That PIN is not right." };
  }

  const scope = {
    tenantId: device.tenantId,
    userId: person.id,
    role: person.role as "counsellor" | "tenant_admin",
    branchId: device.branchId,
    // A kiosk never looks across offices. It is a clock, not a console.
    allBranches: false,
  };

  const h = await headers();
  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  const input = {
    fix: lat !== null && lng !== null ? { lat, lng, accuracy: num(formData.get("accuracy")) } : null,
    reason: clean(formData.get("reason")) || null,
    note: clean(formData.get("note")) || null,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent"),
  };

  const result = openShift(scope) ? clockOut(scope, input) : clockIn(scope, input);
  revalidatePath("/kiosk");
  return result;
}

/* ------------------------------------------------- setting the thing up */

export type DeviceState = { ok: boolean; message?: string };

/** An admin, standing at the tablet, binds it to one office. */
export async function setUpDevice(_prev: DeviceState, formData: FormData): Promise<DeviceState> {
  const user = await requireRole("super_admin", "tenant_admin");
  const branchId = clean(formData.get("branch_id"));
  const label = clean(formData.get("label"));

  if (!one("SELECT 1 FROM branches WHERE id = ? AND tenant_id = ? AND active = 1", branchId, user.tenantId)) {
    return { ok: false, message: "Choose one of your own offices." };
  }

  await enrolDevice({ tenantId: user.tenantId, branchId, label, createdBy: user.id });
  revalidatePath("/app/kiosk");
  return { ok: true, message: "This device is now the clock for that office. Open /kiosk on it." };
}

/** Taking a device out of service, from the console. */
export async function retire(formData: FormData) {
  const user = await requireRole("super_admin", "tenant_admin");
  retireDevice(user.tenantId, clean(formData.get("id")));
  revalidatePath("/app/kiosk");
}

/** Taking this device out of service, standing at it. */
export async function signOutDevice() {
  await requireRole("super_admin", "tenant_admin");
  await forgetDevice();
  revalidatePath("/app/kiosk");
}

/* ------------------------------------------------------------- the PIN */

export type PinState = { ok: boolean; message?: string };

/**
 * Setting your own clock-in PIN.
 *
 * Four to six digits, hashed exactly like a password. It is not a second
 * password: it can only work the clock, and only at a device an admin has
 * already enrolled in this office.
 */
export async function setPin(_prev: PinState, formData: FormData): Promise<PinState> {
  const user = await requireUser();
  const pin = clean(formData.get("pin"));

  if (!/^\d{4,6}$/.test(pin)) return { ok: false, message: "Use four to six digits." };
  if (/^(\d)\1+$/.test(pin)) return { ok: false, message: "Not all the same digit. Anyone watching would guess it." };
  if (["1234", "12345", "123456", "4321"].includes(pin)) return { ok: false, message: "That one is too easy to guess. Pick another." };

  run("UPDATE users SET pin_hash = ? WHERE id = ?", hashPassword(pin), user.id);
  revalidatePath("/app/profile");
  return { ok: true, message: "PIN set. Use it on the clock at the front desk." };
}

export async function clearPin() {
  const user = await requireUser();
  run("UPDATE users SET pin_hash = NULL WHERE id = ?", user.id);
  revalidatePath("/app/profile");
}

/** Only used to show whether a person has one, never the PIN itself. */
export async function hasPin(): Promise<boolean> {
  const user = await requireUser();
  return Boolean(one<{ pin_hash: string | null }>("SELECT pin_hash FROM users WHERE id = ?", user.id)?.pin_hash);
}
