/**
 * The brand lives here and nowhere else, because the name and domain are not
 * settled yet. Changing these two lines renames the whole product, logo,
 * page titles, emails, footer.
 */
export const BRAND = {
  /** Shown in prose and page titles. */
  name: "Stride",
  /** The logo is the wordmark plus a cyan dot, drawn by the Logo component. */
  /** Capital S, as the logo sets it. The full stop is drawn, not typed. */
  wordmark: "Stride",
  /** Used in copy and, later, for consultancy subdomains. */
  domain: "stride.com.np",
  /* From docs/brand/BRAND.md. One sentence, and it is about the consultancy
     rather than about software. */
  tagline: "Run your consultancy on intelligence, not instinct",
  oneLiner: "The operating system for education consultancies",
  /* The paragraph that goes everywhere the product is described at length:
     app store, directory listing, the first line of a proposal. */
  description:
    "Stride brings every part of a consultancy into one system, enquiries, " +
    "admissions, classes and attendance, IELTS and PTE mocks, mock interviews, " +
    "statements and CVs, scholarships, staff and payroll, and turns it into " +
    "decisions: which enquiry to ring next, which student is falling behind, " +
    "which office needs help.",
} as const;
