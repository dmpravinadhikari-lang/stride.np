/**
 * The journey a Nepali student actually goes through, in order.
 *
 * Each stage owns a colour, and it is the same colour in the chip, in the
 * filter and in the bar across the top of the list. Somebody who has used the
 * board for a week reads the colour before the word.
 */
export const STAGES = {
  enquiry:     { label: "Enquiry",        blurb: "Walked in or filled a form. Not yet committed.", tone: "grey",   bar: "#B8B0A0" },
  counselling: { label: "Counselling",    blurb: "Choosing country and course.",                   tone: "sky",    bar: "#3C7FB1" },
  test_prep:   { label: "Test prep",      blurb: "Working towards IELTS or PTE.",                  tone: "lilac",  bar: "#6E55B8" },
  applying:    { label: "Applying",       blurb: "Documents in, applications going out.",          tone: "brand",  bar: "#0E6E52" },
  offer:       { label: "Offer received", blurb: "Offer in hand, fees and NOC next.",              tone: "teal",   bar: "#189A6B" },
  visa:        { label: "Visa lodged",    blurb: "Application submitted, awaiting decision.",      tone: "gold",   bar: "#E09503" },
  departed:    { label: "Departed",       blurb: "Flown. The reference you can use.",              tone: "accent", bar: "#A3541C" },
  lost:        { label: "Lost",           blurb: "Went elsewhere, or stopped responding.",         tone: "danger", bar: "#C0392B" },
} as const;

export type Stage = keyof typeof STAGES;
export const STAGE_IDS = Object.keys(STAGES) as Stage[];
/** Everything except the two end states, for the "active students" count. */
export const ACTIVE_STAGES = STAGE_IDS.filter((s) => s !== "departed" && s !== "lost");
export const stageOf = (id: string) => STAGES[id as Stage] ?? STAGES.enquiry;
