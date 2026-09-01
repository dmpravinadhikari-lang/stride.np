import type { ModuleDef } from "@/lib/modules/types";

export const costCalculator: ModuleDef = {
  id: "cost-calculator",
  name: "True Cost Calculator",
  summary: "Tuition, living, visa, flights and the bank balance you must show — all in NPR.",
  icon: "🧮",
  route: "/app/cost",
  plans: ["starter", "growth", "pro", "student_free", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  // Arithmetic, not AI. Free to run, which is what makes it a lead magnet.
  credits: {},
  status: "live",
  phase: 4,
  group: "Decide",
  access: "public",
};
