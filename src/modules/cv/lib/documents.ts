import { newCv, tidy, type Cv } from "./schema";

/**
 * Student documents, and how their contents become one CV.
 *
 * No server imports here: the UI needs the labels while it shows each file's
 * progress, and the merge runs in the browser because each file is uploaded on
 * its own request. That keeps every request short enough to show real progress
 * instead of one long spinner over ten certificates.
 *
 * The governing rule of this whole feature is what does NOT come off these
 * documents. A citizenship certificate carries a date of birth, a father's and
 * mother's name, a permanent address and a citizenship number; a passport
 * carries a date of birth and a passport number. Those are precisely the fields
 * the CV must not have, see the note in schema.ts, and they are also the
 * fields that make a stored copy a liability. So the reader is told to leave
 * them behind, the schema has nowhere to put them, the scrub in extract.ts
 * catches anything that slips through, and the student is shown a list of what
 * was seen and discarded.
 */

export type DocumentKind =
  | "transcript"
  | "certificate"
  | "test-report"
  | "experience-letter"
  | "recommendation"
  | "training"
  | "award"
  | "passport"
  | "citizenship"
  | "other"
  | "unreadable";

export type DocumentReport = {
  kind: DocumentKind;
  /** What it is, in one line, so the student can see it was read correctly. */
  summary: string;
  /** Fields seen on the document and deliberately left off the CV. */
  discarded: string[];
  confidence: "high" | "medium" | "low";
};

export type DocumentResult = DocumentReport & { cv: Cv };

export const documentLabels: Record<DocumentKind, string> = {
  transcript: "Transcript or marksheet",
  certificate: "Qualification certificate",
  "test-report": "Test score report",
  "experience-letter": "Experience letter",
  recommendation: "Recommendation letter",
  training: "Training certificate",
  award: "Award or scholarship letter",
  passport: "Passport",
  citizenship: "Citizenship certificate",
  other: "Other document",
  unreadable: "Could not be read",
};

/**
 * What each kind is actually worth, said plainly on the upload screen.
 *
 * Citizenship is the honest one. A student will upload it because it is the
 * document they think of first, and it contributes almost nothing to a CV, so
 * the screen says so rather than implying it helped.
 */
export const documentValue: Record<DocumentKind, string> = {
  transcript: "Qualification, board, institution, years and marks",
  certificate: "Qualification, awarding body and year",
  "test-report": "Test, overall score, band breakdown and date",
  "experience-letter": "Job title, employer, dates and what you did",
  recommendation: "Your role and what you were responsible for",
  training: "Course title, who issued it and the year",
  award: "The award, who gave it and the year",
  passport: "Only the spelling of your name. Nothing else.",
  citizenship: "Almost nothing a CV can use. Your name, and your district.",
  other: "Whatever of the above it happens to contain",
  unreadable: "Nothing",
};

/**
 * What can be uploaded, and how each one gets read.
 *
 *   "vision", a photograph. No text to extract, so it needs the model.
 *   "text", a Word file, an ODT, a plain text file. The text is in the file;
 *              no key and no network required.
 *   "either", a PDF. Exported from Word it has a text layer and is read as
 *              text; photographed or scanned it has none and needs the model.
 *
 * Word was missing from the first version entirely, which was absurd: an
 * experience letter is a Word file more often than it is anything else.
 */
export type ReadPath = "vision" | "text" | "either";

export const ACCEPTED_TYPES: Record<string, { mime: string; via: ReadPath }> = {
  jpg: { mime: "image/jpeg", via: "vision" },
  jpeg: { mime: "image/jpeg", via: "vision" },
  png: { mime: "image/png", via: "vision" },
  webp: { mime: "image/webp", via: "vision" },
  gif: { mime: "image/gif", via: "vision" },
  pdf: { mime: "application/pdf", via: "either" },
  doc: { mime: "application/msword", via: "text" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", via: "text" },
  odt: { mime: "application/vnd.oasis.opendocument.text", via: "text" },
  txt: { mime: "text/plain", via: "text" },
  rtf: { mime: "text/rtf", via: "text" },
}; 

/**
 * Per-file ceiling.
 *
 * The API's own limit is far higher, but a phone photograph of a certificate is
 * under 4MB and anything much larger is either a many-page PDF or a photograph
 * at a resolution no reader benefits from. Refusing early is faster for the
 * student than uploading 20MB over a Kathmandu connection first.
 */
export const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024;

/**
 * Formats the phone will hand over that the API cannot read.
 *
 * HEIC is the one that matters. Every iPhone saves photographs as HEIC by
 * default, so this is not an edge case. It is the single most likely upload
 * failure, and it deserves an instruction rather than "unsupported file type".
 */
export const UNSUPPORTED_HINTS: Record<string, string> = {
  heic: "iPhones save photos as HEIC, which we cannot read. In Photos, use Share then \"Save to Files\" and choose JPEG, or just email the photo to yourself, which converts it.",
  heif: "This is an iPhone photo format we cannot read. Share it as a JPEG instead.",
  tif: "TIFF is not readable here. Open it and save as JPEG or PDF.",
  tiff: "TIFF is not readable here. Open it and save as JPEG or PDF.",
  bmp: "BMP is not readable here. Save it as JPEG or PNG instead.",
  pages: "Apple Pages files cannot be read. In Pages, use File then Export To and choose PDF or Word.",
  zip: "That is a folder, not a document. Upload the files inside it.",
};

export function typeFor(filename: string): { mediaType?: string; via?: ReadPath; hint?: string } {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const known = ACCEPTED_TYPES[ext];
  if (known) return { mediaType: known.mime, via: known.via };
  if (UNSUPPORTED_HINTS[ext]) return { hint: UNSUPPORTED_HINTS[ext] };
  return {};
}

/** For the file picker's accept attribute and the copy beside it. */
export const ACCEPTED_EXTENSIONS = Object.keys(ACCEPTED_TYPES).map((e) => `.${e}`);

/**
 * Whose spelling of the name wins.
 *
 * The passport, always, when there is one. Every form a student fills from here
 * to the visa interview has to match the passport exactly, and a CV that says
 * "Sunita Gurung" against a passport reading "SUNITA GURUNG THAPA" is the kind
 * of small mismatch that turns into a query at the worst moment.
 */
const NAME_AUTHORITY: Record<DocumentKind, number> = {
  passport: 100,
  citizenship: 80,
  transcript: 60,
  certificate: 55,
  "test-report": 50,
  award: 30,
  recommendation: 30,
  "experience-letter": 30,
  training: 20,
  other: 10,
  unreadable: 0,
};

/** Loose equality for deduplication: case, spacing and punctuation ignored. */
const key = (...parts: string[]) =>
  parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** How many fields a row actually carries, used to pick the better duplicate. */
function weight(row: Record<string, unknown>): number {
  let n = 0;
  for (const value of Object.values(row)) {
    if (Array.isArray(value)) n += value.filter(Boolean).length;
    else if (String(value ?? "").trim()) n += 1;
  }
  return n;
}

/**
 * Merges rows into a list, keeping the fuller version of anything already there.
 *
 * Two documents describing the same thing is the normal case, not the edge one:
 * a student uploads both the marksheet and the certificate for the same degree,
 * and the marksheet has the grade while the certificate has the awarding body.
 * The result should be one entry with both, not two entries with one each.
 */
function mergeRows<T extends Record<string, unknown>>(
  existing: T[],
  incoming: T[],
  identity: (row: T) => string,
): T[] {
  const out = [...existing];
  for (const row of incoming) {
    const id = identity(row);
    if (!id) {
      out.push(row);
      continue;
    }
    const at = out.findIndex((have) => identity(have) === id);
    if (at < 0) {
      out.push(row);
      continue;
    }
    // Field by field, so the fuller of the two wins per field rather than
    // wholesale, the certificate's board and the marksheet's grade both
    // survive instead of one document's blanks overwriting the other's values.
    const merged = { ...out[at] } as T;
    for (const field of Object.keys(row) as (keyof T)[]) {
      const next = row[field];
      const have = merged[field];
      if (Array.isArray(next) && Array.isArray(have)) {
        const seen = new Set(have.map((v) => key(String(v))));
        merged[field] = [...have, ...next.filter((v) => !seen.has(key(String(v))))] as T[keyof T];
      } else if (!String(have ?? "").trim() && String(next ?? "").trim()) {
        merged[field] = next;
      }
    }
    out[at] = weight(merged) >= weight(out[at]) ? merged : out[at];
  }
  return out;
}

/** Newest first, which is the order every section of a CV is read in. */
function byRecency<T extends { end?: string; start?: string; year?: string }>(rows: T[]): T[] {
  const yearOf = (row: T) => {
    const text = `${row.end ?? ""} ${row.start ?? ""} ${row.year ?? ""}`;
    if (/present|current|ongoing/i.test(text)) return 9999;
    const years = text.match(/(19|20)\d{2}/g);
    return years ? Math.max(...years.map(Number)) : 0;
  };
  return [...rows].sort((a, b) => yearOf(b) - yearOf(a));
}

/**
 * Folds every document's fragment into one CV.
 *
 * Order does not matter to the caller: the name is decided by authority rather
 * than by which file finished uploading first, which matters because the
 * requests run in parallel and finish in whatever order the network decides.
 */
export function mergeDocuments(results: DocumentResult[]): Cv {
  let out: Cv = newCv();
  let nameFrom = -1;

  for (const { cv, kind } of results) {
    const authority = NAME_AUTHORITY[kind] ?? 0;
    if (cv.name.trim() && authority > nameFrom) {
      out.name = cv.name.trim();
      nameFrom = authority;
    }

    // Single-value fields: first non-empty wins, since nothing here has a
    // meaningful authority order the way the name does.
    for (const field of ["headline", "email", "phone", "location", "summary"] as const) {
      if (!out[field].trim() && cv[field].trim()) out[field] = cv[field];
    }

    out.links = mergeRows(out.links, cv.links, (r) => key(r.url));
    out.education = mergeRows(out.education, cv.education, (r) => key(r.qualification, r.institution || r.board));
    out.experience = mergeRows(out.experience, cv.experience, (r) => key(r.role, r.organisation));
    out.volunteering = mergeRows(out.volunteering, cv.volunteering, (r) => key(r.role, r.organisation));
    out.projects = mergeRows(out.projects, cv.projects, (r) => key(r.title));
    out.tests = mergeRows(out.tests, cv.tests, (r) => key(r.name));
    out.certifications = mergeRows(out.certifications, cv.certifications, (r) => key(r.title));
    out.publications = mergeRows(out.publications, cv.publications, (r) => key(r.title));
    out.awards = mergeRows(out.awards, cv.awards, (r) => key(r.title));
    out.languages = mergeRows(out.languages, cv.languages, (r) => key(r.language));
    out.skills = mergeRows(out.skills, cv.skills, (r) => key(r.group));
    out.referees = mergeRows(out.referees, cv.referees, (r) => key(r.name));
  }

  out.education = byRecency(out.education);
  out.experience = byRecency(out.experience);
  out.volunteering = byRecency(out.volunteering);
  out.certifications = byRecency(out.certifications);
  out.awards = byRecency(out.awards);

  out = tidy(out);
  return out;
}

/**
 * Merges documents into a CV the student has already started.
 *
 * Anything they typed themselves stays: a document can fill a blank field and
 * add a row, but it never overwrites a value that is already there. Somebody who
 * has corrected the spelling of their college by hand should not have it
 * silently reverted by uploading one more certificate.
 */
export function applyDocuments(base: Cv, results: DocumentResult[]): Cv {
  return mergeDocuments([{ ...blankReport(), cv: base, kind: "other" }, ...results]);
}

const blankReport = (): DocumentReport => ({
  kind: "other",
  summary: "",
  discarded: [],
  confidence: "high",
});

/** What the merged CV actually gained, for the line shown after the upload. */
export function describeHaul(cv: Cv): string {
  const bits: string[] = [];
  const say = (n: number, one: string, many = `${one}s`) =>
    n > 0 && bits.push(`${n} ${n === 1 ? one : many}`);

  say(cv.education.length, "qualification");
  say(cv.experience.length, "role");
  say(cv.tests.length, "test score");
  say(cv.certifications.length, "certification");
  say(cv.awards.length, "award");
  say(cv.languages.length, "language");

  if (!bits.length) return "nothing we could use";
  if (bits.length === 1) return bits[0];
  return `${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}`;
}
