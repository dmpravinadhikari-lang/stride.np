/** The journey a Nepali student actually goes through, in order. */
export const STAGES = {
  enquiry:     { label: "Enquiry",        blurb: "Walked in or filled a form. Not yet committed.", tone: "grey" },
  counselling: { label: "Counselling",    blurb: "Choosing country and course.", tone: "grey" },
  test_prep:   { label: "Test prep",      blurb: "Working towards IELTS or PTE.", tone: "brand" },
  applying:    { label: "Applying",       blurb: "Documents in, applications going out.", tone: "brand" },
  offer:       { label: "Offer received", blurb: "Offer in hand, fees and NOC next.", tone: "teal" },
  visa:        { label: "Visa lodged",    blurb: "Application submitted, awaiting decision.", tone: "gold" },
  departed:    { label: "Departed",       blurb: "Flown. The reference you can use.", tone: "teal" },
  lost:        { label: "Lost",           blurb: "Went elsewhere, or stopped responding.", tone: "danger" },
} as const;

export type Stage = keyof typeof STAGES;
export const STAGE_IDS = Object.keys(STAGES) as Stage[];
/** Everything except the two end states, for the "active students" count. */
export const ACTIVE_STAGES = STAGE_IDS.filter((s) => s !== "departed" && s !== "lost");
export const stageOf = (id: string) => STAGES[id as Stage] ?? STAGES.enquiry;
