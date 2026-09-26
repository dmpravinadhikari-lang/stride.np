/**
 * Plans decide two things: which modules are unlocked, and how much AI use is
 * included. Prices are set here and nowhere else, so changing them after a
 * conversation with a consultancy owner is a one-line edit.
 *
 * No payment gateway yet, you set a consultancy's plan in the admin panel and
 * invoice them by hand. The limits below are enforced regardless.
 */
export const PLANS = {
  starter: {
    label: "Starter",
    audience: "consultancy",
    priceNpr: 4999,
    maxStudents: 25,
    maxBranches: 1,
    monthlyCredits: 300,
    blurb: "Single branch getting started",
  },
  growth: {
    label: "Growth",
    audience: "consultancy",
    priceNpr: 12999,
    maxStudents: 100,
    maxBranches: 3,
    monthlyCredits: 1500,
    blurb: "Established consultancy",
  },
  pro: {
    label: "Pro",
    audience: "consultancy",
    priceNpr: 29999,
    maxStudents: Number.POSITIVE_INFINITY,
    maxBranches: Number.POSITIVE_INFINITY,
    monthlyCredits: 5000,
    blurb: "Multi-branch or franchise",
  },
  student_free: {
    label: "Student Free",
    audience: "student",
    priceNpr: 0,
    maxStudents: 1,
    maxBranches: 1,
    monthlyCredits: 15,
    blurb: "Direct student, free tier",
  },
  student_premium: {
    label: "Student Premium",
    audience: "student",
    priceNpr: 999,
    maxStudents: 1,
    maxBranches: 1,
    monthlyCredits: 120,
    blurb: "Direct student, full access",
  },
} as const;

/**
 * What each plan unlocks beyond its limits.
 *
 * Kept here beside the prices so the pricing page and the guard read the same
 * list. A feature named on the website and not in this map is a promise the
 * software does not keep.
 */
export const PLAN_FEATURES = {
  starter: ["pipeline", "tasks", "attendance", "documents"],
  growth: ["pipeline", "tasks", "attendance", "documents", "payroll", "market", "partners"],
  pro: ["pipeline", "tasks", "attendance", "documents", "payroll", "market", "partners"],
  student_free: [],
  student_premium: [],
} as const;

export type PlanFeature = "pipeline" | "tasks" | "attendance" | "documents" | "payroll" | "market" | "partners";

export const planAllows = (planId: string, feature: PlanFeature): boolean =>
  ((PLAN_FEATURES as Record<string, readonly string[]>)[planId] ?? PLAN_FEATURES.starter).includes(feature);

/** The cheapest plan that includes something, for the upsell message. */
export const cheapestWith = (feature: PlanFeature) =>
  (["starter", "growth", "pro"] as const).find((id) => planAllows(id, feature)) ?? "pro";

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const planOf = (id: string) => PLANS[(id as PlanId)] ?? PLANS.starter;
export const isConsultancyPlan = (id: string) => planOf(id).audience === "consultancy";
