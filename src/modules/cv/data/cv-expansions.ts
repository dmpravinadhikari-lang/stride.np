/**
 * The phrasings a thin answer gets turned into.
 *
 * A student writes "helped in my uncle's shop for 6 months". That is true, it
 * is relevant, and written like that it is worth nothing on a CV. This file
 * holds the wording that says the same thing in the register an admissions
 * officer reads, so the student does not have to know that register exists.
 *
 * TWO RULES, AND THE FIRST ONE IS NOT NEGOTIABLE.
 *
 * Nothing here invents a fact. Every line is a way of saying something the
 * student already told us, or a prompt asking whether something is true. A CV
 * is filed with a visa application, and a visa officer who finds one invented
 * responsibility stops believing the whole file. So bullets are offered and
 * ticked, never inserted silently, and anything that would be a claim rather
 * than a rewording is written as a question instead.
 *
 * And the patterns are the work Nepali students actually do. Not "software
 * engineering internship at a startup" but a family shop, tuition at home, a
 * restaurant in Thamel, a cousin's construction site, a call centre on night
 * shift. A library full of jobs nobody here has is a library that matches
 * nothing and leaves the student with the blank form they started with.
 */

export type WorkPattern = {
  id: string;
  /** What the office would call it. */
  label: string;
  /** Lower-case fragments matched against whatever the student typed. */
  matches: string[];
  /** A role title they can use, if they gave nothing better. */
  role: string;
  /**
   * Ways of saying the ordinary parts of this job. Offered as suggestions and
   * only included when the student ticks one, because we do not know which of
   * these they actually did.
   */
  bullets: string[];
  /** Skills this work genuinely evidences, for the skills section. */
  skills: string[];
  /**
   * The one question worth asking about this kind of work, because the answer
   * is usually the only quantified thing a student CV will ever have.
   */
  ask?: string;
};

export const workPatterns: WorkPattern[] = [
  {
    id: "family_business",
    label: "Family business",
    matches: ["family business", "uncle", "father shop", "our shop", "family shop", "parents business", "home business"],
    role: "Assistant, family business",
    bullets: [
      "Served customers and handled daily sales in a family-run business",
      "Kept the daily cash record and reconciled it at closing",
      "Managed stock levels and reordered items that were running low",
      "Handled supplier orders and checked deliveries against invoices",
      "Covered the shop independently when the owner was away",
    ],
    skills: ["Customer service", "Cash handling", "Stock control", "Record keeping"],
    ask: "Roughly how many customers did you serve on a normal day?",
  },
  {
    id: "retail",
    label: "Shop or retail",
    matches: ["shop", "store", "retail", "showroom", "boutique", "supermarket", "mart", "sales assistant"],
    role: "Sales Assistant",
    bullets: [
      "Advised customers on products and helped them choose what suited them",
      "Operated the till and handled cash and digital payments",
      "Arranged displays and kept the floor stocked and tidy",
      "Handled exchanges and complaints politely and to the shop's rules",
      "Recorded daily sales and passed the figures to the owner",
    ],
    skills: ["Customer service", "Point of sale", "Merchandising", "Cash handling"],
    ask: "What was a busy day's takings, roughly?",
  },
  {
    id: "tuition",
    label: "Tuition or teaching",
    matches: ["tuition", "teach", "teacher", "tutor", "coaching", "institute", "school", "classes"],
    role: "Tuition Teacher",
    bullets: [
      "Taught school students in small groups and one to one",
      "Prepared lesson plans and practice papers for each topic",
      "Tracked each student's progress and adjusted the pace to suit them",
      "Prepared students for board examinations",
      "Explained difficult topics in both Nepali and English",
    ],
    skills: ["Teaching", "Lesson planning", "Communication", "Patience"],
    ask: "How many students did you teach, and which subject and grade?",
  },
  {
    id: "hospitality",
    label: "Restaurant, cafe or hotel",
    matches: ["restaurant", "cafe", "hotel", "waiter", "waitress", "kitchen", "barista", "resort", "lodge", "catering"],
    role: "Service Staff",
    bullets: [
      "Served guests and took orders during busy shifts",
      "Worked as part of a team under time pressure at peak hours",
      "Handled billing and payments at the counter",
      "Kept the service area clean and to hygiene standards",
      "Dealt with guest requests and complaints calmly",
    ],
    skills: ["Customer service", "Teamwork", "Working under pressure", "Food hygiene"],
    ask: "About how many covers or guests on a busy shift?",
  },
  {
    id: "call_centre",
    label: "Call centre or customer support",
    matches: ["call centre", "call center", "bpo", "customer support", "telecaller", "tele caller", "helpline"],
    role: "Customer Support Executive",
    bullets: [
      "Handled inbound customer calls and resolved queries",
      "Logged every call and its outcome in the company system",
      "Escalated issues that could not be resolved on the first call",
      "Met daily targets for calls handled and resolution time",
      "Worked night shifts to cover an overseas time zone",
    ],
    skills: ["Communication", "Problem solving", "CRM systems", "English fluency"],
    ask: "Roughly how many calls did you handle in a shift?",
  },
  {
    id: "research",
    label: "Research or fieldwork",
    matches: [
      "research", "research assistant", "field research", "field work", "fieldwork",
      "enumerator", "survey", "data collection", "field officer", "project officer",
      "ngo", "i/ngo", "monitoring and evaluation", "thesis work", "lab assistant",
    ],
    role: "Research Assistant",
    bullets: [
      "Collected survey data from households and recorded it the same day",
      "Trained and supported enumerators on the survey tool",
      "Cleaned and checked data before it went to the analysis team",
      "Wrote up findings into the project's routine reports",
      "Worked to a fieldwork schedule across several districts",
    ],
    skills: ["Survey design", "Data collection", "Data cleaning", "Report writing", "Fieldwork"],
    ask: "Roughly how many households or respondents did you cover?",
  },
  {
    id: "marketing",
    label: "Marketing or social media",
    matches: [
      "marketing", "digital marketing", "social media", "content", "content creation",
      "brand", "advertis", "campaign", "seo", "graphic design", "video edit", "page handler",
    ],
    role: "Marketing Assistant",
    bullets: [
      "Planned and posted content on the business's social media pages",
      "Designed simple graphics and short videos for campaigns",
      "Replied to comments and enquiries that came through the pages",
      "Tracked which posts brought enquiries and reported it to the owner",
      "Helped run paid promotions within a set budget",
    ],
    skills: ["Content creation", "Social media management", "Canva", "Campaign reporting", "Copywriting"],
    ask: "How many followers did the page have, or how many enquiries came through it?",
  },
  {
    id: "management",
    label: "Managing a team",
    matches: [
      "manager", "management", "supervisor", "team lead", "in charge", "coordinator",
      "head of", "incharge", "branch manager", "shift lead",
    ],
    role: "Team Leader",
    bullets: [
      "Led a small team and set the work for each day",
      "Trained new staff and checked their work until they were confident",
      "Handled the roster and covered shifts when somebody was absent",
      "Reported results to the owner or head office",
      "Dealt with complaints and problems before they reached the owner",
    ],
    skills: ["Team management", "Staff training", "Rostering", "Problem solving", "Reporting"],
    ask: "How many people were in the team you led?",
  },
  {
    id: "office",
    label: "Office or admin",
    matches: ["office", "admin", "office assistant", "clerk", "reception", "data entry", "accounts", "documentation", "front desk"],
    role: "Office Assistant",
    bullets: [
      "Maintained records and filed documents so they could be found again",
      "Entered data accurately into spreadsheets and the office system",
      "Answered the phone and directed enquiries to the right person",
      "Prepared routine letters and documents",
      "Supported the team with day to day administrative work",
    ],
    skills: ["MS Office", "Data entry", "Record keeping", "Organisation"],
    ask: "Which software did you use day to day?",
  },
  {
    id: "internship",
    label: "Internship",
    matches: ["intern", "internship", "trainee", "apprentice", "placement"],
    role: "Intern",
    bullets: [
      "Completed a supervised placement as part of my course",
      "Supported the team with day to day tasks and learned their systems",
      "Produced a report on the placement for my college",
      "Observed and assisted qualified staff in their routine work",
    ],
    skills: ["Professional practice", "Teamwork", "Report writing"],
    ask: "What was the one thing you produced or finished there?",
  },
  {
    id: "it",
    label: "IT or computer work",
    matches: ["it ", "computer", "software", "web", "developer", "programming", "technician", "network", "cyber"],
    role: "IT Assistant",
    bullets: [
      "Set up and maintained computers and network connections",
      "Diagnosed and fixed routine hardware and software faults",
      "Supported users with day to day computer problems",
      "Kept systems updated and backed up",
    ],
    skills: ["Troubleshooting", "Hardware", "Networking", "Technical support"],
    ask: "Which systems or languages did you work with?",
  },
  {
    id: "healthcare",
    label: "Health or care work",
    matches: ["hospital", "clinic", "nurse", "nursing", "pharmacy", "care", "lab", "medical", "health post"],
    role: "Healthcare Assistant",
    bullets: [
      "Assisted qualified staff with patient care and daily routines",
      "Recorded patient details accurately and kept them confidential",
      "Prepared and maintained clean, safe treatment areas",
      "Supported patients and their families with information and reassurance",
    ],
    skills: ["Patient care", "Confidentiality", "Hygiene and safety", "Record keeping"],
    ask: "Which department or ward, and roughly how many patients a day?",
  },
  {
    id: "agriculture",
    label: "Farm or family land",
    matches: ["farm", "agriculture", "field", "krishi", "poultry", "livestock", "vegetable"],
    role: "Farm Assistant",
    bullets: [
      "Worked on the family land through the planting and harvest seasons",
      "Managed daily animal care and feeding routines",
      "Sold produce at the local market and kept the sales record",
      "Planned the season's work around weather and labour available",
    ],
    skills: ["Planning", "Physical work", "Record keeping", "Responsibility"],
  },
  {
    id: "construction",
    label: "Construction or trade",
    matches: ["construction", "site", "electrician", "plumber", "carpenter", "mason", "welding", "mechanic", "workshop"],
    role: "Trade Assistant",
    bullets: [
      "Worked to a schedule on site alongside a skilled team",
      "Followed safety procedures and used tools and equipment correctly",
      "Measured, prepared and finished work to the standard required",
      "Learned the trade under a qualified supervisor",
    ],
    skills: ["Practical skills", "Health and safety", "Teamwork", "Reliability"],
  },
  {
    id: "freelance",
    label: "Freelance or own work",
    matches: ["freelance", "own business", "self employed", "youtube", "content", "design", "photography", "editing"],
    role: "Freelance",
    bullets: [
      "Took on work directly from clients and delivered it to deadline",
      "Agreed the brief and price with each client before starting",
      "Built and kept a portfolio of completed work",
      "Managed my own time across several jobs at once",
    ],
    skills: ["Self management", "Client communication", "Meeting deadlines"],
    ask: "Roughly how many clients or pieces of work?",
  },
  {
    id: "volunteer",
    label: "Volunteering or social work",
    matches: ["volunteer", "ngo", "social", "community", "blood donation", "red cross", "scout", "club", "relief"],
    role: "Volunteer",
    bullets: [
      "Volunteered with a community organisation in my own time",
      "Helped organise events and coordinate other volunteers",
      "Worked directly with people in the community",
      "Represented the organisation at local activities",
    ],
    skills: ["Teamwork", "Community engagement", "Organisation"],
  },
];

/**
 * What a student can honestly say about their studies when nothing else has
 * happened yet, which is the position most +2 leavers are in.
 *
 * Offered, not asserted. "Completed a research project" goes on a CV only if
 * the student ticks it, because plenty of courses do not have one.
 */
export const educationHighlights: Record<string, string[]> = {
  plus2: [
    "Completed the National Examination Board higher secondary programme",
    "Studied a full science, management or humanities stream over two years",
    "Took part in the school's extra-curricular and sports programme",
    "Held a class or house responsibility",
  ],
  bachelors: [
    "Completed a full undergraduate degree over three or four years",
    "Completed a final year project or dissertation",
    "Presented coursework and projects to staff and classmates",
    "Worked in project groups on assessed coursework",
    "Took part in college societies or events",
  ],
  masters: [
    "Completed a postgraduate degree including a dissertation",
    "Carried out independent research under a supervisor",
    "Presented findings to academic staff",
  ],
};

/**
 * Skills implied by a field of study.
 *
 * Not decoration: an admissions officer reading a management CV expects to see
 * the management words, and a student who has them but does not write them is
 * marked down for the wording rather than the substance.
 */
export const fieldSkills: { matches: string[]; group: string; items: string[] }[] = [
  { matches: ["management", "bba", "bbs", "business", "commerce", "mba", "administration"],
    group: "Business", items: ["MS Excel", "Team management", "Bookkeeping", "Customer service", "Report writing", "Presentations", "Meeting minutes"] },
  { matches: ["marketing", "advertis", "brand", "media studies", "mass communication", "journalis"],
    group: "Marketing", items: ["Content creation", "Social media management", "Canva", "Campaign reporting", "Copywriting", "Customer research"] },
  { matches: ["finance", "account", "banking", "audit", "economics"],
    group: "Finance", items: ["MS Excel", "Bookkeeping", "Bank reconciliation", "Invoicing", "Budget tracking", "Tally"] },
  { matches: ["science", "physics", "chemistry", "biology", "bsc", "microbio", "biotech", "environment"],
    group: "Scientific", items: ["Laboratory practice", "Data recording", "Report writing", "Statistical analysis", "Sample handling"] },
  { matches: ["computer", " it", "csit", "bca", "software", "programming", "data"],
    group: "Technical", items: ["MS Office", "Troubleshooting", "Documentation", "Problem solving", "Basic programming", "Spreadsheet formulas"] },
  { matches: ["engineering", "electronics", "civil", "mechanical", "architect"],
    group: "Engineering", items: ["AutoCAD", "Technical drawing", "Site measurement", "Documentation", "Estimation"] },
  { matches: ["nurse", "nursing", "health", "medical", "pharmacy", "hospital", "public health"],
    group: "Clinical", items: ["Patient care", "Clinical records", "Hygiene and safety", "Working in a team", "Health education"] },
  { matches: ["education", "teaching", "b.ed", "bed", "child"],
    group: "Teaching", items: ["Lesson planning", "Classroom management", "Communication", "Group facilitation", "Marking and feedback"] },
  { matches: ["humanities", "arts", "social", "sociology", "political", "law"],
    group: "Academic", items: ["Research", "Essay writing", "Referencing", "Public speaking", "Critical reading"] },
  { matches: ["hotel", "hospitality", "tourism", "travel", "culinary"],
    group: "Hospitality", items: ["Guest service", "Front office", "Working under pressure", "Booking systems", "Food safety"] },
  { matches: ["agricultur", "forestry", "veterinary", "animal"],
    group: "Agriculture", items: ["Field survey", "Record keeping", "Equipment handling", "Working outdoors"] },
];

/**
 * What a level of study evidences on its own.
 *
 * A student with no work at all still has three years of coursework, and these
 * are the words an admissions officer expects to see for it. Offered, like
 * everything else, rather than assumed.
 */
export const levelSkills: Record<string, string[]> = {
  plus2: ["Time management", "Teamwork", "Note taking", "Public speaking"],
  bachelors: ["Report writing", "Group projects", "Presentations", "Meeting deadlines", "Research"],
  masters: ["Academic research", "Dissertation writing", "Referencing", "Data analysis", "Presenting findings"],
};

/** Everybody has these. Ticked, not assumed. */
export const commonSkills = [
  "MS Word", "MS Excel", "MS PowerPoint", "Email and internet", "Social media",
  "Typing", "Google Workspace", "Canva", "Photo editing", "Basic accounting",
];

export const commonLanguages = [
  { name: "Nepali", level: "Native" },
  { name: "English", level: "Fluent" },
  { name: "Hindi", level: "Conversational" },
  { name: "Maithili", level: "Conversational" },
  { name: "Newari", level: "Conversational" },
  { name: "Bhojpuri", level: "Conversational" },
];

/**
 * The opening paragraph, assembled from what we know.
 *
 * Deliberately plain. A personal statement that opens "dynamic and results
 * driven individual" tells an admissions officer only that the student copied
 * it, and they have read it four hundred times this month.
 */
export function summaryFor(input: {
  level: string;
  field: string;
  target: string;
  destination: string;
  hasWork: boolean;
  years: number;
}): string {
  const level =
    input.level === "masters" ? "postgraduate" :
    input.level === "bachelors" ? "graduate" : "higher secondary";
  const field = input.field.trim();
  const study = field ? ` in ${field}` : "";
  /*
   * "a masters in the Canada" was what this produced.
   *
   * The level keys are the form's own values, not English, and only two of the
   * five country names take a definite article. Both need spelling out rather
   * than pasting the raw value into a sentence.
   */
  const targets: Record<string, string> = {
    diploma: "a diploma",
    bachelors: "a bachelor's degree",
    masters: "a master's degree",
    phd: "a PhD",
  };
  const target = targets[input.target] ?? (input.target ? `a ${input.target}` : "further study");

  const takesThe = /^(united|uk|usa|us|netherlands|philippines)\b/i.test(input.destination.trim());
  const where = input.destination
    ? ` in ${takesThe ? "the " : ""}${input.destination.trim()}`
    : " abroad";

  const opening = `${level.charAt(0).toUpperCase()}${level.slice(1)} student${study}, applying for ${target}${where}.`;
  const work = input.hasWork
    ? ` ${input.years >= 1 ? `${input.years} year${input.years === 1 ? "" : "s"} of` : "Practical"} work experience alongside my studies.`
    : "";
  return `${opening}${work}`.trim();
}
