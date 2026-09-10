import { parseCv, tidy, type Cv } from "./schema";
import {
  BANNED, DATE_RANGE, EMAIL, GRADE, IS_BOARD, SINGLE_YEAR,
  CITY, pickPhone, readDates, scrubBanned, title,
} from "./patterns";
import type { DocumentKind, DocumentResult } from "./documents";

/**
 * Reading a student document that has real text in it.
 *
 * This is the path that made the feature work at all. The first version could
 * only read documents through the vision model, so with no API key configured
 * every upload came back "switched off", the headline feature of the CV maker
 * did nothing whatsoever. And a Word file was not even accepted, which is
 * absurd: an experience letter is a Word file more often than it is anything
 * else, and a .docx has its text sitting right there in the XML.
 *
 * So anything with extractable text, Word, ODT, a PDF exported rather than
 * photographed, plain text, is read here, with no key and no network. Only
 * photographs and scanned PDFs need the model, because only they have no text
 * to read.
 *
 * These are not CVs. A marksheet is a table, a certificate is one sentence in
 * the middle of a page of decoration, and an experience letter is a business
 * letter. So this does not reuse the CV parser in extract.ts: it identifies
 * what the document is and then looks for the specific things that kind of
 * document carries.
 */

/* --------------------------------------------------------------------------
   What kind of document is this
-------------------------------------------------------------------------- */

const SIGNS: { kind: DocumentKind; re: RegExp; weight: number }[] = [
  { kind: "test-report", re: /\b(ielts|toefl|pte academic|duolingo english test|test report form|\btrf\b|listening.*reading.*writing.*speaking)\b/i, weight: 3 },
  { kind: "transcript", re: /\b(transcript|marksheet|mark sheet|grade sheet|statement of marks|academic record|semester|gpa|cgpa|percentage obtained)\b/i, weight: 2 },
  { kind: "experience-letter", re: /\b(experience (letter|certificate)|employment certificate|has been working|was employed|is working with|relieving letter|worked (with|as|for) (us|our))\b/i, weight: 3 },
  { kind: "recommendation", re: /\b(letter of recommendation|recommendation letter|i recommend|strongly recommend|it is my pleasure to recommend)\b/i, weight: 3 },
  { kind: "training", re: /\b(training|workshop|has successfully completed the (course|training)|course completion|internship (certificate|training))\b/i, weight: 2 },
  { kind: "award", re: /\b(scholarship|award(ed)?|merit certificate|prize|honou?r roll|topper)\b/i, weight: 2 },
  { kind: "certificate", re: /\b(certificate|provisional certificate|character certificate|degree certificate|has passed|is awarded the degree)\b/i, weight: 1 },
  { kind: "passport", re: /\b(passport no|passport number|p<npl|travel document|republic of nepal.{0,40}passport)\b/i, weight: 4 },
  { kind: "citizenship", re: /\b(citizenship (certificate|no|number)|नागरिकता)\b/i, weight: 4 },
];

export function detectKind(text: string): { kind: DocumentKind; confident: boolean } {
  const scores = new Map<DocumentKind, number>();
  for (const { kind, re, weight } of SIGNS) {
    const hits = (text.match(new RegExp(re.source, "gi")) ?? []).length;
    if (hits) scores.set(kind, (scores.get(kind) ?? 0) + weight + Math.min(hits, 3));
  }
  if (!scores.size) return { kind: "other", confident: false };

  const ranked = [...scores].sort((a, b) => b[1] - a[1]);
  const [best, top] = ranked[0];
  const runnerUp = ranked[1]?.[1] ?? 0;
  // Confident when one kind is clearly ahead. A marksheet that also says
  // "certificate" somewhere should not be a coin toss.
  return { kind: best, confident: top >= 4 && top - runnerUp >= 2 };
}

/* --------------------------------------------------------------------------
   The student's own name
-------------------------------------------------------------------------- */

/**
 * The name, from the phrasings Nepali institutions actually use.
 *
 * The hard part is not finding a name, it is not finding the WRONG one. These
 * documents are full of other people's names: "son of Krishna Bahadur
 * Shrestha", the principal's signature, the recommender. So the patterns are
 * anchored to phrases that can only introduce the subject of the document, and
 * anything following a relationship word is rejected outright.
 */
const NAME_PATTERNS: RegExp[] = [
  /certif(?:y|ies|ied) that\s+(?:Mr|Ms|Mrs|Miss|Master)?\.?\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/,
  /name\s*(?:of\s*(?:the\s*)?(?:student|candidate|holder|employee))?\s*[:\-]\s*([A-Z][A-Za-z.' -]{3,45})/i,
  /(?:awarded|presented|issued)\s+to\s+(?:Mr|Ms|Mrs|Miss)?\.?\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/i,
  /\b(?:Mr|Ms|Mrs|Miss)\.\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})/,
  /candidate\s*(?:name)?\s*[:\-]\s*([A-Z][A-Za-z.' -]{3,45})/i,
];

const RELATION = /\b(son|daughter|wife|husband|child)\s+of\b/i;

function findName(text: string): string {
  for (const re of NAME_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const found = m[1].replace(/\s{2}/g, " ").trim();
    // "certify that Ram Thapa son of Krishna" must give Ram Thapa, and a match
    // that begins inside a relationship phrase must give nothing.
    const before = text.slice(Math.max(0, (m.index ?? 0) - 24), m.index ?? 0);
    if (RELATION.test(before)) continue;
    const cleaned = found.split(RELATION)[0].trim();
    if (cleaned.split(/\s+/).length >= 2 && cleaned.length <= 45) return properCase(cleaned);
  }
  return "";
}

/** "SUNITA GURUNG" and "sunita gurung" both become "Sunita Gurung". */
function properCase(s: string): string {
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s;
  return s
    .split(/\s+/)
    .map((w) => title(w))
    .join(" ");
}

/* --------------------------------------------------------------------------
   Qualifications, employers, scores
-------------------------------------------------------------------------- */

const QUALIFICATION =
  /\b((?:Bachelor|Master|Doctor)(?:'s)?\s+(?:of|in)\s+[A-Z][A-Za-z ]{2,44}|Bachelor of [A-Z][A-Za-z ]{2,44}|B\.?(?:Sc|A|Ed|B\.?S|Com|Tech|E)\b[A-Za-z. ]{0,24}|M\.?(?:Sc|A|Ed|B\.?A|Com|Tech)\b[A-Za-z. ]{0,24}|Higher Secondary(?: Education)?|Proficiency Certificate Level|Intermediate|Diploma in [A-Z][A-Za-z ]{2,40}|\+2|S\.?E\.?E\.?|S\.?L\.?C\.?)\b/;

const ORG_HINT =
  /\b(pvt\.? ?ltd|private limited|limited|company|hospital|clinic|college|campus|school|institute|academy|bank|traders|enterprises|industries|consultancy|services|foundation|council|association|hotel|restaurant|store|pharmacy)\b/i;

const ROLE =
  /\b(?:as|as an|as a|post of|position of|designation(?:\s+of)?|worked as|working as|employed as)\s*[:\-]?\s*((?:an?\s+)?[A-Z][A-Za-z/ ]{2,40}?)(?=\s*(?:,|\.|\bat\b|\bin\b|\bfrom\b|\bsince\b|\bwith\b|$))/;

/** The organisation, preferring a letterhead line over a mention in prose. */
function findOrg(lines: string[], text: string): string {
  // A letterhead is one of the first few lines and names itself.
  for (const line of lines.slice(0, 6)) {
    if (ORG_HINT.test(line) && line.length < 70 && !EMAIL.test(line)) {
      return line.replace(/^[^A-Za-z]+/, "").trim();
    }
  }
  const m = text.match(new RegExp(`([A-Z][A-Za-z.&' ]{2,44}\\s+${ORG_HINT.source})`, "i"));
  return m ? m[1].replace(/\s{2}/g, " ").trim() : "";
}

/* --------------------------------------------------------------------------
   The reader
-------------------------------------------------------------------------- */

export function parseTextDocument(text: string, filename = ""): DocumentResult {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const { kind, confident } = detectKind(`${text}\n${filename}`);
  const cv = parseCv({});

  const name = findName(text);
  if (name) cv.name = name;

  // A city is fine; a street address is not, and nothing here looks for one.
  const city = text.match(CITY);
  if (city) cv.location = `${title(city[1])}, Nepal`;

  const email = text.match(EMAIL);
  const phone = pickPhone(text);

  switch (kind) {
    case "transcript":
    case "certificate": {
      const qual = text.match(QUALIFICATION);
      const board = lines.find((l) => IS_BOARD.test(l) && l.length < 70);
      const grade = text.match(GRADE);
      const dates = readDates(text);
      const institution = lines.find(
        (l) => /\b(campus|college|school|academy|institute)\b/i.test(l) && l.length < 70,
      );

      if (qual || board || grade) {
        cv.education.push({
          qualification: qual ? qual[1].replace(/\s{2}/g, " ").trim() : "",
          institution: institution ? institution.trim() : "",
          board: board ? board.replace(/^[^A-Za-z]+/, "").trim() : "",
          location: "",
          start: dates.start,
          end: dates.end || (text.match(SINGLE_YEAR)?.[1] ?? ""),
          grade: grade ? grade[0].replace(/\s{2}/g, " ").trim() : "",
          highlights: [],
        });
      }
      break;
    }

    case "test-report": {
      for (const m of text.matchAll(
        /\b(IELTS|PTE(?:\s+Academic)?|TOEFL(?:\s+iBT)?|Duolingo(?:\s+English\s+Test)?|SAT|GRE|GMAT)\b[^\n]{0,80}?\b(\d{1,3}(?:\.\d)?)\b/gi,
      )) {
        const testName = m[1].replace(/\s+/g, " ");
        if (cv.tests.some((t) => t.name.toLowerCase().startsWith(testName.slice(0, 4).toLowerCase()))) continue;
        cv.tests.push({ name: testName, score: m[2], date: "", detail: bandsNear(text) });
      }
      // A TRF prints the overall band on its own line more often than beside
      // the test's name.
      if (!cv.tests.length) {
        const overall = text.match(/overall\s*(?:band\s*)?(?:score)?\s*[:\-]?\s*(\d(?:\.\d)?)/i);
        const which = text.match(/\b(IELTS|PTE|TOEFL|Duolingo)\b/i);
        if (overall && which) {
          cv.tests.push({ name: which[1].toUpperCase(), score: overall[1], date: "", detail: bandsNear(text) });
        }
      }
      break;
    }

    case "experience-letter":
    case "recommendation": {
      const role = text.match(ROLE);
      const org = findOrg(lines, text);
      const dates = readDates(text);
      cv.experience.push({
        role: role ? properCase(role[1].replace(/^an?\s+/i, "").trim()) : "",
        organisation: org,
        location: "",
        start: dates.start,
        end: dates.end,
        highlights: duties(text),
      });
      break;
    }

    case "training": {
      const course = text.match(
        /(?:completed|attended|participated in)\s+(?:the\s+)?([A-Z][A-Za-z0-9,&/()-]{3,60}?)(?=\s*(?:training|course|workshop|programme|program|\.|,|$))/i,
      );
      cv.certifications.push({
        title: course ? course[1].trim() : lines.find((l) => /training|course|workshop/i.test(l))?.slice(0, 90) ?? "",
        issuer: findOrg(lines, text),
        year: text.match(SINGLE_YEAR)?.[1] ?? "",
        url: "",
      });
      break;
    }

    case "award": {
      const award = text.match(
        /((?:[A-Z][A-Za-z ]{2,40})?(?:scholarship|award|prize|medal))/,
      );
      cv.awards.push({
        title: award ? award[1].replace(/\s{2}/g, " ").trim() : "",
        issuer: findOrg(lines, text),
        year: text.match(SINGLE_YEAR)?.[1] ?? "",
        note: "",
      });
      break;
    }

    case "passport":
    case "citizenship":
      // Only ever the name, which findName already has. Everything else on
      // these two documents is a field that must not reach a CV.
      break;

    default: {
      // Unknown shape: take whatever is unambiguous rather than nothing.
      const qual = text.match(QUALIFICATION);
      if (qual) {
        cv.education.push({
          qualification: qual[1].trim(),
          institution: "",
          board: lines.find((l) => IS_BOARD.test(l) && l.length < 70)?.trim() ?? "",
          location: "",
          start: "",
          end: text.match(SINGLE_YEAR)?.[1] ?? "",
          grade: text.match(GRADE)?.[0] ?? "",
          highlights: [],
        });
      }
      break;
    }
  }

  // Contact details are worth taking from anything that carries them, but not
  // from a letter where they belong to the employer rather than the student.
  const personal = kind !== "experience-letter" && kind !== "recommendation" && kind !== "training";
  if (personal && email) cv.email = email[0];
  if (personal && phone) cv.phone = phone;

  const out = scrubBanned(tidy(cv));
  const got = countFields(out);

  return {
    kind: got === 0 && kind !== "passport" && kind !== "citizenship" ? "unreadable" : kind,
    confidence: got === 0 ? "low" : confident && got >= 2 ? "high" : "medium",
    summary: describe(kind, out, got),
    discarded: sawBanned(text),
    cv: out,
  };
}

/** "L7.5 R7.0 W6.5 S7.0", however the report happened to lay it out. */
function bandsNear(text: string): string {
  const parts: string[] = [];
  for (const [label, re] of [
    ["L", /listening\s*[:\-]?\s*(\d(?:\.\d)?)/i],
    ["R", /reading\s*[:\-]?\s*(\d(?:\.\d)?)/i],
    ["W", /writing\s*[:\-]?\s*(\d(?:\.\d)?)/i],
    ["S", /speaking\s*[:\-]?\s*(\d(?:\.\d)?)/i],
  ] as const) {
    const m = text.match(re);
    if (m) parts.push(`${label}${m[1]}`);
  }
  return parts.length >= 2 ? parts.join(" ") : "";
}

/**
 * The duties an experience letter describes, as CV bullets.
 *
 * Letters list them as bullets, or run them into one sentence after
 * "responsible for" / "duties included". Both are handled; the recommender's
 * praise is not taken, because a CV does not carry it.
 */
function duties(text: string): string[] {
  const out: string[] = [];

  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^\s*(?:[-*•▪·]|\d+[.)])\s+/.test(t)) {
      const cleaned = t.replace(/^\s*(?:[-*•▪·]|\d+[.)])\s+/, "").trim();
      if (cleaned.split(/\s+/).length >= 3 && !BANNED.test(cleaned)) out.push(cleaned.slice(0, 300));
    }
  }

  if (!out.length) {
    const run = text.match(
      /(?:responsibilities|duties|responsible for|tasks)\s*(?:included|include|were|are)?\s*[:\-]?\s*([^.]{20,400})/i,
    );
    if (run) {
      for (const part of run[1].split(/[;]| and (?=[a-z])/)) {
        // Collapse any line break the source wrapped into the middle of it.
        const cleaned = part.replace(/\s+/g, " ").trim().replace(/^and\s+/i, "");
        if (cleaned.split(/\s+/).length >= 3 && !BANNED.test(cleaned)) {
          out.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
        }
      }
    }
  }

  return out.slice(0, 6);
}

const countFields = (cv: Cv) =>
  (cv.name ? 1 : 0) +
  cv.education.length +
  cv.experience.filter((e) => e.role || e.organisation).length +
  cv.tests.length +
  cv.certifications.filter((c) => c.title).length +
  cv.awards.filter((a) => a.title).length;

/** One line the student can check the reading against. */
function describe(kind: DocumentKind, cv: Cv, got: number): string {
  if (!got) return "Read, but nothing on it could be identified. Check it is the right file.";
  const bits: string[] = [];
  if (cv.education[0]?.qualification) bits.push(cv.education[0].qualification);
  if (cv.education[0]?.board) bits.push(cv.education[0].board);
  if (cv.education[0]?.grade) bits.push(cv.education[0].grade);
  if (cv.experience[0]?.role) bits.push(cv.experience[0].role);
  if (cv.experience[0]?.organisation) bits.push(cv.experience[0].organisation);
  if (cv.tests[0]) bits.push(`${cv.tests[0].name} ${cv.tests[0].score}`);
  if (cv.certifications[0]?.title) bits.push(cv.certifications[0].title);
  if (cv.awards[0]?.title) bits.push(cv.awards[0].title);
  if (!bits.length && cv.name) bits.push(cv.name);
  const labels: Partial<Record<DocumentKind, string>> = {
    transcript: "Transcript",
    certificate: "Certificate",
    "test-report": "Test report",
    "experience-letter": "Experience letter",
    recommendation: "Recommendation",
    training: "Training certificate",
    award: "Award",
    passport: "Passport",
    citizenship: "Citizenship certificate",
  };
  return `${labels[kind] ?? "Document"}: ${bits.slice(0, 3).join(", ")}`;
}

/** The banned fields this document had on it, in the student's own words. */
function sawBanned(text: string): string[] {
  const found: string[] = [];
  const named: [RegExp, string][] = [
    [/date of birth|d\.?o\.?b\.?|birth\s?date/i, "date of birth"],
    [/father'?s? name/i, "father's name"],
    [/mother'?s? name/i, "mother's name"],
    [/marital status/i, "marital status"],
    [/\b(?:gender|sex)\s*[:\-]/i, "gender"],
    [/citizenship (?:no|number)/i, "citizenship number"],
    [/passport (?:no|number)/i, "passport number"],
    [/(?:symbol|registration|roll) (?:no|number)/i, "your exam registration number"],
    [/\bcaste\b/i, "caste"],
    [/\breligion\b/i, "religion"],
    [/ward (?:no|number)|\btole\b/i, "your street address"],
  ];
  for (const [re, label] of named) if (re.test(text) && !found.includes(label)) found.push(label);
  return found.slice(0, 8);
}
