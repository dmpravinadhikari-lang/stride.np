import type { ModuleDef } from "@/lib/modules/types";

export const mockTests: ModuleDef = {
  id: "mock-tests",
  name: "IELTS & PTE Mocks",
  summary: "Full timed mock tests with AI band scoring on writing and speaking.",
  icon: "📝",
  route: "/app/mock-tests",
  plans: ["starter", "growth", "pro", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  // Listening and reading are auto-marked and cost nothing. A full mock is
  // therefore 3 + 3 + 4 = 10 credits, matching the pricing table.
  credits: { writing_task: 3, speaking: 4 },
  status: "live",
  phase: 2,
  group: "Prepare",
  access: "member",
  perStudent: true,
};
