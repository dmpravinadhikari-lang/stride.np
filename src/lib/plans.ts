/**
 * Plans decide two things: which modules are unlocked, and how much AI use is
 * included. Prices are set here and nowhere else, so changing them after a
 * conversation with a consultancy owner is a one-line edit.
 *
 * No payment gateway yet — you set a consultancy's plan in the admin panel and
 * invoice them by hand. The limits below are enforced regardless.
 */
export const PLANS = {
  starter: {
    label: "Starter",
    audience: "consultancy",
    priceNpr: 4999,
    maxStudents: 25,
    monthlyCredits: 300,
    blurb: "Single branch getting started",
  },
  growth: {
    label: "Growth",
    audience: "consultancy",
    priceNpr: 12999,
    maxStudents: 100,
    monthlyCredits: 1500,
    blurb: "Established consultancy",
  },
  pro: {
    label: "Pro",
    audience: "consultancy",
    priceNpr: 29999,
    maxStudents: Number.POSITIVE_INFINITY,
    monthlyCredits: 5000,
    blurb: "Multi-branch or franchise",
  },
  student_free: {
    label: "Student Free",
    audience: "student",
    priceNpr: 0,
    maxStudents: 1,
    monthlyCredits: 15,
    blurb: "Direct student, free tier",
  },
  student_premium: {
    label: "Student Premium",
    audience: "student",
    priceNpr: 999,
    maxStudents: 1,
    monthlyCredits: 120,
    blurb: "Direct student, full access",
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const planOf = (id: string) => PLANS[(id as PlanId)] ?? PLANS.starter;
export const isConsultancyPlan = (id: string) => planOf(id).audience === "consultancy";
