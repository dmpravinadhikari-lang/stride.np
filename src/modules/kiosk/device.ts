import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { all, now, one, run, uid } from "@/lib/db";

/**
 * The shared device at the counter.
 *
 * Enrolled once by an admin, against one office. After that the tablet holds
 * a long-lived token in a cookie and anybody standing at it can clock in with
 * a PIN.
 *
 * What the token can do is deliberately tiny: name the staff of one office
 * and clock them in or out. It cannot read a student, a document, a salary or
 * another office, and nothing in this file goes looking for a session. If the
 * tablet is stolen, what the thief gets is the ability to clock somebody in.
 */

const COOKIE = "stride_kiosk";
const YEAR = 365 * 864e5;

/** Stored hashed, so the row is not itself a working device. */
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export type Device = { id: string; tenantId: string; branchId: string; branchName: string; label: string; tenantName: string };

/** Enrols the device this request came from. Admin only, checked by caller. */
export async function enrolDevice(input: {
  tenantId: string; branchId: string; label: string; createdBy: string;
}): Promise<void> {
  const token = randomBytes(32).toString("hex");
  run(
    `INSERT INTO kiosk_devices (id, tenant_id, branch_id, label, token_hash, created_by, created_at, active)
     VALUES (?,?,?,?,?,?,?,1)`,
    uid(), input.tenantId, input.branchId, input.label.trim() || "Front desk",
    hash(token), input.createdBy, now(),
  );

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + YEAR),
  });
}

/** The device this request is coming from, or nothing. */
export async function currentDevice(): Promise<Device | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const row = one<{
    id: string; tenant_id: string; branch_id: string; label: string;
    branch_name: string; tenant_name: string;
  }>(
    `SELECT d.id, d.tenant_id, d.branch_id, d.label, b.name AS branch_name, t.name AS tenant_name
       FROM kiosk_devices d
       JOIN branches b ON b.id = d.branch_id
       JOIN tenants t ON t.id = d.tenant_id
      WHERE d.token_hash = ? AND d.active = 1 AND b.active = 1 AND t.active = 1`,
    hash(token),
  );
  if (!row) return null;

  run("UPDATE kiosk_devices SET last_seen_at = ? WHERE id = ?", now(), row.id);
  return {
    id: row.id, tenantId: row.tenant_id, branchId: row.branch_id,
    branchName: row.branch_name, label: row.label, tenantName: row.tenant_name,
  };
}

export async function forgetDevice(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run("UPDATE kiosk_devices SET active = 0 WHERE token_hash = ?", hash(token));
  jar.delete(COOKIE);
}

/** Who can clock in at this device: the staff of its office, and nobody else. */
export const staffAtDevice = (device: Device) =>
  all<{ id: string; full_name: string; has_pin: number; open_shift: number }>(
    `SELECT u.id, u.full_name,
            CASE WHEN u.pin_hash IS NULL THEN 0 ELSE 1 END AS has_pin,
            (SELECT COUNT(*) FROM shifts s
              WHERE s.user_id = u.id AND s.ended_at IS NULL) AS open_shift
       FROM users u
      WHERE u.tenant_id = ? AND u.branch_id = ? AND u.active = 1
        AND u.role IN ('counsellor','tenant_admin')
      ORDER BY u.full_name`,
    device.tenantId, device.branchId,
  );

/** Devices an admin has enrolled, for the screen that manages them. */
export const devicesFor = (tenantId: string) =>
  all<{ id: string; label: string; branch_name: string; created_at: string; last_seen_at: string | null }>(
    `SELECT d.id, d.label, b.name AS branch_name, d.created_at, d.last_seen_at
       FROM kiosk_devices d JOIN branches b ON b.id = d.branch_id
      WHERE d.tenant_id = ? AND d.active = 1
      ORDER BY d.created_at DESC`,
    tenantId,
  );

export const retireDevice = (tenantId: string, id: string) =>
  run("UPDATE kiosk_devices SET active = 0 WHERE id = ? AND tenant_id = ?", id, tenantId);
