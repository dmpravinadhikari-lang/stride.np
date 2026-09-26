/**
 * The journey a Nepali student actually goes through, in order.
 *
 * Each stage owns a colour, and it is the same colour in the chip, in the
 * filter and in the bar across the top of the list. Somebody who has used the
 * board for a week reads the colour before the word.
 */
export const STAGES = {
  /*
   * The bars are the brand's own colours, in the order the run goes: an
   * enquiry is pink, the work in the middle is orange, a departure is yellow.
   * Green is kept for the one stage that is genuinely a win in hand, and red
   * for the one that is a loss, because those two are status rather than
   * decoration and the brand book says status colours are for status.
   */
  enquiry:     { label: "Enquiry",        blurb: "Walked in or filled a form. Not yet committed.", tone: "rose",   bar: "#F0407A" },
  counselling: { label: "Counselling",    blurb: "Choosing country and course.",                   tone: "sky",    bar: "#FF7A1A" },
  test_prep:   { label: "Test prep",      blurb: "Working towards IELTS or PTE.",                  tone: "amber",  bar: "#FFC526" },
  applying:    { label: "Applying",       blurb: "Documents in, applications going out.",          tone: "sky",    bar: "#FF933F" },
  offer:       { label: "Offer received", blurb: "Offer in hand, fees and NOC next.",              tone: "teal",   bar: "#21C55D" },
  visa:        { label: "Visa lodged",    blurb: "Application submitted, awaiting decision.",      tone: "lilac",  bar: "#15133A" },
  departed:    { label: "Departed",       blurb: "Flown. The reference you can use.",              tone: "grey",   bar: "#8A899E" },
  lost:        { label: "Lost",           blurb: "Went elsewhere, or stopped responding.",         tone: "danger", bar: "#E5484D" },
} as const;

export type Stage = keyof typeof STAGES;
export const STAGE_IDS = Object.keys(STAGES) as Stage[];
/** Everything except the two end states, for the "active students" count. */
export const ACTIVE_STAGES = STAGE_IDS.filter((s) => s !== "departed" && s !== "lost");
export const stageOf = (id: string) => STAGES[id as Stage] ?? STAGES.enquiry;
