import type { ModuleDef } from "@/lib/modules/types";

export const pipeline: ModuleDef = {
  id: "pipeline",
  name: "Student Pipeline",
  summary: "Enquiry to departure, with every student's stage, counsellor and scores on one board.",
  icon: "📊",
  route: "/app/pipeline",
  plans: ["starter", "growth", "pro"],
  // Deliberately staff-only. A student must never see the pipeline.
  roles: ["counsellor", "tenant_admin", "super_admin"],
  credits: {},
  status: "live",
  phase: 4,
  group: "Manage",
  access: "staff",
};
