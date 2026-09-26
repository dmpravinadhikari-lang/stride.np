import type { CountryCode } from "@/lib/countries";

/**
 * The process, as it actually runs from Nepal.
 *
 * `leadDays` is how many days BEFORE the intake this should be finished. That
 * is what turns a to-do list into a schedule: give the platform an intake month
 * and every step gets a real date, working backwards.
 *
 * The lead times are the realistic ones, not the official ones, an NOC is
 * "issued in a few days" on paper and takes two weeks in practice when the
 * queue is long.
 */
export type Step = {
  id: string;
  title: string;
  detail: string;
  phase: "Decide" | "English test" | "Apply" | "Offer" | "Visa" | "Before you fly";
  leadDays: number;
  /** Roughly how long the step itself takes, so a student can start in time. */
  takesDays: number;
  countries?: CountryCode[];
  /** Where in OfficeYak this step gets done. */
  href?: string;
  /** Why it bites people. */
  warning?: string;
};

export const STEPS: Step[] = [
  // ------------------------------------------------------------------ decide
  { id: "choose-country", title: "Settle on a country and a course", detail: "Not a shortlist of five countries, one, with a second as a fallback. Everything after this depends on it.", phase: "Decide", leadDays: 400, takesDays: 14, href: "/app/universities" },
  { id: "check-cost", title: "Work out the real cost", detail: "Tuition, living, visa, flights, and the balance the embassy will ask to see. Do this before anyone pays a consultancy fee.", phase: "Decide", leadDays: 395, takesDays: 1, href: "/app/cost", warning: "Families routinely budget for tuition alone and discover the living-cost requirement at visa stage." },
  { id: "shortlist", title: "Shortlist six to eight institutions", detail: "A mix: two that are a stretch, four realistic, two safe.", phase: "Decide", leadDays: 380, takesDays: 14, href: "/app/universities" },
  { id: "scholarships", title: "Check what funding you could apply for", detail: "Most big scholarships close 8 to 12 months before the intake, long before you would normally think about them.", phase: "Decide", leadDays: 370, takesDays: 7, href: "/app/scholarships", warning: "Chevening, Australia Awards and Fulbright all close roughly a year ahead. Miss it and it is a year's wait." },

  // ------------------------------------------------------------ english test
  { id: "mock-test", title: "Sit a full practice test", detail: "Find out where you actually are before you pay for the real one.", phase: "English test", leadDays: 330, takesDays: 1, href: "/app/mock-tests" },
  { id: "book-test", title: "Book the IELTS or PTE date", detail: "Book once your practice band is at or above what your shortlist needs. Slots in Kathmandu fill weeks ahead.", phase: "English test", leadDays: 300, takesDays: 30 },
  { id: "sit-test", title: "Sit the test", detail: "Results take about two weeks for IELTS on paper, faster for computer-based and PTE.", phase: "English test", leadDays: 270, takesDays: 14, warning: "Leave room to resit. One attempt with no margin is how intakes get missed." },

  // ------------------------------------------------------------------- apply
  { id: "academic-docs", title: "Collect and attest academic documents", detail: "Transcripts, certificates, migration and character certificate. Attestation takes longer than anyone expects.", phase: "Apply", leadDays: 260, takesDays: 21, href: "/app/documents" },
  { id: "write-sop", title: "Write your statement", detail: "Draft it, get it scored, rewrite it in your own words. Not a one-evening job.", phase: "Apply", leadDays: 250, takesDays: 14, href: "/app/sop" },
  { id: "apply-unis", title: "Send the applications", detail: "Apply to your whole shortlist, not just the favourite. Offers are not guaranteed and deadlines do not move.", phase: "Apply", leadDays: 230, takesDays: 14 },
  { id: "loan-start", title: "Start the education loan process", detail: "Valuation, collateral papers and bank approval. This is the longest pole in the tent.", phase: "Apply", leadDays: 220, takesDays: 45, warning: "A land valuation plus bank sanction commonly takes six weeks in Nepal. Starting it after the offer arrives is already late." },
  { id: "bank-balance", title: "Get the money into the account and leave it there", detail: "Most destinations want the balance held for a minimum period before you apply.", phase: "Apply", leadDays: 180, takesDays: 30, href: "/app/documents", warning: "The UK requires 28 consecutive days. Money moved in the week before you apply will be rejected." },

  // ------------------------------------------------------------------- offer
  { id: "accept-offer", title: "Accept the offer and pay the deposit", detail: "Usually the first instalment of tuition, sometimes a set deposit.", phase: "Offer", leadDays: 150, takesDays: 7 },
  { id: "noc", title: "Get the NOC from the Ministry of Education", detail: "Required before a Nepali bank will release fees abroad. Take the offer letter, academic documents and the fee receipt.", phase: "Offer", leadDays: 140, takesDays: 14, warning: "No NOC, no bank transfer. Everything downstream stops here." },
  { id: "health-cover", title: "Arrange health cover", detail: "OSHC for Australia, the IHS payment for the UK, provincial or private cover for Canada.", phase: "Offer", leadDays: 130, takesDays: 3 },
  { id: "coe", title: "Get your CoE", detail: "Issued once tuition and OSHC are paid. The visa application needs it.", phase: "Offer", leadDays: 125, takesDays: 10, countries: ["AU"] },
  { id: "cas", title: "Credibility interview, then your CAS", detail: "Most UK universities interview Nepali applicants before issuing the CAS.", phase: "Offer", leadDays: 125, takesDays: 14, countries: ["UK"], href: "/app/interview" },
  { id: "i20", title: "Get the I-20 and pay the SEVIS fee", detail: "The I-20 sets the funds figure you must show at the interview.", phase: "Offer", leadDays: 125, takesDays: 14, countries: ["US"] },
  { id: "pal-gic", title: "Get the PAL and open the GIC", detail: "The attestation letter comes from the province; the GIC satisfies the living-cost requirement.", phase: "Offer", leadDays: 125, takesDays: 14, countries: ["CA"] },

  // -------------------------------------------------------------------- visa
  { id: "visa-file", title: "Assemble the visa file", detail: "Every financial document, the offer, the NOC, and the statement. Run the document check before you submit.", phase: "Visa", leadDays: 110, takesDays: 10, href: "/app/documents" },
  { id: "practise-interview", title: "Practise the interview", detail: "Whether it is a consular interview or a university credibility call, rehearse it until the funding answers are automatic.", phase: "Visa", leadDays: 105, takesDays: 7, href: "/app/interview", warning: "The most common reason a well-funded application fails is a student who cannot quote their own numbers." },
  { id: "medical", title: "Medical examination", detail: "Only at a panel physician the destination recognises. Book early, appointments are limited in Kathmandu.", phase: "Visa", leadDays: 100, takesDays: 10 },
  { id: "police", title: "Police clearance report", detail: "From Nepal Police, and from any other country you have lived in.", phase: "Visa", leadDays: 100, takesDays: 10 },
  { id: "lodge-visa", title: "Lodge the visa application", detail: "Online, then biometrics at the visa application centre.", phase: "Visa", leadDays: 90, takesDays: 7 },
  { id: "visa-wait", title: "Wait for the decision", detail: "Processing times vary enormously by destination and by season. Do not book a non-refundable flight yet.", phase: "Visa", leadDays: 45, takesDays: 45, warning: "Booking a flight before the visa is granted is the most expensive mistake in this list." },

  // --------------------------------------------------------- before you fly
  { id: "flight", title: "Book the flight", detail: "Once the visa is granted. Give yourself a few days on the ground before orientation.", phase: "Before you fly", leadDays: 30, takesDays: 3 },
  { id: "accommodation", title: "Arrange the first month's accommodation", detail: "Book something for the first few weeks rather than signing a year's lease from Kathmandu.", phase: "Before you fly", leadDays: 25, takesDays: 7 },
  { id: "forex", title: "Sort money for the first weeks", detail: "Forex approval, a card that works abroad, and enough cash to land with.", phase: "Before you fly", leadDays: 20, takesDays: 7 },
  { id: "carry-docs", title: "Pack the documents you must hand-carry", detail: "Offer letter, CoE or CAS or I-20, financial documents, academic originals, medical report. Never in checked baggage.", phase: "Before you fly", leadDays: 7, takesDays: 1 },
  { id: "briefing", title: "Pre-departure briefing", detail: "Part-time work rules, tax file number, opening a bank account, reporting requirements.", phase: "Before you fly", leadDays: 7, takesDays: 1 },
];

export const PHASES = ["Decide", "English test", "Apply", "Offer", "Visa", "Before you fly"] as const;

export const stepById = (id: string) => STEPS.find((s) => s.id === id);

export const stepsFor = (countryCode: string | null) =>
  STEPS.filter((s) => !s.countries || (countryCode && s.countries.includes(countryCode as CountryCode)));
