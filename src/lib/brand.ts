/**
 * The brand lives here and nowhere else. Changing these lines renames the
 * whole product: the logo, page titles, every email, the footer, and the
 * address each consultancy is given.
 */
export const BRAND = {
  /** Shown in prose and page titles. */
  name: "OfficeYak",
  /** How the wordmark is set. */
  wordmark: "OfficeYak",
  /** Used in copy, and for each consultancy's own subdomain. */
  domain: "officeyak.com",
  tagline: "Run your consultancy on intelligence, not instinct",
  oneLiner: "The operating system for education consultancies",
  /* The paragraph that goes everywhere the product is described at length:
     app store, directory listing, the first line of a proposal. */
  description:
    "OfficeYak brings every part of a consultancy into one system, enquiries, " +
    "admissions, classes and attendance, IELTS and PTE mocks, mock interviews, " +
    "statements and CVs, scholarships, staff and payroll, and turns it into " +
    "decisions: which enquiry to ring next, which student is falling behind, " +
    "which office needs help.",
} as const;
