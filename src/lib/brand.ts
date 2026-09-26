/**
 * The brand lives here and nowhere else. Changing these lines renames the
 * whole product: the logo, page titles, every email, the footer, and the
 * address each consultancy is given.
 *
 * The wording is the brand book's, verbatim, so the product and the guidelines
 * cannot drift apart.
 */
export const BRAND = {
  /** One word, capital O and Y. Never "Office Yak", never "OY". */
  name: "OfficeYak",
  wordmark: "OfficeYak",
  domain: "officeyak.com",
  oneLiner: "The AI-powered operating system for education consultancies.",
  tagline: "Carries the whole office. Climbs with you.",
  description:
    "OfficeYak is the operating system for education consultancies, the yak " +
    "that carries the whole office. Leads, admissions, classes and " +
    "attendance, IELTS and PTE mock tests, AI mock interviews, SOPs and CVs, " +
    "scholarships, HR and payroll all ride on one system, and that data " +
    "becomes decisions: which lead to call next, which student is falling " +
    "behind, which branch needs help. Built in Nepal, for consultancies that " +
    "want to climb like the best in the world.",
  /** How the product speaks when it is the machine talking, not a person. */
  aiVoicePrefix: "Yak says:",
} as const;
