"use server";

import { revalidatePath } from "next/cache";
import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { one } from "@/lib/db";
import { guard } from "@/lib/security/rate-limit";
import { confirmBooking, createBooking, examById, getBooking } from "@/modules/booking/data";

export type BookingState = { ok: boolean; message?: string };
const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const refresh = () => revalidatePath("/app/book-test");

export async function requestBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const { scope } = await requireScope();
  const paced = await guard("upload", scope.userId);   // same modest per-hour ceiling
  if (!paced.ok) return { ok: false, message: paced.message };

  const exam = clean(formData.get("exam"));
  const city = clean(formData.get("city"));
  if (!examById(exam)) return { ok: false, message: "Choose which test you want to sit." };
  if (!city) return { ok: false, message: "Choose a city." };

  createBooking(scope, {
    studentId: scope.userId,
    exam, city,
    from: clean(formData.get("preferred_from")) || null,
    to: clean(formData.get("preferred_to")) || null,
    note: clean(formData.get("note")) || null,
  });
  refresh();
  return {
    ok: true,
    message: "Request sent. Your consultancy will book the slot and confirm the date here. Nothing has been paid or reserved yet.",
  };
}

export async function updateBooking(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!isStaff(user.role)) return;
  const id = clean(formData.get("id"));
  const booking = getBooking(scope, id);
  if (!booking) return;
  if (!one("SELECT 1 FROM users WHERE id = ? AND tenant_id = ?", booking.student_id, scope.tenantId)) return;

  confirmBooking(scope, id, {
    status: clean(formData.get("status")) || "confirmed",
    bookedOn: clean(formData.get("booked_on")) || null,
    centre: clean(formData.get("centre")) || null,
    reference: clean(formData.get("reference")) || null,
    staffNote: clean(formData.get("staff_note")) || null,
    handledBy: user.id,
  });
  refresh();
}
