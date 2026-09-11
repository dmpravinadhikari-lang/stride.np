"use server";

import { revalidatePath } from "next/cache";
import { now, run, uid } from "@/lib/db";
import { requireScope } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const num = (v: FormDataEntryValue | null): number | null => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
};

/**
 * Branch settings, including where the office is.
 *
 * Only a consultancy admin may set this. A counsellor who could move the
 * office could move it to their own house, which would make the register
 * decorative.
 */
export async function saveBranch(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "branch:settings")) return;

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (name.length < 2) return;

  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  // A coordinate outside Nepal is almost always a typo or a swapped pair, and
  // silently accepting it would make every clock-in fail for reasons nobody
  // could work out.
  const plausible =
    lat === null || lng === null ||
    (lat > 26 && lat < 31 && lng > 80 && lng < 89);

  const fields = {
    name,
    code: clean(formData.get("code")) || null,
    city: clean(formData.get("city")) || null,
    address: clean(formData.get("address")) || null,
    phone: clean(formData.get("phone")) || null,
    email: clean(formData.get("email")) || null,
    lat: plausible ? lat : null,
    lng: plausible ? lng : null,
    radius_m: num(formData.get("radius_m")),
    day_starts: clean(formData.get("day_starts")) || null,
    day_ends: clean(formData.get("day_ends")) || null,
  };

  if (id) {
    run(
      `UPDATE branches SET name=?, code=?, city=?, address=?, phone=?, email=?,
              lat=?, lng=?, radius_m=?, day_starts=?, day_ends=?
        WHERE id=? AND tenant_id=?`,
      fields.name, fields.code, fields.city, fields.address, fields.phone, fields.email,
      fields.lat, fields.lng, fields.radius_m, fields.day_starts, fields.day_ends,
      id, scope.tenantId,
    );
  } else {
    run(
      `INSERT INTO branches
         (id, tenant_id, name, code, city, address, phone, email, lat, lng,
          radius_m, day_starts, day_ends, is_head_office, active, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,1,?)`,
      uid(), scope.tenantId, fields.name, fields.code, fields.city, fields.address,
      fields.phone, fields.email, fields.lat, fields.lng, fields.radius_m,
      fields.day_starts, fields.day_ends, now(),
    );
  }
  revalidatePath("/app/branches");
}
