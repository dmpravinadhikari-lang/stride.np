import type { CvSection } from "@/modules/cv/lib/schema";

/**
 * CV patterns, and the country conventions that decide what belongs on one.
 *
 * Five patterns, not fifteen. A student choosing between fifteen near-identical
 * layouts is being given a decision instead of an answer, so the tool
 * recommends one, explains why, and lets them override. Each pattern here is a
 * genuinely different document: a different section order, a different length,
 * and a different thing on the first third of page one, which is all an
 * admissions officer reads before deciding whether to read the rest.
 *
 * None of them has a photo, a date of birth, a marital status or a father's
 * name. See the note in src/lib/cv/schema.ts. This is the single most common
 * reason a Nepali CV is discarded abroad, and it is invisible to the student
 * because nobody ever writes back to explain.
 */

export type TemplateId =
  | "fresher" | "professional" | "skills" | "research" | "scholarship"
  | "sidebar" | "banded" | "rated";

export type CvTemplate = {
  id: TemplateId;
  name: string;
  /** One line, shown on the pattern card. */
  tagline: string;
  /** Who it is for, in the student's own terms. */
  bestFor: string[];
  /** Honest about when NOT to use it. */
  avoidIf: string;
  pages: string;
  /** Section order. The renderer prints these, skipping any that are empty. */
  order: CvSection[];
  /** Sections this pattern actively prompts the student to fill. */
  encourage: CvSection[];
  /**
   * How the page actually looks.
   *
   * The variation has to be real. An earlier version changed only the heading
   * rule, which meant five "different" patterns that looked identical in a
   * thumbnail. The student was picking a section order blind. Each differs in
   * face, header, heading treatment and density, visible at a glance.
   *
   * ON THE TWO-COLUMN PATTERNS, and why they exist after this file spent a
   * year saying they should not.
   *
   * The warning further down is that multi-column CVs break applicant tracking
   * systems. That is true of the way most builders make them: a table, or two
   * absolutely-positioned blocks, where the text layer of the PDF comes out
   * interleaved and unreadable. It is not true of the way these are made. The
   * document is one linear stream in the markup, and only its visual placement
   * moves, so the text extracted from the PDF comes out in the order it was
   * written. A parser reading the text layer gets the same words in the same
   * order as the single-column patterns.
   *
   * That is a smaller risk, not no risk: a minority of parsers use position on
   * the page rather than the text layer. So the two-column patterns are
   * offered for job applications, where a person usually reads first, and the
   * single-column ones stay the recommendation for a university or a visa
   * file. Each says so in `avoidIf`.
   */
  design: {
    /** The one colour on the page. */
    accent: "brand" | "steel" | "navy";
    /** Serif for the academic pattern; everything else is the safe sans. */
    face: "sans" | "serif";
    /** Where the name and contact details sit. */
    header: "left" | "centred" | "stacked";
    headings: "rule" | "caps" | "band" | "marker";
    /** How tight the vertical rhythm is, which decides what fits on a page. */
    density: "airy" | "normal" | "tight";
    /**
     * One column, or a narrow side panel carrying the short sections.
     * The markup order does not change; see the note above.
     */
    layout?: "single" | "side";
    /** Which sections move into the panel, when there is one. */
    aside?: CvSection[];
    /** A wash of the accent behind the panel. Printers cope; it is 6% ink. */
    tint?: boolean;
    /** Draw the level dots beside a skill the student has rated. */
    dots?: boolean;
  };
  /** One line naming the look, shown under its preview. */
  looksLike: string;
};

export const cvTemplates: CvTemplate[] = [
  {
    id: "fresher",
    name: "Fresh graduate",
    tagline: "Education first, because that is your strongest card.",
    bestFor: [
      "You have just finished +2 or a bachelor's",
      "Little or no paid work experience",
      "Applying for a bachelor's, diploma or master's",
    ],
    avoidIf: "You have more than two years of full-time work. The experience-led pattern will serve you better.",
    pages: "1 page",
    order: [
      "summary",
      "education",
      "tests",
      "projects",
      "skills",
      "experience",
      "volunteering",
      "certifications",
      "awards",
      "languages",
      "referees",
    ],
    encourage: ["education", "tests", "projects", "skills", "volunteering"],
    design: { accent: "brand", face: "sans", header: "left", headings: "rule", density: "airy" },
    looksLike: "Open and uncluttered, with a thin rule under each heading.",
  },
  {
    id: "professional",
    name: "Experience-led",
    tagline: "What you have done, before what you studied.",
    bestFor: [
      "Two or more years of work",
      "Applying for a master's, MBA or a scholarship that wants experience",
      "Also the right shape for a part-time job once you land",
    ],
    avoidIf: "You are straight out of +2. An experience section with one internship in it looks thinner than no section at all.",
    pages: "1 to 2 pages",
    order: [
      "summary",
      "experience",
      "education",
      "skills",
      "tests",
      "projects",
      "certifications",
      "awards",
      "volunteering",
      "languages",
      "referees",
    ],
    encourage: ["experience", "skills", "education", "certifications"],
    design: { accent: "steel", face: "sans", header: "stacked", headings: "caps", density: "normal" },
    looksLike: "Formal and close-set, with wide-tracked small capitals.",
  },
  {
    id: "skills",
    name: "Skills-first",
    tagline: "Leads with what you can do, so a gap is not the first thing read.",
    bestFor: [
      "A gap of a year or more you would rather not headline",
      "Changing field: IT after a management degree, say",
      "Lots of short jobs, freelance or family business work",
    ],
    avoidIf: "Your history is straightforward and recent. A functional CV invites the question of what it is hiding.",
    pages: "1 to 2 pages",
    order: [
      "summary",
      "skills",
      "projects",
      "experience",
      "education",
      "certifications",
      "tests",
      "volunteering",
      "awards",
      "languages",
      "referees",
    ],
    encourage: ["skills", "projects", "certifications"],
    design: { accent: "navy", face: "sans", header: "left", headings: "band", density: "tight" },
    looksLike: "Headings in solid bands, packed tight to fit more in.",
  },
  {
    id: "research",
    name: "Research & academic",
    tagline: "Publications, supervisors and methods, in the order a department reads them.",
    bestFor: [
      "Applying for a PhD, MPhil or research master's",
      "You have a thesis, a paper, a poster or a conference talk",
      "Applying for a graduate assistantship in the USA",
    ],
    avoidIf: "You are applying for a taught master's or a job. An academic CV reads as overqualified and off-target.",
    pages: "2 pages, and it is allowed to run longer",
    order: [
      "summary",
      "education",
      "publications",
      "experience",
      "projects",
      "skills",
      "awards",
      "tests",
      "certifications",
      "languages",
      "referees",
    ],
    encourage: ["publications", "education", "projects", "referees"],
    design: { accent: "navy", face: "serif", header: "centred", headings: "rule", density: "airy" },
    looksLike: "Serif, centred, generously spaced, an academic CV.",
  },
  {
    id: "scholarship",
    name: "Scholarship",
    tagline: "Built for the panels that fund leadership, not just marks.",
    bestFor: [
      "Chevening, Commonwealth, GREAT, Destination Australia",
      "You have led something. A club, a campaign, a team, a village project",
      "Community and volunteering work you have never put on a CV",
    ],
    avoidIf: "You are applying to a university directly. Trim the leadership framing and use the fresher or experience-led pattern.",
    pages: "2 pages",
    order: [
      "summary",
      "experience",
      "volunteering",
      "education",
      "awards",
      "projects",
      "skills",
      "tests",
      "certifications",
      "publications",
      "languages",
      "referees",
    ],
    encourage: ["volunteering", "experience", "awards", "summary"],
    design: { accent: "brand", face: "sans", header: "left", headings: "marker", density: "normal" },
    looksLike: "A colour bar above the name and a marker beside each heading.",
  },

  /* ------------------------------------------------------------------ *
   * The two-column patterns.
   *
   * For a job application, where a person reads the page before any
   * software does. Each one keeps the markup in one linear order, so the
   * text layer of the PDF still extracts in the order it was written; see
   * the note on `design` above for what that does and does not buy.
   * ------------------------------------------------------------------ */
  {
    id: "sidebar",
    name: "Side panel",
    tagline: "Your evidence down the middle, the short facts down the side.",
    bestFor: [
      "A job or internship application",
      "Anyone with more skills and languages than work history",
      "A CV a person will read before software does",
    ],
    avoidIf: "You are applying to a university or attaching it to a visa file. Use a single-column pattern for those.",
    pages: "1 to 2 pages",
    order: [
      "summary", "experience", "education", "projects", "volunteering",
      "skills", "tests", "languages", "certifications", "awards",
    ],
    encourage: ["skills", "languages", "summary"],
    design: {
      accent: "steel", face: "sans", header: "left", headings: "rule", density: "normal",
      layout: "side", tint: true, dots: true,
      aside: ["skills", "tests", "languages", "certifications", "awards"],
    },
    looksLike: "A tinted panel down the right with your skills, tests and languages.",
  },
  {
    id: "banded",
    name: "Banded",
    tagline: "Each heading in a soft colour band, so the page has a shape.",
    bestFor: [
      "A first job where the CV has to look like effort was made",
      "Anyone whose sections are short and need separating",
      "Sending as an attachment rather than pasting into a form",
    ],
    avoidIf: "The employer asks for plain text, or the application form has a box you paste into.",
    pages: "1 to 2 pages",
    order: [
      "summary", "education", "experience", "projects", "skills",
      "tests", "volunteering", "languages", "awards",
    ],
    encourage: ["summary", "projects", "skills"],
    design: {
      accent: "brand", face: "sans", header: "stacked", headings: "band", density: "normal",
      layout: "single", tint: false, dots: true,
    },
    looksLike: "Solid colour bands behind every heading, and dots beside rated skills.",
  },
  {
    id: "rated",
    name: "Rated skills",
    tagline: "Skills scored down the side, for when the skills are the point.",
    bestFor: [
      "A technical or office role listing software",
      "Anyone with a long skills list and a short work history",
      "Showing a level rather than claiming one in words",
    ],
    avoidIf: "You have not rated your skills honestly, or you are applying to a university.",
    pages: "1 to 2 pages",
    order: [
      "summary", "skills", "experience", "education", "projects",
      "tests", "languages", "certifications", "volunteering",
    ],
    encourage: ["skills", "experience", "summary"],
    design: {
      accent: "navy", face: "sans", header: "left", headings: "caps", density: "tight",
      layout: "side", tint: true, dots: true,
      aside: ["skills", "languages", "tests"],
    },
    looksLike: "A panel of skills with a five-dot level beside each one.",
  },
];

export const templateById = (id: string) => cvTemplates.find((t) => t.id === id) ?? cvTemplates[0];

/** Human labels for section keys, used by the form and the pattern cards. */
export const sectionLabels: Record<CvSection, string> = {
  summary: "Personal profile",
  education: "Education",
  experience: "Work experience",
  projects: "Projects",
  skills: "Skills",
  tests: "English & entrance tests",
  certifications: "Certifications & training",
  publications: "Publications & research",
  volunteering: "Volunteering & leadership",
  languages: "Languages",
  awards: "Awards & scholarships",
  referees: "Referees",
};

/**
 * What each destination expects, and what it will quietly hold against you.
 *
 * Sourced from the conventions published by the destinations' own university
 * careers services rather than from CV-writing blogs. The rules that matter to
 * a Nepali applicant are the omissions, so those are stated first and bluntly:
 * a student who has been putting a photograph and a date of birth on every CV
 * since school will not remove them because a page said "keep it professional".
 */
export type CountryRule = {
  slug: string;
  label: string;
  /** What the document is called there. Getting this wrong reads as careless. */
  calledIt: string;
  length: string;
  never: string[];
  expect: string[];
  note: string;
};

export const countryRules: CountryRule[] = [
  {
    slug: "uk",
    label: "United Kingdom",
    calledIt: "CV",
    length: "2 pages maximum. One page if you are a fresh graduate.",
    never: [
      "No photograph",
      "No date of birth or age",
      "No marital status, gender, religion or caste",
      "No father's or husband's name",
      "No nationality unless the form asks for it separately",
    ],
    expect: [
      "A short personal profile at the top, three or four lines",
      "Reverse chronological order: most recent first, always",
      "\"Referees available on request\" rather than their phone numbers",
      "British spelling: organisation, programme, specialise",
    ],
    note: "UK universities and employers work under equality law that makes age, gender and marital status unusable. A CV carrying them is often discarded unread to prove it was not considered.",
  },
  {
    slug: "usa",
    label: "United States",
    calledIt: "Résumé for jobs and taught programmes; CV only for research and academia",
    length: "Strictly 1 page for a résumé. An academic CV may run to several.",
    never: [
      "No photograph",
      "No date of birth, age or marital status",
      "No referees on the document itself",
      "No \"Curriculum Vitae\" as a heading on a one-page résumé",
    ],
    expect: [
      "Achievements with numbers in them, not duties",
      "GPA converted and shown as \"3.4/4.0\" if it is strong",
      "American spelling: organization, program, specialize",
      "A skills section an applicant tracking system can read",
    ],
    note: "Almost every US application passes through an applicant tracking system before a person sees it. Tables, columns, headers and text inside images are what break those systems, which is why the downloads here are plain, single-column text.",
  },
  {
    slug: "canada",
    label: "Canada",
    calledIt: "Résumé for jobs, CV for graduate study",
    length: "1 to 2 pages.",
    never: [
      "No photograph",
      "No date of birth, age, gender or marital status",
      "No Social Insurance Number",
    ],
    expect: [
      "Volunteer work treated as seriously as paid work",
      "Canadian spelling sits between British and American, favour \"centre\" and \"organization\"",
      "Any Canadian study or work permit status stated plainly if you have one",
    ],
    note: "Canadian employers and admissions offices read volunteering as evidence of community involvement, which is weighted more heavily than most Nepali students expect.",
  },
  {
    slug: "australia",
    label: "Australia",
    calledIt: "Resume or CV: the two are used interchangeably",
    length: "2 to 3 pages is normal and not held against you.",
    never: ["No photograph", "No date of birth or marital status"],
    expect: [
      "Referees with names and contact details are commonly included",
      "Any Australian visa status or work rights stated clearly",
      "Australian spelling, which follows British: organisation, programme",
    ],
    note: "Australia is the one destination of the five where a longer CV with named referees is the norm rather than a warning sign.",
  },
  {
    slug: "new-zealand",
    label: "New Zealand",
    calledIt: "CV",
    length: "2 to 3 pages.",
    never: ["No photograph", "No date of birth or marital status"],
    expect: [
      "Two named referees, usually with contact details",
      "A short profile at the top",
      "New Zealand spelling follows British convention",
    ],
    note: "New Zealand employers place unusual weight on referees actually being reachable. Ask permission before you list anyone, and warn them a call may come.",
  },
];

export const ruleFor = (slug: string) => countryRules.find((r) => r.slug === slug);

/** The rules that hold everywhere, printed where a student cannot miss them. */
export const universalRules = [
  "One page for every two years of experience, and never more than two pages unless it is an academic CV.",
  "Reverse chronological order inside every section. Most recent first, with no exceptions.",
  "No photograph. Not in any of the five destinations.",
  "No date of birth, marital status, gender, religion, caste, or father's name.",
  "A plain single column. Tables and text boxes are what break applicant tracking systems.",
  "Save as PDF unless the application form explicitly asks for Word.",
  "Name the file properly: Ram-Thapa-CV.pdf, not cv-final-2.pdf.",
];
