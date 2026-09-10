import type { Cv } from "./schema";

/**
 * The patterns that read a Nepali student's paperwork.
 *
 * Shared, because two very different readers need the same regexes. The CV
 * reader in extract.ts parses a document somebody wrote about themselves; the
 * document reader in read-text-document.ts parses a marksheet or an experience
 * letter that an institution wrote about them. A percentage is a percentage and
 * Tribhuvan University is an awarding body in both, and keeping two copies of
 * that knowledge means fixing every future bug twice.
 *
 * Nothing here is server-only. It is regexes and string handling.
 */

/* --------------------------------------------------------------------------
   Contact details
-------------------------------------------------------------------------- */

export const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2}/;

/** The cities a Nepali student's paperwork is most likely to name. */
export const CITY =
  /\b(kathmandu|lalitpur|patan|bhaktapur|pokhara|biratnagar|birgunj|butwal|dharan|bharatpur|chitwan|hetauda|janakpur|nepalgunj|dhangadhi|itahari|birtamod|damak)\b/i;

/** Nepali mobiles, landlines and international forms, in that order. */
export const PHONE = /(\+?\d{1,3}[\s-]?)?(?:\(?\d{1,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}[\s-]?\d{0,4}/;

export function pickPhone(s: string): string {
  // Nepali mobiles first, because they are unambiguous and are what a student
  // actually wants on the CV.
  const nepali = s.match(/(?:\+?977[\s-]?)?9[678]\d{8}\b/);
  if (nepali) {
    const digits = nepali[0].replace(/\D/g, "");
    return `+977 ${digits.slice(-10)}`;
  }
  const any = s.match(PHONE);
  if (!any) return "";
  const digits = any[0].replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? any[0].trim() : "";
}

/* --------------------------------------------------------------------------
   Dates, marks and awarding bodies
-------------------------------------------------------------------------- */

/** Any date range this paperwork might print, reduced to a start and an end. */
export const DATE_RANGE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*)?((?:19|20)\d{2})\s*(?:-|to|until|: )\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*)?((?:19|20)\d{2}|present|current|now|ongoing|till\s+date)/i;

export const SINGLE_YEAR = /\b((?:19|20)\d{2})\b/;

export const GRADE =
  /(\d{1,3}(?:\.\d+)?\s*%|(?:cgpa|gpa)\s*:?\s*\d(?:\.\d+)?(?:\s*\/\s*\d(?:\.\d+)?)?|\d(?:\.\d+)?\s*(?:cgpa|gpa)|first\s+division|second\s+division|distinction|merit)/i;

/**
 * Awarding bodies, which in Nepal name themselves. Used to tell the board apart
 * from the college, "Shanker Dev Campus" and "Tribhuvan University" are two
 * different fields, and an admissions office cares which is which.
 */
export const IS_BOARD = /\b(university|board|CTEVT|NEB|HSEB|council)\b/i;

/** "JAN" or "january" to "Jan", used for month names in dates. */
export const month = (s: string) => s.charAt(0).toUpperCase() + s.slice(1, 3).toLowerCase();

/** Whole-word capitalisation, for city names. */
export const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function readDates(s: string): { start: string; end: string } {
  const range = s.match(DATE_RANGE);
  if (range) {
    const start = `${range[1] ? month(range[1].trim().replace(/[.]/g, "")) + " " : ""}${range[2]}`;
    const rawEnd = range[4];
    const end = /present|current|now|ongoing|till/i.test(rawEnd)
      ? "Present"
      : `${range[3] ? month(range[3].trim().replace(/[.]/g, "")) + " " : ""}${rawEnd}`;
    return { start, end };
  }
  const single = s.match(SINGLE_YEAR);
  return { start: "", end: single?.[1] ?? "" };
}

/* --------------------------------------------------------------------------
   Splitting lines into fields
-------------------------------------------------------------------------- */

/** "Sales Officer | Amigo Traders | Kathmandu" in any of its punctuations. */
export function splitHeader(header: string): string[] {
  return header
    .replace(DATE_RANGE, "")
    .split(/\s*(?:\||,|: |: |\s-\s|\bat\b|•)\s*/i)
    .map((p) => p.replace(/^[\s:.\-|]+|[\s:.\-|]+$/g, "").trim())
    .filter((p) => p.length > 1 && !/^(?:19|20)\d{2}$/.test(p))
    .slice(0, 3);
}

export function splitList(s: string): string[] {
  return s
    .split(/[;•|]|\s{3}|\s\/\s/)
    .map((p) => p.trim().replace(/^[-*\s]+/, ""))
    .filter((p) => p.length > 1 && p.length < 60)
    .slice(0, 14);
}

/* --------------------------------------------------------------------------
   The fields that must never reach a CV
-------------------------------------------------------------------------- */

/*
 * Deliberately not /g. A global regex's .test() advances lastIndex between
 * calls, so the same pattern matches, then fails, then matches, which would
 * make the one guarantee this tool offers depend on how many times it had been
 * called. Every use is a test or a per-piece filter.
 */
export const BANNED =
  /\b(date of birth|d\.?o\.?b\.?|birth\s?date|place of birth|marital status|father'?s? name|mother'?s? name|husband'?s? name|wife'?s? name|spouse'?s? name|guardian'?s? name|caste|ethnicity|religion|sex\s*:|gender\s*:|nationality\s*:|age\s*:\s*\d{1,2}\b|citizenship (?:no|number)|passport (?:no|number)|national id|symbol (?:no|number)|registration (?:no|number)|roll (?:no|number)|pan (?:no|number)|ward (?:no|number))/i;

/**
 * Removes a banned detail from anywhere in a CV.
 *
 * Both readers need this, and the document reader needs it more: a citizenship
 * certificate is almost entirely fields that must not survive, and the
 * instruction telling a model to leave them behind is a request, not a
 * guarantee. This is the guarantee.
 *
 * It reaches the free-text fields and every bullet list. Bullets matter because
 * an experience letter routinely opens "Mr Bikash Shrestha, son of Krishna
 * Bahadur Shrestha, was employed as..." and that sentence is exactly what a
 * reader would otherwise lift verbatim into a job description.
 */
export function scrubBanned(cv: Cv): Cv {
  /*
   * Split to sentence-sized pieces before filtering, not to lines.
   *
   * Filtering whole lines threw away real content: an objective reading
   * "Seeking admission to a Master of IT programme. Date of Birth 12/04/2001."
   * is one line, and dropping the line to lose the date of birth also lost the
   * objective.
   */
  const strip = (s: string) =>
    s
      .split(/\n|(?:\s\|\s)|•|(?<=[.;])\s+/)
      .filter((part) => !BANNED.test(part))
      .join(" ")
      .replace(/\s{2}/g, " ")
      .replace(/^[\s.;,|-]+/, "")
      .trim();

  const bullets = (list: string[]) => list.map(strip).filter(Boolean);

  return {
    ...cv,
    headline: strip(cv.headline),
    summary: strip(cv.summary),
    location: strip(cv.location),
    education: cv.education.map((e) => ({ ...e, highlights: bullets(e.highlights) })),
    experience: cv.experience.map((e) => ({ ...e, highlights: bullets(e.highlights) })),
    volunteering: cv.volunteering.map((v) => ({ ...v, highlights: bullets(v.highlights) })),
    projects: cv.projects.map((pr) => ({ ...pr, highlights: bullets(pr.highlights) })),
    awards: cv.awards.map((a) => ({ ...a, note: strip(a.note) })),
  };
}
