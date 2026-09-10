import type { CountryCode } from "@/lib/countries";

/**
 * The documents a Nepali student actually has to produce, in the words their
 * consultancy and their bank use.
 *
 * `sensitive` marks the ones that carry real risk if they leak, passports and
 * anything financial. Those are the ones the retention rule deletes.
 */
export type DocKind = {
  id: string;
  label: string;
  category: "Identity" | "Academic" | "English" | "Financial" | "Institutional" | "Health & character";
  hint: string;
  sensitive: boolean;
  /** Omitted means every destination needs it. */
  countries?: CountryCode[];
  /** Not needed until the student reaches this stage. */
  fromStage?: "counselling" | "test_prep" | "applying" | "offer" | "visa";
};

export const DOC_KINDS: DocKind[] = [
  { id: "passport", label: "Passport", category: "Identity", sensitive: true,
    hint: "Photo page. Must be valid well past your course end date." },
  { id: "photo", label: "Passport photographs", category: "Identity", sensitive: false,
    hint: "Recent, white background, to the destination's size rules." },
  { id: "citizenship", label: "Citizenship certificate", category: "Identity", sensitive: true,
    hint: "Both sides, with an English translation." },

  { id: "see", label: "SEE certificate and marksheet", category: "Academic", sensitive: false,
    hint: "Class 10. Needed even for masters applications." },
  { id: "plus_two", label: "+2 certificate and transcript", category: "Academic", sensitive: false,
    hint: "Higher secondary, both the character certificate and the transcript." },
  { id: "bachelors", label: "Bachelors transcript and certificate", category: "Academic", sensitive: false,
    hint: "Provisional is accepted while the original is pending.", fromStage: "counselling" },
  { id: "migration", label: "Migration and character certificate", category: "Academic", sensitive: false,
    hint: "From your last institution." },
  { id: "cv", label: "CV", category: "Academic", sensitive: false, hint: "One or two pages, with dates that match your transcripts." },
  { id: "recommendation", label: "Recommendation letters", category: "Academic", sensitive: false,
    hint: "Usually two, on letterhead, signed.", fromStage: "applying" },
  { id: "experience", label: "Work experience letters", category: "Academic", sensitive: false,
    hint: "Only if you are claiming experience. Must state dates and role." },

  { id: "english_test", label: "IELTS / PTE / TOEFL result", category: "English", sensitive: false,
    hint: "The official Test Report Form, not a screenshot.", fromStage: "test_prep" },
  { id: "moi", label: "Medium of Instruction letter", category: "English", sensitive: false,
    hint: "Only where the university accepts MOI instead of a test." },

  { id: "bank_balance", label: "Bank balance certificate", category: "Financial", sensitive: true,
    hint: "Recent. Most posts want the balance held for a minimum period.", fromStage: "applying" },
  { id: "bank_statement", label: "Bank statement", category: "Financial", sensitive: true,
    hint: "Usually the last six to twelve months.", fromStage: "applying" },
  { id: "loan_approval", label: "Education loan approval", category: "Financial", sensitive: true,
    hint: "From the bank, stating the sanctioned amount.", fromStage: "applying" },
  { id: "property_valuation", label: "Property valuation", category: "Financial", sensitive: true,
    hint: "Where land is the collateral. Engineer's valuation plus the lalpurja." },
  { id: "sponsor_income", label: "Sponsor source of income", category: "Financial", sensitive: true,
    hint: "Salary certificate, business registration, or farm income verification." },
  { id: "tax_clearance", label: "Sponsor tax clearance", category: "Financial", sensitive: true,
    hint: "From the IRD. Usually the last three years.", fromStage: "applying" },
  { id: "relationship", label: "Relationship certificate", category: "Financial", sensitive: true,
    hint: "From the ward office, proving the sponsor is who you say they are." },
  { id: "sponsor_letter", label: "Sponsorship declaration", category: "Financial", sensitive: true,
    hint: "Signed statement from the sponsor agreeing to fund you." },

  { id: "offer_letter", label: "Offer letter", category: "Institutional", sensitive: false,
    hint: "Conditional or unconditional.", fromStage: "offer" },
  { id: "fee_receipt", label: "Tuition fee receipt", category: "Institutional", sensitive: true,
    hint: "Proof the first instalment has been paid.", fromStage: "offer" },
  { id: "noc", label: "NOC from the Ministry of Education", category: "Institutional", sensitive: false,
    hint: "Required before your bank will release fees abroad.", fromStage: "offer" },
  { id: "coe", label: "CoE (Confirmation of Enrolment)", category: "Institutional", sensitive: false,
    hint: "Issued once fees and OSHC are paid.", countries: ["AU"], fromStage: "offer" },
  { id: "cas", label: "CAS statement", category: "Institutional", sensitive: false,
    hint: "Issued after the credibility interview.", countries: ["UK"], fromStage: "offer" },
  { id: "i20", label: "I-20", category: "Institutional", sensitive: false,
    hint: "Plus the SEVIS fee receipt.", countries: ["US"], fromStage: "offer" },
  { id: "pal", label: "Provincial Attestation Letter", category: "Institutional", sensitive: false,
    hint: "Required for most study permit applications.", countries: ["CA"], fromStage: "offer" },
  { id: "gic", label: "GIC certificate", category: "Institutional", sensitive: true,
    hint: "Guaranteed Investment Certificate, for the SDS route.", countries: ["CA"], fromStage: "offer" },

  { id: "medical", label: "Medical examination", category: "Health & character", sensitive: true,
    hint: "From a panel physician the destination recognises.", fromStage: "visa" },
  { id: "police", label: "Police clearance report", category: "Health & character", sensitive: false,
    hint: "From Nepal Police, sometimes from any country you have lived in.", fromStage: "visa" },
  { id: "insurance", label: "Health cover", category: "Health & character", sensitive: false,
    hint: "OSHC for Australia, IHS payment for the UK.", fromStage: "visa" },
];

export const kindById = (id: string) => DOC_KINDS.find((k) => k.id === id);

const STAGE_RANK: Record<string, number> = {
  enquiry: 0, counselling: 1, test_prep: 2, applying: 3, offer: 4, visa: 5, departed: 6, lost: 0,
};

/** What this particular student needs, given their country and how far along they are. */
export function requiredFor(countryCode: string | null, stage: string): DocKind[] {
  const rank = STAGE_RANK[stage] ?? 0;
  return DOC_KINDS.filter((k) => {
    if (k.countries && (!countryCode || !k.countries.includes(countryCode as CountryCode))) return false;
    if (k.fromStage && rank < STAGE_RANK[k.fromStage]) return false;
    return true;
  });
}

export const CATEGORIES = [
  "Identity", "Academic", "English", "Financial", "Institutional", "Health & character",
] as const;
