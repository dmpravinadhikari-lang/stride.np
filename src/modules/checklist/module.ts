import type { ModuleDef } from "@/lib/modules/types";

export const checklist: ModuleDef = {
  id: "checklist",
  name: "Application Checklist",
  summary: "Every step for your country and intake, dated backwards from the day your course starts.",
  icon: "✅",
  route: "/app/checklist",
  plans: ["starter", "growth", "pro", "student_free", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  // Dates and arithmetic. Free on every plan.
  credits: {},
  status: "live",
  phase: 4,
  group: "Apply",
  access: "member",
  perStudent: true,
};
