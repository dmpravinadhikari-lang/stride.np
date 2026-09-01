import type { ModuleDef } from "@/lib/modules/types";

export const sopStudio: ModuleDef = {
  id: "sop-studio",
  name: "SOP Studio",
  summary: "Draft and score your statement of purpose, tuned to the country you are applying to.",
  icon: "✍️",
  route: "/app/sop",
  plans: ["starter", "growth", "pro", "student_free", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  credits: { draft: 3, review: 2, revise: 2 },
  status: "live",
  phase: 1,
  group: "Apply",
  access: "member",
  perStudent: true,
};
