import type { ModuleDef } from "@/lib/modules/types";

export const aiInterview: ModuleDef = {
  id: "ai-interview",
  name: "AI Mock Interview",
  summary: "A visa or admission interview that has read your file and follows up when you are vague.",
  icon: "🎙️",
  route: "/app/interview",
  plans: ["starter", "growth", "pro", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  credits: { question: 1, evaluate: 1, report: 2 },
  status: "live",
  phase: 1,
  group: "Prepare",
  access: "member",
  perStudent: true,
};
