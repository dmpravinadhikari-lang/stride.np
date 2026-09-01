import { all, now, one, run, uid } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";

// Static reference data lives in exams.ts so client components can import it
// without dragging the database into the browser bundle.
export * from "@/modules/booking/exams";

// ------------------------------------------------------------------ requests
export type Booking = {
  id: string; tenant_id: string; student_id: string; exam: string; city: string;
  preferred_from: string | null; preferred_to: string | null; note: string | null;
  status: string; booked_on: string | null; centre: string | null; reference: string | null;
  staff_note: string | null; created_at: string; updated_at: string;
};

export function createBooking(scope: Scope, b: {
  studentId: string; exam: string; city: string;
  from: string | null; to: string | null; note: string | null;
}): string {
  const id = uid();
  run(
    `INSERT INTO test_bookings (id, tenant_id, student_id, exam, city, preferred_from, preferred_to,
                                note, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?, 'requested', ?,?)`,
    id, scope.tenantId, b.studentId, b.exam, b.city, b.from, b.to, b.note, now(), now(),
  );
  return id;
}

export const bookingsForStudent = (scope: Scope, studentId: string) =>
  all<Booking>(
    "SELECT * FROM test_bookings WHERE student_id = ? AND tenant_id = ? ORDER BY created_at DESC",
    studentId, scope.tenantId,
  );

export const bookingsForTenant = (scope: Scope) =>
  all<Booking & { full_name: string; email: string }>(
    `SELECT b.*, u.full_name, u.email FROM test_bookings b JOIN users u ON u.id = b.student_id
      WHERE b.tenant_id = ?
      ORDER BY CASE b.status WHEN 'requested' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END, b.created_at DESC`,
    scope.tenantId,
  );

export const getBooking = (scope: Scope, id: string) =>
  one<Booking>("SELECT * FROM test_bookings WHERE id = ? AND tenant_id = ?", id, scope.tenantId);

export function confirmBooking(scope: Scope, id: string, d: {
  bookedOn: string | null; centre: string | null; reference: string | null;
  staffNote: string | null; handledBy: string; status: string;
}) {
  run(
    `UPDATE test_bookings SET status = ?, booked_on = ?, centre = ?, reference = ?,
            staff_note = ?, handled_by = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ?`,
    d.status, d.bookedOn, d.centre, d.reference, d.staffNote, d.handledBy, now(), id, scope.tenantId,
  );
}

export const openRequestCount = (tenantId: string) =>
  all<{ n: number }>("SELECT COUNT(*) n FROM test_bookings WHERE tenant_id = ? AND status = 'requested'", tenantId)[0]?.n ?? 0;
