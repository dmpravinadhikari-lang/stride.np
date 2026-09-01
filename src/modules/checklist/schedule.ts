import { STEPS, stepsFor, type Step } from "@/modules/checklist/steps";

/**
 * Turns the step list into dates by counting backwards from the intake.
 *
 * This is the whole point of the module. "Get your NOC" is a task; "get your
 * NOC by 12 March, and start it by 26 February because it takes a fortnight"
 * is a plan.
 */

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

/** Students write "July 2027", "Sept 2027", "2027-07", "Fall 2027". */
export function parseIntake(text: string | null | undefined): Date | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();

  const iso = t.match(/(20\d{2})[-/](\d{1,2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, 1));

  const year = t.match(/20\d{2}/);
  if (!year) return null;
  const y = Number(year[0]);

  const monthIndex = MONTHS.findIndex((m) => t.includes(m.slice(0, 3)));
  if (monthIndex >= 0) return new Date(Date.UTC(y, monthIndex, 1));

  // Northern-hemisphere seasons, as universities use them.
  if (t.includes("fall") || t.includes("autumn")) return new Date(Date.UTC(y, 8, 1));
  if (t.includes("spring")) return new Date(Date.UTC(y, 0, 1));
  if (t.includes("summer")) return new Date(Date.UTC(y, 5, 1));
  if (t.includes("winter")) return new Date(Date.UTC(y, 10, 1));
  return new Date(Date.UTC(y, 6, 1));
}

export type Scheduled = {
  step: Step;
  /** Finish by this date. Null when no intake is known. */
  dueOn: Date | null;
  /** Start by this date to finish in time. */
  startBy: Date | null;
  status: "todo" | "doing" | "done" | "skipped";
  state: "done" | "overdue" | "due-soon" | "start-now" | "upcoming" | "later" | "undated";
  daysLeft: number | null;
};

const DAY = 864e5;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

export function buildSchedule(
  countryCode: string | null,
  intake: Date | null,
  progress: Map<string, { status: string; due_on: string | null }>,
  today = new Date(),
): Scheduled[] {
  const steps = stepsFor(countryCode);

  return steps.map((step) => {
    const saved = progress.get(step.id);
    const status = (saved?.status ?? "todo") as Scheduled["status"];

    const override = saved?.due_on ? new Date(saved.due_on) : null;
    const dueOn = override ?? (intake ? addDays(intake, -step.leadDays) : null);
    const startBy = dueOn ? addDays(dueOn, -step.takesDays) : null;

    let state: Scheduled["state"] = "undated";
    let daysLeft: number | null = null;

    if (status === "done" || status === "skipped") {
      state = "done";
    } else if (dueOn) {
      daysLeft = Math.ceil((dueOn.getTime() - today.getTime()) / DAY);
      if (daysLeft < 0) state = "overdue";
      else if (daysLeft <= 14) state = "due-soon";
      else if (startBy && startBy.getTime() <= today.getTime()) state = "start-now";
      else if (daysLeft <= 90) state = "upcoming";
      else state = "later";
    }

    return { step, dueOn, startBy, status, state, daysLeft };
  });
}

export const STATE_LABEL: Record<Scheduled["state"], { label: string; tone: "teal" | "danger" | "gold" | "brand" | "grey" }> = {
  done: { label: "Done", tone: "teal" },
  overdue: { label: "Overdue", tone: "danger" },
  "due-soon": { label: "Due soon", tone: "danger" },
  "start-now": { label: "Start now", tone: "gold" },
  upcoming: { label: "Coming up", tone: "brand" },
  later: { label: "Later", tone: "grey" },
  undated: { label: "No date yet", tone: "grey" },
};

/** What the reminder job looks for. */
export const needsAttention = (s: Scheduled) =>
  s.state === "overdue" || s.state === "due-soon" || s.state === "start-now";

export const totalSteps = (countryCode: string | null) => stepsFor(countryCode).length;
export const ALL_STEP_IDS = STEPS.map((s) => s.id);
