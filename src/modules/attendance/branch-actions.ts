"use server";

import { revalidatePath } from "next/cache";
import { now, one, run, scalar, uid } from "@/lib/db";
import { planOf } from "@/lib/plans";
import { requireScope } from "@/lib/auth/current";
import { can } from "@/lib/auth/access";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
// An empty box is "not set", not zero. Number("") is 0, which as a radius
// would refuse every clock-in and as a coordinate points into the ocean.
const num = (v: FormDataEntryValue | null): number | null => {
  const raw = String(v ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export type BranchState = { ok: boolean; message?: string };

/**
 * Branch settings, including where the office is.
 *
 * Only a consultancy admin may set this. A counsellor who could move the
 * office could move it to their own house, which would make the register
 * decorative.
 */
export async function saveBranch(_prev: BranchState | null, formData: FormData): Promise<BranchState> {
  const { user, scope } = await requireScope();
  if (!can(user, "branch:settings")) return { ok: false, message: "Only an admin can change office settings." };

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (name.length < 2) return { ok: false, message: "Give the office a name." };

  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  // A coordinate outside Nepal is almost always a typo or a swapped pair, and
  // silently accepting it would make every clock-in fail for reasons nobody
  // could work out.
  const plausible =
    lat === null || lng === null ||
    (lat > 26 && lat < 31 && lng > 80 && lng < 89);
  if (!plausible) {
    return { ok: false, message: "That location is not in Nepal. Check the numbers are latitude first, then longitude." };
  }
  if ((lat === null) !== (lng === null)) {
    return { ok: false, message: "Fill in both latitude and longitude, or leave both empty." };
  }
  const radius = num(formData.get("radius_m"));
  if (radius !== null && (radius < 30 || radius > 2000)) {
    return { ok: false, message: "Choose a distance between 30 m and 2 km." };
  }

  const fields = {
    name,
    code: clean(formData.get("code")) || null,
    city: clean(formData.get("city")) || null,
    address: clean(formData.get("address")) || null,
    phone: clean(formData.get("phone")) || null,
    email: clean(formData.get("email")) || null,
    lat,
    lng,
    radius_m: radius,
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
    // The plan's office limit is a real limit, the same way the student limit
    // is. Checked on the way in rather than shown as a greyed out button,
    // because a form that arrives by POST has no button.
    const tenant = one<{ plan: string }>("SELECT plan FROM tenants WHERE id = ?", scope.tenantId);
    const plan = planOf(tenant?.plan ?? "starter");
    const offices = scalar(
      "SELECT COUNT(*) FROM branches WHERE tenant_id = ? AND active = 1", scope.tenantId,
    );
    if (offices >= plan.maxBranches) {
      return {
        ok: false,
        message: plan.maxBranches === 1
          ? `The ${plan.label} plan covers one office. Move up a plan to open a second.`
          : `The ${plan.label} plan covers ${plan.maxBranches} offices and you have ${offices}. Move up a plan to add another.`,
      };
    }
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
  return {
    ok: true,
    message: lat === null ? `${name} saved. Add its location so staff can clock in.` : `${name} saved.`,
  };
}
