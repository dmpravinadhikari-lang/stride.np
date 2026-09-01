import type { CountryCode } from "@/lib/countries";

/**
 * The things Nepali families actually argue about when choosing a country, and
 * which almost never appear side by side anywhere.
 *
 * Two kinds of value live here and the screen distinguishes them: published
 * rules (visa type, funds required, work hours) and judgements or approximations
 * (community size, earning potential, how hard PR is). The second kind is
 * labelled as indicative, because a family should not treat a rough salary band
 * the way they treat a legal threshold.
 */
export type Verdict = "strong" | "fair" | "weak";

export type Profile = {
  postStudyWork: string;
  postStudyVerdict: Verdict;
  workDuringStudy: string;
  dependants: string;
  /** Roughly how large and established the Nepali community is. Approximate. */
  community: string;
  communityVerdict: Verdict;
  /** Typical graduate starting salary, indicative and before tax. */
  earning: string;
  earningVerdict: Verdict;
  /** How realistic permanent residence is after study. */
  pr: string;
  prVerdict: Verdict;
  /** The current direction of travel for student visas. */
  policy: string;
  policyVerdict: Verdict;
  weather: string;
  studyNote: string;
  watchOut: string;
};

export const AFTER_STUDY: Record<CountryCode, Profile> = {
  AU: {
    postStudyWork: "Temporary Graduate visa (485), commonly 2 to 3 years; longer after regional study.",
    postStudyVerdict: "strong",
    workDuringStudy: "Capped fortnightly hours in term, unrestricted in scheduled breaks.",
    dependants: "Partner can be included; their work rights depend on your course level.",
    community: "The largest Nepali student population anywhere, concentrated in Sydney, Melbourne and Brisbane. Finding a room, a job or dal bhat is easy.",
    communityVerdict: "strong",
    earning: "Graduate salaries commonly AUD 60,000–75,000; hospitality and care work pay well by the hour while studying.",
    earningVerdict: "strong",
    pr: "A real pathway through skilled occupation lists and state nomination, but competitive and the lists change.",
    prVerdict: "fair",
    policy: "Tightening. Refusal rates for Nepali applicants rose sharply into 2026 and the Genuine Student test is applied strictly.",
    policyVerdict: "weak",
    weather: "Warm to hot. Sydney and Brisbane are humid in summer; Melbourne is changeable and cooler.",
    studyNote: "Strong in IT, nursing, engineering and accounting, with a wide spread of institutions at different entry bars.",
    watchOut: "The Genuine Student assessment looks hard at whether the course follows from your history. A sharp change of field needs a real explanation.",
  },
  NZ: {
    postStudyWork: "Post Study Work visa, commonly up to 3 years depending on level and where you studied.",
    postStudyVerdict: "strong",
    workDuringStudy: "Limited hours in term for eligible students.",
    dependants: "Possible for higher-level study.",
    community: "Established but much smaller than Australia, mostly in Auckland.",
    communityVerdict: "fair",
    earning: "Graduate salaries commonly NZD 55,000–70,000. A smaller job market means fewer openings per field.",
    earningVerdict: "fair",
    pr: "Residence pathways exist and are relatively transparent, but tied to skilled work you must actually find.",
    prVerdict: "fair",
    policy: "Comparatively stable, with less of the abrupt change seen elsewhere.",
    policyVerdict: "strong",
    weather: "Mild and wet. Cooler than Australia, rarely extreme in either direction.",
    studyNote: "Good in agriculture, environmental science, IT and hospitality.",
    watchOut: "Smaller economy. Where you study matters more than it does in Australia because the job market is thinner.",
  },
  UK: {
    postStudyWork: "Graduate Route: 2 years after a bachelors or masters, 3 after a doctorate.",
    postStudyVerdict: "fair",
    workDuringStudy: "Up to 20 hours a week in term for degree-level study.",
    dependants: "Not permitted for most taught masters courses.",
    community: "Large and growing quickly, spread across London, Manchester, Birmingham and the north.",
    communityVerdict: "strong",
    earning: "Graduate salaries commonly £26,000–35,000 outside London, higher inside it — but so is rent.",
    earningVerdict: "fair",
    pr: "Harder. The Graduate Route does not lead to settlement on its own; you must move onto a sponsored work visa.",
    prVerdict: "weak",
    policy: "Restrictive on dependants and under continuing review, though the one-year masters remains attractive.",
    policyVerdict: "fair",
    weather: "Cool, grey and wet for much of the year. Short winter days are a genuine adjustment.",
    studyNote: "One-year masters is the big draw — a full qualification for one year of fees and living costs.",
    watchOut: "Most universities interview Nepali applicants before issuing the CAS, and the maintenance money must sit untouched for 28 days.",
  },
  IE: {
    postStudyWork: "Third Level Graduate Programme, commonly up to 2 years after a masters.",
    postStudyVerdict: "fair",
    workDuringStudy: "20 hours a week in term, 40 in holiday periods.",
    dependants: "Limited.",
    community: "Small but growing, almost entirely around Dublin.",
    communityVerdict: "weak",
    earning: "Graduate salaries commonly €32,000–42,000, with strong demand in tech and pharma.",
    earningVerdict: "strong",
    pr: "Possible through employment permits and long residence, but a longer road than Australia or Canada.",
    prVerdict: "fair",
    policy: "Stable, and English-speaking inside the EU.",
    policyVerdict: "strong",
    weather: "Mild, damp and grey. Similar to the UK, slightly wetter.",
    studyNote: "Strong in technology, pharmaceuticals and medical devices, with the big employers physically present.",
    watchOut: "Dublin accommodation is genuinely scarce and expensive. Budget for it honestly or you will be commuting from far out.",
  },
  US: {
    postStudyWork: "OPT for 12 months, extended to 36 for eligible STEM fields.",
    postStudyVerdict: "strong",
    workDuringStudy: "On-campus only in the first year, and limited hours.",
    dependants: "F-2 dependants may not work.",
    community: "Large and long-established, but spread thinly across a very big country.",
    communityVerdict: "fair",
    earning: "The highest ceiling of any destination here, particularly in technology — and the widest spread between fields.",
    earningVerdict: "strong",
    pr: "Difficult and slow. Employer sponsorship, then a green card queue that can run for years.",
    prVerdict: "weak",
    policy: "The hardest right now. Refusal rates for Nepali F-1 applicants rose to around 81% in 2025, and very few Nepali students went in 2026.",
    policyVerdict: "weak",
    weather: "Everything, depending on the state. Check the specific city, not the country.",
    studyNote: "Unmatched range and research funding, and the widest gap between the best and worst institutions.",
    watchOut: "The F-1 is a non-immigrant visa. Any hint that you intend to stay permanently is held against you at the interview.",
  },
  CA: {
    postStudyWork: "Post-Graduation Work Permit, length tied to course length — but eligibility now depends on your field of study.",
    postStudyVerdict: "fair",
    workDuringStudy: "Capped weekly hours off campus during term.",
    dependants: "Spouse work permits have been restricted for many study levels.",
    community: "Very large and growing fastest, concentrated in Ontario, Alberta and British Columbia.",
    communityVerdict: "strong",
    earning: "Graduate salaries commonly CAD 50,000–65,000. Cost of living in Toronto and Vancouver eats a lot of it.",
    earningVerdict: "fair",
    pr: "Historically the clearest route of any destination here, through Express Entry and provincial nomination — though the bar has risen.",
    prVerdict: "strong",
    policy: "Volatile. Study permit caps, the end of SDS and changed PGWP field rules have all landed in quick succession.",
    policyVerdict: "weak",
    weather: "Long, genuinely cold winters. This is the single thing Nepali students most underestimate.",
    studyNote: "Colleges offer practical, employment-focused diplomas; universities the traditional route. The choice affects your work permit.",
    watchOut: "PGWP field-of-study rules changed and not every college programme still qualifies. Confirm before you pay a deposit.",
  },
};

/** The rows the comparison renders, in the order a family actually argues about them. */
export const COMPARE_ROWS = [
  { key: "cost", label: "Cost of the whole course", kind: "computed" as const },
  { key: "mustShow", label: "Money you must show", kind: "computed" as const },
  { key: "visa", label: "Visa", kind: "computed" as const },
  { key: "policy", label: "Immigration climate right now", kind: "verdict" as const },
  { key: "postStudyWork", label: "Work after you graduate", kind: "verdict" as const },
  { key: "pr", label: "Chance of permanent residence", kind: "verdict" as const },
  { key: "earning", label: "Earning potential", kind: "verdict" as const },
  { key: "community", label: "Nepali community", kind: "verdict" as const },
  { key: "workDuringStudy", label: "Work while studying", kind: "plain" as const },
  { key: "dependants", label: "Bringing family", kind: "plain" as const },
  { key: "studyNote", label: "What it is good at", kind: "plain" as const },
  { key: "weather", label: "Weather", kind: "plain" as const },
];
