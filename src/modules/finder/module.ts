import type { ModuleDef } from "@/lib/modules/types";

export const universityFinder: ModuleDef = {
  id: "university-finder",
  name: "University Finder",
  summary: "Courses that match your grades, budget and English score — with the ones that don't, and why.",
  icon: "🎓",
  route: "/app/universities",
  plans: ["starter", "growth", "pro", "student_free", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  credits: {},
  status: "live",
  phase: 4,
  group: "Decide",
  access: "public",
};

export const scholarshipFinder: ModuleDef = {
  id: "scholarship-finder",
  name: "Scholarship Finder",
  summary: "Funding you are actually eligible for, with what each one really asks of you.",
  icon: "💰",
  route: "/app/scholarships",
  // Free on every plan: it is a lookup, not an AI call, so it costs nothing to
  // serve and it is one of the main reasons students find STRIDE at all.
  plans: ["starter", "growth", "pro", "student_free", "student_premium"],
  roles: ["student", "counsellor", "tenant_admin", "super_admin"],
  credits: {},
  status: "live",
  phase: 4,
  group: "Decide",
  access: "public",
};
