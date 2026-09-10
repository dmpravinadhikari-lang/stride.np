import type { Scope } from "@/lib/db/scope";
import "server-only";
import { complete, provider } from "@/modules/cv/lib/ai-adapter";
import { parseCv, tidy, type Cv } from "./schema";
import {
  BANNED, CITY, DATE_RANGE, EMAIL, GRADE, IS_BOARD, SINGLE_YEAR,
  pickPhone, readDates, scrubBanned, splitHeader, splitList, title,
} from "./patterns";

/**
 * Turning the plain text of an uploaded CV into structured fields.
 *
 * Two paths, and which one ran is always reported back to the student:
 *
 *   1. The model, when a key is configured. It handles the thing a parser
 *      cannot, deciding that "Amigo Traders, Kathmandu | 2022-2024 | Sales
 *      Officer" is one job with a role, an employer and two dates, in whatever
 *      order that particular CV happened to put them.
 *
 *   2. A heading-and-pattern parser, when no key is. It gets the contact block,
 *      the section boundaries and the bullets, and leaves the rest for the
 *      student to correct in the form.
 *
 * The fallback is not a silent downgrade. Extraction is a starting point that
 * the student then edits either way, so a partial parse costs them a minute of
 * typing; the alternative, refusing the upload without a key, costs them the
 * feature. That is the opposite trade from the blog generator in
 * lib/ai/provider.ts, where inventing visa facts would be actively harmful.
 */

export type ExtractResult = {
  cv: Cv;
  via: "model" | "parser";
  /** Fields the extraction is least sure about, surfaced in the form. */
  check: string[];
};

const SYSTEM = `You extract structured data from a CV or résumé and return JSON. You are working on CVs from Nepali students applying to study abroad.

Rules:
- Return ONE JSON object and nothing else. No markdown fence, no commentary.
- Copy what the CV says. Do not improve wording, do not invent, do not infer a field that is not there. An absent field is "" or [].
- NEVER carry over a photograph reference, date of birth, age, marital status, gender, religion, caste, father's name or husband's name, even when the CV has them. These fields do not exist in the output schema and must not be smuggled into another field.
- Dates: copy the CV's own form, shortened to "Jan 2024" or "2024". Use "Present" for current roles.
- Nepali qualifications: keep the real name (SLC, SEE, +2, Higher Secondary, Bachelor of Business Studies) and put the board or university in "board" (NEB, Tribhuvan University, Pokhara University, Kathmandu University).
- Marks: copy exactly as written, including the unit, for example "78.4%", "3.42 GPA", "First Division".
- Bullets: one achievement each, keep the student's own words, strip any leading dash or bullet glyph.
- Split skills into named groups. If the CV has one flat list, group it sensibly.
- IELTS/PTE/TOEFL/Duolingo/SAT/GRE go in "tests", never in "certifications".

Schema:
{"name":"","headline":"","email":"","phone":"","location":"","links":[{"label":"","url":""}],"summary":"","education":[{"qualification":"","institution":"","board":"","location":"","start":"","end":"","grade":"","highlights":[]}],"experience":[{"role":"","organisation":"","location":"","start":"","end":"","highlights":[]}],"projects":[{"title":"","context":"","year":"","url":"","highlights":[]}],"skills":[{"group":"","items":[]}],"tests":[{"name":"","score":"","date":"","detail":""}],"certifications":[{"title":"","issuer":"","year":"","url":""}],"publications":[{"title":"","venue":"","year":"","url":""}],"volunteering":[{"role":"","organisation":"","start":"","end":"","highlights":[]}],"languages":[{"language":"","level":""}],"awards":[{"title":"","issuer":"","year":"","note":""}],"referees":[{"name":"","role":"","organisation":"","email":"","phone":""}]}`;

export async function extractCv(scope: Scope | null, text: string): Promise<ExtractResult> {
  const trimmed = text.slice(0, 24_000);

  if (provider() !== "none") {
    try {
      const raw = await complete(scope, SYSTEM, `CV text:\n\n${trimmed}`);
      const cv = tidy(parseCv(firstJsonObject(raw)));
      // A model that returned nothing usable is worse than the parser, so fall
      // through rather than handing back an empty form.
      if (cv.name || cv.education.length || cv.experience.length) {
        return { cv: scrubBanned(cv), via: "model", check: uncertain(cv, trimmed) };
      }
    } catch (err) {
      console.error("[cv] model extraction failed, using the parser:", err);
    }
  }

  const cv = tidy(parseText(trimmed));
  return { cv: scrubBanned(cv), via: "parser", check: uncertain(cv, trimmed) };
}

/**
 * The model is told not to return these fields and the schema has nowhere to
 * put them, but a determined model will append "DOB: 1999-04-12" to a headline
 * or a summary. This is the belt to that braces: the one thing this tool
 * promises is that those details do not reach the page.
 */
/** Extracts the first balanced JSON object, tolerating any preamble. */
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

/* --------------------------------------------------------------------------
   The parser, used when no key is configured.
-------------------------------------------------------------------------- */

/**
 * Section headings, in the words CVs actually use. Matched against a whole
 * short line, because "Education" alone on a line is a heading whereas
 * "Education has always mattered to me" is a sentence.
 */
const HEADINGS: { key: keyof Cv | "contact"; words: RegExp }[] = [
  { key: "summary", words: /^(career\s+)?(objective|summary|profile|personal\s+(statement|profile)|about\s+me|professional\s+summary)\b/i },
  { key: "education", words: /^(education|academic\s+(background|qualification|record)s?|educational\s+qualifications?|qualifications?)\b/i },
  { key: "experience", words: /^(work\s+)?(experience|employment(\s+history)?|professional\s+experience|career\s+history|internships?)\b/i },
  { key: "projects", words: /^(projects?|academic\s+projects?|major\s+projects?|thesis)\b/i },
  { key: "skills", words: /^(skills?|technical\s+skills?|key\s+skills?|core\s+competenc(y|ies)|computer\s+skills?|it\s+skills?)\b/i },
  { key: "tests", words: /^(test\s+scores?|english\s+(test|proficiency)|ielts|pte|toefl|standardi[sz]ed\s+tests?)\b/i },
  { key: "certifications", words: /^(certificat(e|ion)s?|training(s)?|courses?|professional\s+development)\b/i },
  { key: "publications", words: /^(publications?|research|papers?|conference\s+presentations?)\b/i },
  { key: "volunteering", words: /^(volunteer(ing)?|community(\s+service)?|social\s+work|extra[\s-]?curricular|leadership|activities)\b/i },
  { key: "languages", words: /^(languages?|language\s+(skills?|proficiency))\b/i },
  { key: "awards", words: /^(awards?|achievements?|honou?rs?|scholarships?|accomplishments?)\b/i },
  { key: "referees", words: /^(refere(e|nce)s?)\b/i },
];

function headingOf(line: string): (keyof Cv | "contact") | null {
  const bare = line.trim().replace(/[:, -]+$/, "").trim();
  if (!bare || bare.length > 46) return null;

  // "Languages: Nepali, English, Hindi" begins with a section word but is a
  // field, not a heading, and reading it as a heading silently discarded
  // everything after the colon. A heading may carry a trailing colon; it may
  // not carry content after one.
  const colon = bare.indexOf(":");
  if (colon > 0 && bare.slice(colon + 1).trim().length > 0) return null;

  // A heading is short and is not a sentence. Five words is the practical cap;
  // "Work Experience and Internships" is four and is real.
  if (bare.split(/\s+/).length > 5) return null;
  for (const h of HEADINGS) if (h.words.test(bare)) return h.key;
  return null;
}

const isBullet = (line: string) => /^\s*(?:[-*•▪·o]|\d+[.)])\s+/.test(line);

/**
 * Prose rather than a field or a heading. Used to recover bullets that lost
 * their marker somewhere between Word and the PDF.
 */
const looksLikeSentence = (line: string) =>
  line.split(/\s+/).length >= 6 &&
  !DATE_RANGE.test(line) &&
  // "Software: SPSS, Excel" is a field, however long its value runs.
  !/^[A-Za-z][A-Za-z\s&/+-]{1,28}:\s/.test(line) &&
  !EMAIL.test(line);
const debullet = (line: string) => line.replace(/^\s*(?:[-*•▪·o]|\d+[.)])\s+/, "").trim();

function parseText(text: string): Cv {
  const lines = text.split("\n").map((l) => l.trim());
  const cv = parseCv({});

  // --- The contact block. Everything before the first heading, plus a sweep of
  // the whole document, because a phone number in a footer is common.
  const firstHeading = lines.findIndex((l) => headingOf(l));
  const head = lines.slice(0, firstHeading > 0 ? firstHeading : Math.min(lines.length, 8));

  cv.email = (text.match(EMAIL) ?? [""])[0];
  cv.phone = pickPhone(head.join("\n")) || pickPhone(text);

  // The name is the first line that is not a heading, an address, an email or a
  // phone number, which is where a CV puts it, above everything else.
  for (const line of head) {
    if (!line || headingOf(line)) continue;
    if (EMAIL.test(line) || /\d{6}/.test(line.replace(/\s/g, ""))) continue;
    if (/^(curriculum\s+vitae|c\.?v\.?|r[eé]sum[eé]|resume)$/i.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length <= 5 && /^[A-Za-z][A-Za-z.'\- ]+$/.test(line)) {
      cv.name = line.replace(/\s{2}/g, " ");
      break;
    }
  }

  /*
   * The location is reduced to a city and a country, never copied as written.
   *
   * Two reasons. A line like "Nationality: Nepali" matched the old country-only
   * test and became the student's location; and a CV should not carry a street
   * address at all, which is what "Address: Ward 5, Baneshwor, Kathmandu"
   * would have put on the page.
   */
  for (const line of head) {
    if (!line || line === cv.name || BANNED.test(line)) continue;
    const city = line.match(CITY);
    if (city) {
      cv.location = `${title(city[1])}, Nepal`;
      break;
    }
    if (/\bnepal\b/i.test(line) && !cv.location) cv.location = "Nepal";
  }

  for (const m of text.matchAll(/https?:\/\/[^\s)\]]+|(?:www\.)[^\s)\]]+/g)) {
    const url = m[0].replace(/[.;]$/, "");
    if (EMAIL.test(url)) continue;
    const label = /linkedin/i.test(url) ? "LinkedIn" : /github/i.test(url) ? "GitHub" : /behance|dribbble/i.test(url) ? "Portfolio" : "Website";
    if (cv.links.length < 4 && !cv.links.some((l) => l.label === label)) cv.links.push({ label, url });
  }

  // --- Sections. Lines are gathered under the last heading seen.
  const blocks = new Map<string, string[]>();
  let current: string | null = null;
  for (let i = firstHeading < 0 ? lines.length : firstHeading; i < lines.length; i++) {
    const heading = headingOf(lines[i]);
    if (heading) {
      current = heading;
      if (!blocks.has(current)) blocks.set(current, []);
      continue;
    }
    if (current && lines[i]) blocks.get(current)!.push(lines[i]);
  }

  cv.summary = (blocks.get("summary") ?? []).join(" ").slice(0, 900);

  for (const entry of groupEntries(blocks.get("education") ?? [])) {
    const whole = entry.header;
    const dates = readDates(whole);
    const gradeMatch = whole.match(GRADE);
    const grade = (gradeMatch?.[0] ?? "").replace(/\s{2}/g, " ").trim();

    // The grade comes out of the header before the header is split into fields,
    // along with the "CGPA:" or "Percentage:" label that introduced it. Leaving
    // it in put "CGPA: 3.42" in the board field.
    const header = gradeMatch
      ? whole.replace(gradeMatch[0], "").replace(/\b(?:cgpa|gpa|percentage|marks|grade)\b\s*:?\s*/i, "")
      : whole;

    const parts = splitHeader(header);
    // Which part is the board is guessable in Nepal, where the awarding body
    // says so in its own name.
    const boardAt = parts.findIndex((part) => IS_BOARD.test(part));
    const board = boardAt >= 0 ? parts[boardAt] : "";
    const rest = boardAt >= 0 ? parts.filter((_, i) => i !== boardAt) : parts;

    cv.education.push({
      qualification: rest[0] ?? header.slice(0, 140),
      institution: rest[1] ?? "",
      board,
      location: "",
      start: dates.start,
      end: dates.end,
      grade,
      highlights: entry.bullets,
    });
  }

  for (const key of ["experience", "volunteering"] as const) {
    for (const entry of groupEntries(blocks.get(key) ?? [])) {
      const dates = readDates(entry.header + " " + entry.body.join(" "));
      const parts = splitHeader(entry.header);
      const row = {
        role: parts[0] ?? entry.header.slice(0, 140),
        organisation: parts[1] ?? "",
        start: dates.start,
        end: dates.end,
        highlights: entry.bullets,
      };
      if (key === "experience") cv.experience.push({ ...row, location: parts[2] ?? "" });
      else cv.volunteering.push(row);
    }
  }

  for (const entry of groupEntries(blocks.get("projects") ?? [])) {
    const parts = splitHeader(entry.header);
    cv.projects.push({
      title: parts[0] ?? entry.header.slice(0, 140),
      context: parts[1] ?? "",
      year: entry.header.match(SINGLE_YEAR)?.[1] ?? "",
      url: "",
      highlights: entry.bullets,
    });
  }

  // Skills. Either "Group: a, b, c" lines, or one flat list.
  const skillLines = blocks.get("skills") ?? [];
  const loose: string[] = [];
  for (const line of skillLines) {
    const labelled = line.match(/^([A-Za-z][A-Za-z\s&/+-]{1,28}):\s*(.+)$/);
    if (labelled) {
      const group = labelled[1].trim();
      const items = splitList(labelled[2]);
      // CVs routinely file spoken languages under Skills. The document prints
      // them in their own section, so that is where they go.
      if (/^languages?$/i.test(group)) {
        for (const item of items.slice(0, 8)) cv.languages.push({ language: item, level: "" });
      } else {
        cv.skills.push({ group, items });
      }
    } else {
      loose.push(debullet(line));
    }
  }
  if (loose.length) {
    const items = loose.flatMap(splitList).filter(Boolean);
    if (items.length) cv.skills.push({ group: cv.skills.length ? "Other" : "Skills", items: items.slice(0, 14) });
  }

  // Tests. Scanned across the whole document, not just its own section: most
  // CVs put IELTS in education, in a table, or in a line of its own.
  for (const m of text.matchAll(
    /\b(IELTS|PTE(?:\s+Academic)?|TOEFL(?:\s+iBT)?|Duolingo(?:\s+English\s+Test)?|SAT|GRE|GMAT)\b[^\n]{0,60}?\b(\d{1,3}(?:\.\d)?)\b[ \t]*(\([^)\n]{0,140}\))?/gi,
  )) {
    const name = m[1].replace(/\s+/g, " ");
    if (cv.tests.some((t) => t.name.toLowerCase().startsWith(name.slice(0, 4).toLowerCase()))) continue;
    // The band breakdown usually trails the overall score in brackets, and it
    // is often the thing that secures a waiver, worth carrying over.
    const detail = (m[3] ?? "").replace(/^\(|\)$/g, "").trim();
    cv.tests.push({ name, score: m[2], date: "", detail: detail.slice(0, 120) });
    if (cv.tests.length >= 6) break;
  }

  for (const line of blocks.get("certifications") ?? []) {
    const clean = debullet(line);
    if (clean.length < 3) continue;
    const parts = splitHeader(clean);
    cv.certifications.push({
      title: parts[0] ?? clean.slice(0, 160),
      issuer: parts[1] ?? "",
      year: clean.match(SINGLE_YEAR)?.[1] ?? "",
      url: "",
    });
    if (cv.certifications.length >= 10) break;
  }

  for (const line of blocks.get("publications") ?? []) {
    const clean = debullet(line);
    if (clean.length < 8) continue;
    cv.publications.push({
      title: clean.slice(0, 300),
      venue: "",
      year: clean.match(SINGLE_YEAR)?.[1] ?? "",
      url: clean.match(/https?:\/\/\S+/)?.[0] ?? "",
    });
    if (cv.publications.length >= 12) break;
  }

  for (const line of blocks.get("languages") ?? []) {
    for (const item of splitList(debullet(line))) {
      const m = item.match(/^([A-Za-z]+)\s*[-(:]\s*([^)]+)\)?$/);
      if (m) cv.languages.push({ language: m[1].trim(), level: m[2].trim() });
      else if (/^[A-Za-z]{3,20}$/.test(item)) cv.languages.push({ language: item, level: "" });
      if (cv.languages.length >= 8) break;
    }
  }

  for (const line of blocks.get("awards") ?? []) {
    const clean = debullet(line);
    if (clean.length < 4) continue;
    const parts = splitHeader(clean);
    cv.awards.push({
      title: parts[0] ?? clean.slice(0, 160),
      issuer: parts[1] ?? "",
      year: clean.match(SINGLE_YEAR)?.[1] ?? "",
      note: "",
    });
    if (cv.awards.length >= 10) break;
  }

  for (const entry of groupEntries(blocks.get("referees") ?? [])) {
    const all = [entry.header, ...entry.body].join(" ");
    const parts = splitHeader(entry.header);
    cv.referees.push({
      name: parts[0] ?? "",
      role: parts[1] ?? "",
      organisation: parts[2] ?? "",
      email: all.match(EMAIL)?.[0] ?? "",
      phone: pickPhone(all),
    });
    if (cv.referees.length >= 4) break;
  }

  return cv;
}

/**
 * Groups a section's lines into entries.
 *
 * A CV entry is a header line, the job title, the degree, followed by its
 * bullets. A new entry starts on any non-bullet line, which is the convention
 * every CV follows even when it follows no other.
 */
function groupEntries(lines: string[]): { header: string; body: string[]; bullets: string[] }[] {
  const out: { header: string; body: string[]; bullets: string[] }[] = [];
  for (const line of lines) {
    if (!line) continue;
    if (isBullet(line)) {
      if (out.length) out[out.length - 1].bullets.push(debullet(line).slice(0, 300));
      continue;
    }

    /*
     * Unmarked bullets.
     *
     * A great many PDFs lose their bullet glyphs on the way out, Chrome and
     * Google Docs draw a list marker as its own object outside the text, so
     * what arrives here is three bare sentences under a job title with nothing
     * to say they were a list. Read as entries, one job becomes four.
     *
     * A sentence is only taken as a bullet when the entry above it is already
     * established as a real entry: its header carries a date range, or it has
     * bullets already. That is what keeps a Projects section of one-line
     * descriptions, which have no dates, from collapsing into a single project.
     */
    const open = out[out.length - 1];
    if (open && looksLikeSentence(line) && (DATE_RANGE.test(open.header) || open.bullets.length)) {
      open.bullets.push(line.slice(0, 300));
      continue;
    }
    // A short continuation line under an entry that has no bullets yet is part
    // of that entry's header, "Tribhuvan University" or "CGPA: 3.42" on the
    // line below the degree, rather than a new entry.
    //
    // The test is on the line itself, not on the entry above it. An earlier
    // version refused to fold anything under a header that already had dates in
    // it, which is precisely where a Nepali CV puts its marks: every "CGPA:
    // 3.42" line became a qualification of its own.
    const last = out[out.length - 1];
    if (
      last &&
      !last.bullets.length &&
      last.body.length < 2 &&
      line.length < 60 &&
      // A line carrying its own date range is a new entry, not a continuation.
      !DATE_RANGE.test(line)
    ) {
      last.body.push(line);
      continue;
    }
    out.push({ header: line, body: [], bullets: [] });
    if (out.length >= 12) break;
  }
  // A header's continuation lines are useful as fields, so fold them in.
  return out.map((e) => ({ ...e, header: [e.header, ...e.body].join(" | ") }));
}

/**
 * What to ask the student to double-check.
 *
 * Extraction is never trusted, so the form opens with the shakiest fields
 * flagged rather than leaving the student to proofread twenty fields evenly.
 */
function uncertain(cv: Cv, text: string): string[] {
  const check: string[] = [];
  if (!cv.name) check.push("your name");
  if (!cv.email) check.push("your email address");
  if (!cv.phone) check.push("your phone number");
  if (!cv.education.length) check.push("your education, which did not come through");
  else if (cv.education.some((e) => !e.end && !e.start)) check.push("the dates on your education");
  if (cv.education.some((e) => !e.grade)) check.push("your marks");
  if (!cv.experience.length && /\b(experience|intern|employed|worked)\b/i.test(text)) {
    check.push("your work experience, which the CV seems to mention");
  }
  if (BANNED.test(text)) {
    check.push("nothing. Your old CV had a date of birth or similar on it, and it has been left off deliberately");
  }
  return check.slice(0, 5);
}
