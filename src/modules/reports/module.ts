import type { ModuleDef } from "@/lib/modules/types";

export const reports: ModuleDef = {
  id: "reports",
  name: "Reports",
  summary: "Where students are stalling, who is carrying what, and what needs chasing this morning.",
  icon: "📈",
  route: "/app/reports",
  plans: ["starter", "growth", "pro"],
  roles: ["counsellor", "tenant_admin", "super_admin"],
  credits: {},
  status: "live",
  phase: 4,
  group: "Manage",
  access: "staff",
};
