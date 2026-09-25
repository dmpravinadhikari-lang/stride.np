import { all } from "@/lib/db";
import { requirePermission, scopeOf } from "@/lib/auth/current";
import { Card, Chip, PageHeader } from "@/components/ui";
import { DEFAULT_RADIUS_M } from "@/modules/attendance/geofence";
import { BranchForm } from "./branch-form";

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
        title="Branches"
        sub="Your offices. Each one has its own staff, students and attendance."
      />

      {branches.map((b) => (
        <Card key={b.id} className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="h-tight text-[18px]">{b.name}</h2>
            {b.is_head_office === 1 && <Chip tone="brand">Head office</Chip>}
            {b.lat == null
              ? <Chip tone="gold">Location not set</Chip>
              : <Chip tone="teal">Clock-in ready</Chip>}
            <span className="text-[13px] text-muted">
              {b.staff} {b.staff === 1 ? "person" : "people"} · {b.students} {b.students === 1 ? "student" : "students"}
            </span>
          </div>
          <BranchForm b={b} defaultRadius={DEFAULT_RADIUS_M} />
        </Card>
      ))}

      <Card className="p-5">
        <h2 className="h-tight mb-4 text-[18px]">Add another office</h2>
        <BranchForm b={{}} defaultRadius={DEFAULT_RADIUS_M} />
      </Card>
    </div>
  );
}
