import type { ModuleDef } from "@/lib/modules/types";

export const documents: ModuleDef = {
  id: "documents",
  name: "Document Vault",
  summary: "Upload once, reuse everywhere, and have the missing pieces flagged before a deadline finds them.",
  icon: "🗂️",
  route: "/app/documents",
  plans: ["starter", "growth", "pro", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  credits: { completeness_check: 2 },
  status: "live",
  phase: 4,
  group: "Apply",
  access: "member",
  perStudent: true,
};
