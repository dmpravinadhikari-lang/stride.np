import { all } from "@/lib/db";
import { requirePermission, scopeOf } from "@/lib/auth/current";
import { Card, Chip, PageHeader } from "@/components/ui";
import { DEFAULT_RADIUS_M } from "@/modules/attendance/geofence";
import { BranchForm } from "./branch-form";

export const metadata = { title: "Offices, OfficeYak" };

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
  const user = await requirePermission("branch:settings");
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
      <PageHeader
        title="Offices"
        sub="Each one has its own staff, students and attendance."
      />

      {/*
        One row per office, opening to its own settings.
        
        Every office used to print its whole form at once: five offices meant
        five screens of identical fields to scroll past before reaching the
        one being looked for. An office that still has no location opens by
        itself, because that is the one a person came here to fix.
      */}
      {branches.map((b) => (
        <Card key={b.id} className="overflow-hidden">
          <details open={b.lat == null} className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-5 py-4">
              <h2 className="h-tight text-[17px]">{b.name}</h2>
              {b.is_head_office === 1 && <Chip tone="brand">Head office</Chip>}
              {b.lat == null
                ? <Chip tone="gold">Location not set</Chip>
                : <Chip tone="teal">Clock-in ready</Chip>}
              <span className="text-[13px] text-muted">
                {b.staff} {b.staff === 1 ? "person" : "people"} · {b.students} {b.students === 1 ? "student" : "students"}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600">
                <span className="group-open:hidden">Open</span>
                <span className="hidden group-open:inline">Close</span>
              </span>
            </summary>
            <div className="border-t border-line px-5 py-5">
              <BranchForm b={b} defaultRadius={DEFAULT_RADIUS_M} />
            </div>
          </details>
        </Card>
      ))}

      <Card className="p-5">
        <h2 className="h-tight mb-4 text-[18px]">Add another office</h2>
        <BranchForm b={{}} defaultRadius={DEFAULT_RADIUS_M} />
      </Card>
    </div>
  );
}
