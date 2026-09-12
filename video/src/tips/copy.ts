/**
 * Five things to get right before building a house in Nepal.
 *
 * Written in the order the money actually leaves your hands: the land, the
 * budget, the permit, the people, then the materials. Each tip is one line
 * you could act on tomorrow, not a category.
 *
 * Deliberately no numbers for ground coverage, setback or FAR: every
 * municipality publishes its own bylaws and they differ, so quoting one
 * palika's figure in a reel that plays nationwide would be wrong for most of
 * the people watching it. The tip says to go and read yours.
 */
export type Tip = {
  n: string;
  /** The Nepali headline, in Devanagari. */
  title: string;
  /** Two lines under it. English words stay English where nobody translates them. */
  lines: [string, string];
  /** The tip's own colour, and the stage of the house it builds. */
  colour: string;
};

export const TIPS: Tip[] = [
  {
    n: "१",
    title: "जग्गा पहिले जाँच्नुहोस्",
    lines: ["बाटो, वर्गीकरण र माटो — किन्नु अघि।", "नक्सा पास हुने जग्गा हो कि होइन?"],
    colour: "#4FB06E",
  },
  {
    n: "२",
    title: "बजेट बनाउनुहोस्, अनुमान होइन",
    lines: ["प्रति वर्गफिट हिसाब गर्नुहोस्।", "१५% थप राख्नुहोस् — खर्च बढ्छ नै।"],
    colour: "#DFA340",
  },
  {
    n: "३",
    title: "नक्सा पास र नियम बुझ्नुहोस्",
    lines: ["पालिकाको ground coverage र setback हेर्नुहोस्।", "NBC अनुसार डिजाइन — भूकम्पको लागि।"],
    colour: "#3D9BE0",
  },
  {
    n: "४",
    title: "मान्छे सही छान्नुहोस्",
    lines: ["दर्ता भएको इन्जिनियर र ठेकेदार मात्र।", "लिखित करार, चरणैपिच्छे भुक्तानी।"],
    colour: "#E0704F",
  },
  {
    n: "५",
    title: "सामान आफैं किन्नुहोस्",
    lines: ["रड र सिमेन्टको grade जाँच्नुहोस्।", "बिल लिनुहोस्, थोकमा किन्नुहोस्।"],
    colour: "#9B7BE0",
  },
];

/** The sky behind the build, moving from first light to late afternoon. */
export const SKIES: [string, string, string][] = [
  ["#12345E", "#2C5E86", "#5C87A8"],
  ["#153A62", "#31688F", "#7A9DB8"],
  ["#17406B", "#3A7399", "#94B3C6"],
  ["#1A4470", "#4A7F9E", "#B79A86"],
  ["#1C4874", "#5C8AA3", "#D9A066"],
];
