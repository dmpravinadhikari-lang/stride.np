import type { ModuleDef } from "@/lib/modules/types";

export const parentPortal: ModuleDef = {
  id: "parent-portal",
  name: "Parent View",
  summary: "A read-only progress page for the people paying the fees — a link, not an account.",
  icon: "👪",
  route: "/app/parents",
  plans: ["growth", "pro", "student_premium"],
  // Students manage their own; staff manage their students'.
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  credits: {},
  status: "live",
  phase: 4,
  group: "Manage",
  access: "member",
  perStudent: true,
};
