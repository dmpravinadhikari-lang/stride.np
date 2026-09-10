import type { CountryCode } from "@/lib/countries";
import type { Level } from "@/modules/cost/data";

/**
 * Funding a Nepali student can realistically apply for.
 *
 * Scheme names, who runs them and roughly what they cover are public fact.
 * Deadlines shift every cycle, so a month is given rather than a date, and
 * every row links to the official page. Nobody should plan around a date in
 * this file without checking it.
 */
export type Scholarship = {
  id: string;
  name: string;
  funder: string;
  /** Empty means open to students heading anywhere in the catalogue. */
  countries: CountryCode[];
  levels: Level[];
  /** "full" covers fees and living; "partial" is a fee discount. */
  cover: "full" | "partial" | "fee-waiver";
  value: string;
  /** Roughly when applications close. */
  window: string;
  eligibility: string[];
  nepalNote?: string;
  site: string;
  /**
   * Indicative worth in NPR. A "full" award is valued at the tuition and living
   * it removes, which is the number a family actually cares about. But it is
   * an estimate built from typical course costs, not a figure the funder
   * publishes, and the page says so.
   */
  valueNprLow: number;
  valueNprHigh: number;
  /** How many people realistically get one. */
  competitiveness: "very-high" | "high" | "moderate" | "accessible";
  /** The steps, in order, with the one people leave too late marked. */
  howToApply: string[];
  /** Who actually wins these, as opposed to who is eligible. */
  whoWins: string;
};

export const SCHOLARSHIPS: Scholarship[] = [
  {
    id: "australia-awards", name: "Australia Awards Scholarships", funder: "Australian Government",
    countries: ["AU"], levels: ["masters"], cover: "full",
    value: "Full tuition, return airfare, establishment allowance and living stipend",
    window: "Applications usually open February, close April/May",
    eligibility: ["Nepali citizen resident in Nepal", "Bachelors degree with strong results", "Two years' relevant work experience is usually expected", "Must return to Nepal for two years after the award"],
    nepalNote: "Nepal is a participating country and has its own annual allocation. Priority sectors change each round, check the Nepal profile page.",
    site: "https://www.dfat.gov.au/people-to-people/australia-awards",
    valueNprLow: 11000000,
    valueNprHigh: 13500000,
    competitiveness: "very-high",
    whoWins: "Mid-career professionals in Nepal's priority sectors who can show what they will change on return, not the highest GPA in the room.",
    howToApply: [
      "Read the Nepal country profile when it opens, usually February, the priority sectors change each round and applying outside them wastes the attempt.",
      "Get your two years of relevant work experience documented with dated employment letters.",
      "Draft the development-impact answers early; these carry more weight than grades.",
      "Submit before the April or May close. Late is not accepted.",
      "Expect an interview if shortlisted.",
    ],
  },
  {
    id: "destination-australia", name: "Destination Australia", funder: "Australian Government",
    countries: ["AU"], levels: ["diploma", "bachelors", "masters"], cover: "partial",
    value: "Up to AUD 15,000 a year",
    window: "Applied for through the institution, alongside admission",
    eligibility: ["Studying at a regional campus", "Applied via a participating provider"],
    nepalNote: "Only for regional postcodes, which also carry longer post-study work rights.",
    site: "https://www.education.gov.au/destination-australia",
    valueNprLow: 1200000,
    valueNprHigh: 1400000,
    competitiveness: "moderate",
    whoWins: "Students already committed to regional study. It is a discount rather than a competition.",
    howToApply: [
      "Choose a course at a regional campus at a participating provider.",
      "Apply for admission. The scholarship is assessed alongside it, not separately.",
      "Ask the institution directly which of their courses carry it this intake.",
    ],
  },
  {
    id: "chevening", name: "Chevening Scholarships", funder: "UK Foreign, Commonwealth & Development Office",
    countries: ["UK"], levels: ["masters"], cover: "full",
    value: "Full tuition, living allowance, flights and visa costs",
    window: "Opens August, closes early November",
    eligibility: ["Nepali citizen", "Undergraduate degree", "At least two years (2,800 hours) of work experience", "Return to Nepal for two years after the course"],
    nepalNote: "Nepal has a dedicated allocation and an active alumni network in Kathmandu. Leadership evidence matters more than grades.",
    site: "https://www.chevening.org",
    valueNprLow: 5000000,
    valueNprHigh: 6500000,
    competitiveness: "very-high",
    whoWins: "People with a demonstrable record of leading something, however small. Grades matter far less than evidence of influence.",
    howToApply: [
      "Open your application in August. Do not start in October.",
      "Count your work hours precisely, 2,800 is a hard floor and it is checked.",
      "Write the leadership and networking essays about specific things you did, with names and outcomes.",
      "Choose three eligible one-year masters courses.",
      "Submit by the early-November close, then wait for a February interview.",
    ],
  },
  {
    id: "commonwealth-shared", name: "Commonwealth Shared Scholarships", funder: "Commonwealth Scholarship Commission",
    countries: ["UK"], levels: ["masters"], cover: "full",
    value: "Tuition, airfare and a living stipend",
    window: "Through participating universities, usually December to February",
    eligibility: ["Citizen of an eligible Commonwealth country including Nepal", "Would not otherwise be able to afford to study in the UK", "Applied to a participating course"],
    site: "https://cscuk.fcdo.gov.uk",
    valueNprLow: 4500000,
    valueNprHigh: 6000000,
    competitiveness: "very-high",
    whoWins: "Applicants from lower-income backgrounds with strong academics and a clear development purpose.",
    howToApply: [
      "Find a participating university and a participating course. The list is short and changes.",
      "Apply to the university first; the scholarship application usually runs through them.",
      "Show clearly that you could not otherwise afford to study in the UK. This is an explicit criterion.",
    ],
  },
  {
    id: "great", name: "GREAT Scholarships", funder: "British Council and UK universities",
    countries: ["UK"], levels: ["masters"], cover: "partial",
    value: "£10,000 towards tuition for a one-year masters",
    window: "Varies by university, generally opens in the spring",
    eligibility: ["Citizen of a participating country", "Applied to a participating university"],
    nepalNote: "Nepal has been a participating country in recent rounds; the list is republished each year.",
    site: "https://study-uk.britishcouncil.org/scholarships/great-scholarships",
    valueNprLow: 1780000,
    valueNprHigh: 1780000,
    competitiveness: "high",
    whoWins: "Solid applicants to participating universities. Less about exceptional achievement than about applying on time.",
    howToApply: [
      "Check the British Council list for participating universities in the current round.",
      "Apply to that university for admission first.",
      "Apply for the GREAT award through the university's own process, usually in the spring.",
    ],
  },
  {
    id: "fulbright", name: "Fulbright Foreign Student Program", funder: "US Department of State",
    countries: ["US"], levels: ["masters"], cover: "full",
    value: "Tuition, living stipend, health cover and airfare",
    window: "Nepal round usually opens in the first half of the year",
    eligibility: ["Nepali citizen", "Bachelors degree", "Strong academic record and clear research or study plan", "Return to Nepal after the award"],
    nepalNote: "Administered in Kathmandu by the US Educational Foundation in Nepal (USEF-Nepal), who also advise on applications free of charge.",
    site: "https://foreign.fulbrightonline.org",
    valueNprLow: 6000000,
    valueNprHigh: 9000000,
    competitiveness: "very-high",
    whoWins: "Applicants with a clear research or study purpose that connects to something Nepal needs, and who intend to come back.",
    howToApply: [
      "Watch USEF-Nepal for the Nepal round opening, usually in the first half of the year.",
      "Take their free advising. They run sessions in Kathmandu and they know what wins.",
      "Prepare a specific, researched study objective rather than a general ambition.",
      "Expect a written application, then an interview panel.",
    ],
  },
  {
    id: "vanier", name: "Vanier Canada Graduate Scholarships", funder: "Government of Canada",
    countries: ["CA"], levels: ["masters"], cover: "full",
    value: "CAD 50,000 a year for three years",
    window: "Nominations through the university, usually closing in the autumn",
    eligibility: ["Doctoral study", "Nominated by a Canadian institution", "Outstanding academic and leadership record"],
    nepalNote: "Doctoral only. Not for a taught masters. You must be nominated, not apply directly.",
    site: "https://vanier.gc.ca",
    valueNprLow: 10500000,
    valueNprHigh: 15000000,
    competitiveness: "very-high",
    whoWins: "Doctoral candidates with a research record and an academic sponsor already in place. Not for taught masters.",
    howToApply: [
      "Identify a Canadian institution and a supervisor first. You cannot apply directly.",
      "Secure their agreement to nominate you.",
      "Work to the university's internal deadline, which is months before the national one.",
    ],
  },
  {
    id: "ca-entrance", name: "University entrance scholarships", funder: "Individual Canadian institutions",
    countries: ["CA"], levels: ["diploma", "bachelors", "masters"], cover: "partial",
    value: "Typically CAD 2,000 to 10,000 in year one",
    window: "Automatic with admission at many institutions",
    eligibility: ["Strong final-year results", "Applied by the early admission deadline"],
    nepalNote: "The most realistic funding for most Nepali applicants to Canada. Applying early matters more than the essay.",
    site: "https://www.educanada.ca/scholarships-bourses/index.aspx",
    valueNprLow: 200000,
    valueNprHigh: 1000000,
    competitiveness: "accessible",
    whoWins: "Almost anyone with good final-year results who applies early. This is where most Nepali students actually get money.",
    howToApply: [
      "Apply for admission early. Many entrance awards are automatic for applications received by the early deadline.",
      "Check whether the institution requires a separate scholarship form. Some do, some do not.",
      "Ask the admissions office directly what is available for international students this intake.",
    ],
  },
  {
    id: "nz-manaaki", name: "Manaaki New Zealand Scholarships", funder: "New Zealand Government",
    countries: ["NZ"], levels: ["masters"], cover: "full",
    value: "Tuition, living allowance, establishment grant and travel",
    window: "Usually opens in the first quarter",
    eligibility: ["Citizen of an eligible developing country including Nepal", "At least two years' work experience", "Commit to returning home for two years"],
    site: "https://www.nzscholarships.govt.nz",
    valueNprLow: 7000000,
    valueNprHigh: 9500000,
    competitiveness: "very-high",
    whoWins: "Professionals from eligible developing countries with a concrete plan for applying the qualification at home.",
    howToApply: [
      "Watch for the round opening, usually in the first quarter.",
      "Document at least two years of relevant work experience.",
      "Build the application around what you will do in Nepal afterwards. The two-year return commitment is central, not a formality.",
    ],
  },
  {
    id: "ie-government", name: "Government of Ireland International Education Scholarships", funder: "Higher Education Authority, Ireland",
    countries: ["IE"], levels: ["bachelors", "masters"], cover: "partial",
    value: "€10,000 stipend plus a fee waiver for one year",
    window: "Usually opens in the spring",
    eligibility: ["Non-EU/EEA student", "Offer of a place on an eligible course", "Outstanding academic record"],
    site: "https://hea.ie",
    valueNprLow: 2800000,
    valueNprHigh: 3400000,
    competitiveness: "high",
    whoWins: "High academic achievers with an offer already in hand.",
    howToApply: [
      "Secure an offer on an eligible course first.",
      "Apply through the Higher Education Authority process when it opens, usually in spring.",
      "Present an outstanding academic record. This one really is grade-driven.",
    ],
  },
  {
    id: "merit-general", name: "Institutional merit scholarships", funder: "Individual universities in every destination",
    countries: ["AU", "NZ", "UK", "IE", "US", "CA"], levels: ["diploma", "bachelors", "masters"], cover: "fee-waiver",
    value: "Commonly 10% to 50% off tuition",
    window: "Applied for with admission; some are automatic",
    eligibility: ["Above the course's minimum entry requirement", "Applied before the scholarship deadline, which is usually earlier than the admission deadline"],
    nepalNote: "This is where most Nepali students actually get money. Ask your counsellor which of their partner institutions are offering fee reductions this intake, it changes every cycle.",
    site: "",
    valueNprLow: 300000,
    valueNprHigh: 2500000,
    competitiveness: "accessible",
    whoWins: "Anyone above the course minimum who applies in time. The single most winnable money on this page.",
    howToApply: [
      "Ask your consultancy which partner institutions are discounting this intake, it changes every cycle.",
      "Apply before the scholarship deadline, which is usually earlier than the admission deadline.",
      "Where a form exists, fill it in. Many students simply never apply.",
    ],
  },
];


export const scholarshipById = (id: string) => SCHOLARSHIPS.find((s) => s.id === id);

export const COMPETITIVENESS: Record<Scholarship["competitiveness"], { label: string; note: string }> = {
  "very-high": { label: "Very competitive", note: "A small number of awards nationally. Worth attempting, never worth depending on." },
  high: { label: "Competitive", note: "Realistic for a strong application submitted on time." },
  moderate: { label: "Achievable", note: "More about meeting the conditions than beating other people." },
  accessible: { label: "Widely available", note: "Most eligible students who apply on time get something." },
};
