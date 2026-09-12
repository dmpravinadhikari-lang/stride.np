/**
 * Five things people building in Nepal actually get wrong.
 *
 * Not "plan your budget" — everybody knows that and nobody is helped by it.
 * These are the five that get skipped, are invisible once skipped, and are
 * expensive or impossible to undo: the soil test, where setback is measured
 * from, the certificate nobody collects, the contract that hides the
 * specification, and the water.
 *
 * One line each. If it needs two, it is not sharp enough yet.
 */
export type ArtName = "soil" | "setback" | "certificate" | "boq" | "water";

export type Tip = {
  n: string;
  title: string;
  line: string;
  /** The technical sheet drawn beside it. */
  art: ArtName;
  colour: string;
};

export const TIPS: Tip[] = [
  {
    n: "१",
    title: "जग अघि माटो जाँच",
    line: "रु. १५–५० हजारको टेस्टले लाखौं बचाउँछ।",
    art: "soil",
    colour: "#4FB06E",
  },
  {
    n: "२",
    title: "Setback सिमानाबाट होइन",
    line: "बाटोको केन्द्रबाट नापिन्छ।",
    art: "setback",
    colour: "#3D9BE0",
  },
  {
    n: "३",
    title: "नक्सा पास मात्र पुग्दैन",
    line: "सम्पन्न प्रमाणपत्र नभए लोन र बिक्री अड्किन्छ।",
    art: "certificate",
    colour: "#DFA340",
  },
  {
    n: "४",
    title: "प्रति वर्गफिटमा नलेख्नुहोस्",
    line: "BOQ माग्नुहोस् — कुन grade, कति रड।",
    art: "boq",
    colour: "#E0704F",
  },
  {
    n: "५",
    title: "ढलानको पानी",
    line: "मिक्समा कम, curing मा १४ दिन।",
    art: "water",
    colour: "#9B7BE0",
  },
];

/** The sky behind it all, first light through to late afternoon. */
export const SKIES: [string, string, string][] = [
  ["#12345E", "#2C5E86", "#5C87A8"],
  ["#153A62", "#31688F", "#7A9DB8"],
  ["#17406B", "#3A7399", "#94B3C6"],
  ["#1A4470", "#4A7F9E", "#B79A86"],
  ["#1C4874", "#5C8AA3", "#D9A066"],
];
