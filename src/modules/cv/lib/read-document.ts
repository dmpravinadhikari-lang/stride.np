import type { Scope } from "@/lib/db/scope";
import "server-only";
import { canReadDocuments, complete, completeWithDocument, provider, type Attachment } from "@/modules/cv/lib/ai-adapter";
import { parseCv, tidy } from "./schema";
import { scrubBanned } from "./patterns";
import {
  MAX_DOCUMENT_BYTES,
  typeFor,
  type DocumentKind,
  type DocumentResult,
} from "./documents";

/**
 * Reading one student document with the model.
 *
 * Two ways in. A photograph or a scanned PDF has no text in it, so it needs the
 * model's eyes. That is readDocumentImage. A Word file or an exported PDF has
 * its text sitting right there, so readDocumentText sends the text instead:
 * same instruction, no image, a fraction of the cost.
 *
 * Neither is required. read-text-document.ts reads a text document with regexes
 * and no key at all, which is what the route falls back to, an important
 * difference from the first version of this feature, where no key meant no
 * document reading whatsoever.
 *
 * One document per call, rather than all of them in one. It costs the same, and
 * ten certificates upload as ten short requests the student can watch finish
 * one by one instead of one request that appears to hang for two minutes.
 */

const KINDS: DocumentKind[] = [
  "transcript",
  "certificate",
  "test-report",
  "experience-letter",
  "recommendation",
  "training",
  "award",
  "passport",
  "citizenship",
  "other",
  "unreadable",
];

/**
 * The instruction.
 *
 * Most of it is about what not to return. A citizenship certificate is mostly
 * date of birth, parents' names, permanent address and a certificate number; a
 * passport is mostly a date of birth and a number. Every one of those is a
 * field the CV must not carry, and a field that would make a stored copy of
 * this upload a genuine liability. So the model is told to name what it saw and
 * leave it behind, and `scrubBanned` in extract.ts runs over the result
 * afterwards on the assumption that one day it will not.
 */
const SYSTEM = `You read one document belonging to a Nepali student who is applying to study abroad, and return JSON describing only what belongs on a CV.

Identify the document, then extract CV-relevant facts from it.

NEVER return any of the following, from any document, under any field name. Note them in "discarded" instead:
- date of birth, age, place of birth
- gender, marital status, religion, caste, ethnicity, nationality
- father's, mother's, husband's, wife's or guardian's name
- citizenship number, passport number, national ID number
- symbol number, registration number, roll number, examination number
- a full street address, ward number or tole (a city and country is fine)
- a photograph, signature, fingerprint or any biometric detail
- bank account, PAN or any financial number

What to take, by document:
- Transcript, marksheet, grade sheet: the qualification's real name, the institution, the board or university, the years, and the overall marks exactly as printed ("78.4%", "3.42 CGPA", "First Division"). Major subjects may go in the qualification's highlights.
- Certificate, provisional certificate, character certificate: the qualification, the awarding board or university, and the year.
- IELTS/PTE/TOEFL/Duolingo/SAT/GRE report: the test name, the overall score, the band or section breakdown, and the test date.
- Experience or employment letter: the job title, the employer, the start and end dates, and any duties described, as CV bullets, each starting with a verb, in the letter's own words.
- Recommendation letter: the role and responsibilities it describes. Do NOT quote the recommender's praise; a CV does not carry it. The recommender may go in "referees" with their role and organisation.
- Training or course certificate: the course title, the issuer, the year.
- Award or scholarship letter: the award, the giver, the year, and how selective it was if stated.
- Passport: ONLY the full name as printed, which is the spelling every application must match. Nothing else at all.
- Citizenship certificate: ONLY the full name, and the district as a city. Nothing else at all.

Rules:
- Return ONE JSON object, no markdown fence, no commentary.
- Copy what the document says. Do not improve it, do not infer, do not guess a year that is not printed. An absent field is "" or [].
- Nepali qualifications keep their real names: SEE, SLC, +2, Higher Secondary, Bachelor of Business Studies, Proficiency Certificate Level.
- Boards and universities go in "board": NEB, HSEB, CTEVT, Tribhuvan University, Pokhara University, Kathmandu University, Purbanchal University.
- If the document is unreadable, too blurred, or is not a student document at all, set kind to "unreadable" and leave cv empty. Do not invent a plausible transcript.
- "summary" is one short line naming the document, so the student can confirm it was read correctly. e.g. "Marksheet, BBS third year, Tribhuvan University".
- "discarded" lists, in plain words, the personal details you saw on the document and deliberately left out. Use the student's language: "date of birth", "father's name", "citizenship number". Empty if there were none.

Shape:
{"kind":"transcript|certificate|test-report|experience-letter|recommendation|training|award|passport|citizenship|other|unreadable","confidence":"high|medium|low","summary":"","discarded":[],"cv":{"name":"","headline":"","email":"","phone":"","location":"","links":[],"summary":"","education":[{"qualification":"","institution":"","board":"","location":"","start":"","end":"","grade":"","highlights":[]}],"experience":[{"role":"","organisation":"","location":"","start":"","end":"","highlights":[]}],"projects":[],"skills":[],"tests":[{"name":"","score":"","date":"","detail":""}],"certifications":[{"title":"","issuer":"","year":"","url":""}],"publications":[],"volunteering":[],"languages":[],"awards":[{"title":"","issuer":"","year":"","note":""}],"referees":[]}}`;

export { canReadDocuments, MAX_DOCUMENT_BYTES, typeFor };

/** True when the model can be asked about text, which the CLI provider can. */
export const canReadText = () => provider() !== "none";

/** A photograph or a scanned PDF. Needs the model's eyes. */
export async function readDocumentImage(
  scope: Scope | null,
  file: Attachment,
  filename: string,
): Promise<DocumentResult> {
  if (!canReadDocuments()) {
    throw new Error("Reading photographs needs ANTHROPIC_API_KEY to be set.");
  }
  return shape(
    await completeWithDocument(
      scope,
      SYSTEM,
      `The file is named "${filename}". Identify it and return the JSON.`,
      file,
    ),
  );
}

/**
 * A document whose text we already have.
 *
 * Better than the regex reader when a key is configured, it copes with a
 * marksheet laid out as a table, which patterns do badly, and it costs a
 * fraction of a vision call because there is no image to send.
 */
export async function readDocumentText(scope: Scope | null, text: string, filename: string): Promise<DocumentResult> {
  if (!canReadText()) throw new Error("No AI provider configured.");
  return shape(
    await complete(
      scope,
      SYSTEM,
      `The file is named "${filename}". Its text follows.\n\n${text.slice(0, 20_000)}`,
    ),
  );
}

function shape(raw: string): DocumentResult {
  const parsed = firstJsonObject(raw) as Record<string, unknown> | null;
  if (!parsed) {
    return unreadable("We could not make sense of that one.");
  }

  const kind = KINDS.includes(parsed.kind as DocumentKind) ? (parsed.kind as DocumentKind) : "other";
  const cv = scrubBanned(tidy(parseCv(parsed.cv)));

  /*
   * A document that yielded nothing must not come back looking like a success.
   *
   * A blurred photograph can produce a confident-sounding "transcript" with an
   * empty CV attached, and a student seeing it listed as read would assume
   * their marks are in. Passport and citizenship are the deliberate exception:
   * those are supposed to yield almost nothing, so empty is the correct result
   * for them rather than a failure.
   */
  const empty =
    !cv.name &&
    !cv.education.length &&
    !cv.experience.length &&
    !cv.tests.length &&
    !cv.certifications.length &&
    !cv.awards.length;
  const yieldsLittleByDesign = kind === "passport" || kind === "citizenship";

  return {
    kind: empty && !yieldsLittleByDesign ? "unreadable" : kind,
    confidence: (["high", "medium", "low"] as const).includes(parsed.confidence as "high")
      ? (parsed.confidence as DocumentResult["confidence"])
      : "medium",
    summary: text(parsed.summary, 160) || "Read, but nothing on it belongs on a CV.",
    discarded: list(parsed.discarded, 8, 60),
    cv,
  };
}

const unreadable = (summary: string): DocumentResult => ({
  kind: "unreadable",
  confidence: "low",
  summary,
  discarded: [],
  cv: tidy(parseCv({})),
});

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const list = (v: unknown, count: number, max: number) =>
  Array.isArray(v)
    ? v
        .map((item) => text(item, max))
        .filter(Boolean)
        .slice(0, count)
    : [];

/**
 * The first balanced JSON object in the reply.
 *
 * Same job as the helper in extract.ts and deliberately a second copy rather
 * than a shared export: that one is reached through a `server-only` module that
 * also pulls in the whole text parser, and this file has no other reason to
 * depend on it.
 */
function firstJsonObject(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = body.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(body.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}
