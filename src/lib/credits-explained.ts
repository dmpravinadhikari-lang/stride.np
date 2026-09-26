import { creditsFor } from "@/lib/modules/registry";

/**
 * What a month of credits actually buys.
 *
 * A number on a pricing page means nothing on its own: "1,500 credits" tells
 * an owner exactly as much as "1,500 widgets". So the figures below are
 * computed from the real per-action prices in the module definitions. Change
 * what an interview costs and this page changes with it, which is the only
 * way a pricing page stays true.
 */

/** The AI work one student typically uses on the way to a visa. */
export const STUDENT_JOURNEY = [
  {
    label: "A statement of purpose",
    detail: "drafted, scored, revised once",
    credits: () => creditsFor("sop-studio", "draft") + creditsFor("sop-studio", "review") + creditsFor("sop-studio", "revise"),
  },
  {
    label: "A full mock visa interview",
    detail: "ten questions, each marked, with a report",
    credits: () => 10 * (creditsFor("ai-interview", "question") + creditsFor("ai-interview", "evaluate")) + creditsFor("ai-interview", "report"),
  },
  {
    label: "Two writing tasks and a speaking test",
    detail: "marked with a band and the reason",
    credits: () => 2 * creditsFor("mock-tests", "writing_task") + creditsFor("mock-tests", "speaking"),
  },
  {
    label: "A document check",
    detail: "reads the file and says what is missing",
    credits: () => creditsFor("documents", "completeness_check"),
  },
] as const;

/** Credits one student's preparation costs, start to finish. */
export const perStudent = () => STUDENT_JOURNEY.reduce((n, item) => n + item.credits(), 0);

/**
 * Roughly how many students a month of credits covers.
 *
 * Rounded down and described as "about", because a student who sits four
 * mocks costs more than one who sits none, and a pricing page that promises
 * an exact number of people is a pricing page that will be argued with.
 */
export const studentsCovered = (monthlyCredits: number) =>
  Math.max(1, Math.floor(monthlyCredits / perStudent()));
