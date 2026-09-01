import type { ModuleDef } from "@/lib/modules/types";

export const testBooking: ModuleDef = {
  id: "test-booking",
  name: "Book IELTS / PTE",
  summary: "Real fees, real centres, and a request your consultancy books for you.",
  icon: "🎫",
  route: "/app/book-test",
  plans: ["starter", "growth", "pro", "student_free", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  credits: {},
  status: "live",
  phase: 5,
  group: "Prepare",
  access: "member",
  perStudent: true,
};
