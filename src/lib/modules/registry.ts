import type { ModuleDef } from "@/lib/modules/types";
import type { PlanId } from "@/lib/plans";
import type { Role } from "@/lib/auth/roles";
import { sopStudio } from "@/modules/sop-studio/module";
import { aiInterview } from "@/modules/ai-interview/module";
import { mockTests } from "@/modules/mock-tests/module";
import { pipeline } from "@/modules/pipeline/module";
import { documents } from "@/modules/documents/module";
import { costCalculator } from "@/modules/cost/module";
import { universityFinder, scholarshipFinder } from "@/modules/finder/module";
import { parentPortal } from "@/modules/parents/module";
import { checklist } from "@/modules/checklist/module";
import { reports } from "@/modules/reports/module";
import { testBooking } from "@/modules/booking/module";

/** Everything the platform can do. Add a module by adding a line here. */
export const MODULES: ModuleDef[] = [
  sopStudio,
  aiInterview,
  mockTests,
  pipeline,
  documents,
  costCalculator,
  universityFinder,
  scholarshipFinder,
  parentPortal,
  checklist,
  reports,
  testBooking,

  // Built next. Listed now so students and consultancies can see what is
  // coming, and so the plan gating is already written when they arrive.
  // Zero-cost tools. Also served publicly at /tools with no account at all.
  {
    id: "eligibility", name: "Eligibility Check",
    summary: "Whether you qualify to get in and to get the visa, answered honestly.",
    icon: "✅", route: "/tools/eligibility",
    plans: ["starter", "growth", "pro", "student_free", "student_premium"],
    roles: ["student", "counsellor", "tenant_admin", "super_admin"],
    credits: {}, status: "live", phase: 4, group: "Decide",
    access: "public",
  },
  {
    id: "loan-calculator", name: "Education Loan EMI",
    summary: "What a Nepali education loan really costs, including interest during the course.",
    icon: "🏦", route: "/tools/loan",
    plans: ["starter", "growth", "pro", "student_free", "student_premium"],
    roles: ["student", "counsellor", "tenant_admin", "super_admin"],
    credits: {}, status: "live", phase: 4, group: "Decide",
    access: "public",
  },
  {
    id: "cv-maker", name: "CV Maker",
    summary: "A CV laid out the way admissions offices abroad expect to read it.",
    icon: "📄", route: "/tools/cv-maker",
    plans: ["starter", "growth", "pro", "student_free", "student_premium"],
    roles: ["student", "counsellor", "tenant_admin", "super_admin"],
    credits: { complete: 1, read_document: 3 }, status: "live", phase: 4, group: "Apply",
    access: "public",
  },
  {
    id: "destination-compare", name: "Compare Destinations",
    summary: "Two countries side by side on cost, visa, work rights and funds required.",
    icon: "⚖️", route: "/tools/compare",
    plans: ["starter", "growth", "pro", "student_free", "student_premium"],
    roles: ["student", "counsellor", "tenant_admin", "super_admin"],
    credits: {}, status: "live", phase: 4, group: "Decide",
    access: "public",
  },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);

export type Viewer = { role: Role; plan: PlanId | string; enabledIds?: Set<string> };

/** Can this person open this module right now? */
export function access(mod: ModuleDef, viewer: Viewer): "open" | "locked" | "soon" | "hidden" {
  if (!mod.roles.includes(viewer.role)) return "hidden";
  if (viewer.role === "super_admin") return mod.status === "live" ? "open" : "soon";
  if (viewer.enabledIds && !viewer.enabledIds.has(mod.id)) return "hidden";
  if (!mod.plans.includes(viewer.plan as PlanId)) return "locked";
  return mod.status === "live" ? "open" : "soon";
}

/** Visible states only, "hidden" never reaches the sidebar. */
export type NavState = Exclude<ReturnType<typeof access>, "hidden">;

/** The sidebar, grouped, for whoever is signed in. */
export function navFor(viewer: Viewer) {
  const groups: Record<string, Array<{ mod: ModuleDef; state: NavState }>> = {};
  for (const mod of MODULES) {
    const state = access(mod, viewer);
    if (state === "hidden") continue;
    (groups[mod.group] ??= []).push({ mod, state });
  }
  const order = ["Prepare", "Apply", "Decide", "Manage"];
  return order.filter((g) => groups[g]?.length).map((g) => ({ group: g, items: groups[g] }));
}

export const creditsFor = (moduleId: string, action: string) =>
  moduleById(moduleId)?.credits[action] ?? 1;
