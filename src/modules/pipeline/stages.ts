/**
 * The journey a Nepali student actually goes through, in order.
 *
 * Each stage owns a colour, and it is the same colour in the chip, in the
 * filter and in the bar across the top of the list. Somebody who has used the
 * board for a week reads the colour before the word.
 */
export const STAGES = {
  enquiry:     { label: "Enquiry",        blurb: "Walked in or filled a form. Not yet committed.", tone: "grey",   bar: "#9AA0A6" },
  counselling: { label: "Counselling",    blurb: "Choosing country and course.",                   tone: "sky",    bar: "#1A73E8" },
  test_prep:   { label: "Test prep",      blurb: "Working towards IELTS or PTE.",                  tone: "lilac",  bar: "#9334E6" },
  applying:    { label: "Applying",       blurb: "Documents in, applications going out.",          tone: "sky",  bar: "#12B5CB" },
  offer:       { label: "Offer received", blurb: "Offer in hand, fees and NOC next.",              tone: "teal",   bar: "#34A853" },
  visa:        { label: "Visa lodged",    blurb: "Application submitted, awaiting decision.",      tone: "gold",   bar: "#FBBC04" },
  departed:    { label: "Departed",       blurb: "Flown. The reference you can use.",              tone: "accent", bar: "#E8710A" },
  lost:        { label: "Lost",           blurb: "Went elsewhere, or stopped responding.",         tone: "danger", bar: "#EA4335" },
} as const;

export type Stage = keyof typeof STAGES;
export const STAGE_IDS = Object.keys(STAGES) as Stage[];
/** Everything except the two end states, for the "active students" count. */
export const ACTIVE_STAGES = STAGE_IDS.filter((s) => s !== "departed" && s !== "lost");
export const stageOf = (id: string) => STAGES[id as Stage] ?? STAGES.enquiry;
