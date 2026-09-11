import { all } from "@/lib/db";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { Button, Card, Chip, inputClass } from "@/components/ui";
import { DEFAULT_RADIUS_M } from "@/modules/attendance/geofence";
import { saveBranch } from "@/modules/attendance/branch-actions";

export const metadata = { title: "Branches, STRIDE" };

type Row = {
  id: string; name: string; code: string | null; city: string | null;
  address: string | null; phone: string | null; email: string | null;
  lat: number | null; lng: number | null; radius_m: number | null;
  day_starts: string | null; day_ends: string | null;
  is_head_office: number; staff: number; students: number;
};

/**
 * Branch settings, for a consultancy admin.
 *
 * The part that matters is the location. Until a branch has coordinates its
 * clock cannot judge anybody, and the page says so on the row rather than
 * leaving it to be discovered when somebody tries to clock in.
 */
export default async function BranchesPage() {
  const user = await requireRole("super_admin", "tenant_admin");
  const scope = scopeOf(user);

  const branches = all<Row>(
    `SELECT b.*,
            (SELECT COUNT(*) FROM users u
              WHERE u.branch_id = b.id AND u.role <> 'student' AND u.active = 1) AS staff,
            (SELECT COUNT(*) FROM users u
              WHERE u.branch_id = b.id AND u.role = 'student' AND u.active = 1) AS students
       FROM branches b
      WHERE b.tenant_id = ? AND b.active = 1
      ORDER BY b.is_head_office DESC, b.name`,
    scope.tenantId,
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Branches</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Each office keeps its own staff, students and register. Set where an office is and the
          clock can tell whether somebody is at it.
        </p>
      </header>

      {branches.map((b) => (
        <Card key={b.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="h-tight text-[17px]">{b.name}</h2>
                {b.is_head_office === 1 && <Chip tone="brand">Head office</Chip>}
                {b.lat == null && <Chip tone="gold">No location set</Chip>}
              </div>
              <div className="mt-1 text-[12.5px] text-muted">
                {b.staff} staff · {b.students} students
                {b.lat != null ? ` · clock radius ${b.radius_m ?? DEFAULT_RADIUS_M} m` : ""}
              </div>
            </div>
          </div>

          <form action={saveBranch} className="mt-4 grid gap-2 sm:grid-cols-3">
            <input type="hidden" name="id" value={b.id} />
            <input name="name" defaultValue={b.name} className={inputClass} placeholder="Branch name" />
            <input name="code" defaultValue={b.code ?? ""} className={inputClass} placeholder="Code, e.g. PKR" />
            <input name="city" defaultValue={b.city ?? ""} className={inputClass} placeholder="City" />
            <input name="address" defaultValue={b.address ?? ""} className={`${inputClass} sm:col-span-3`} placeholder="Street address" />
            <input name="phone" defaultValue={b.phone ?? ""} className={inputClass} placeholder="Phone" />
            <input name="email" defaultValue={b.email ?? ""} className={inputClass} placeholder="Email" />
            <input name="radius_m" defaultValue={b.radius_m ?? DEFAULT_RADIUS_M} className={inputClass} placeholder={`Clock radius in metres`} />
            <input name="lat" defaultValue={b.lat ?? ""} className={inputClass} placeholder="Latitude, e.g. 27.6885" />
            <input name="lng" defaultValue={b.lng ?? ""} className={inputClass} placeholder="Longitude, e.g. 85.3355" />
            <div className="grid grid-cols-2 gap-2">
              <input name="day_starts" defaultValue={b.day_starts ?? ""} className={inputClass} placeholder="Opens 10:00" />
              <input name="day_ends" defaultValue={b.day_ends ?? ""} className={inputClass} placeholder="Closes 18:00" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" variant="secondary">Save {b.name}</Button>
            </div>
          </form>

          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            To find the coordinates: open the office in Google Maps, right click the exact spot and
            the first item on the menu is the latitude and longitude. Paste them in that order. A
            radius of {DEFAULT_RADIUS_M} m is a sensible start; a dense chowk with a shared building
            wants more, not less, because a phone indoors can sit tens of metres off.
          </p>
        </Card>
      ))}

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Add a branch</h2>
        <form action={saveBranch} className="mt-4 grid gap-2 sm:grid-cols-3">
          <input name="name" required className={inputClass} placeholder="Branch name" />
          <input name="code" className={inputClass} placeholder="Code" />
          <input name="city" className={inputClass} placeholder="City" />
          <input name="lat" className={inputClass} placeholder="Latitude" />
          <input name="lng" className={inputClass} placeholder="Longitude" />
          <input name="radius_m" className={inputClass} placeholder={`Radius, default ${DEFAULT_RADIUS_M} m`} />
          <div className="sm:col-span-3"><Button type="submit">Add branch</Button></div>
        </form>
      </Card>
    </div>
  );
}
