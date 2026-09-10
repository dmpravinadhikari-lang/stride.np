import {
  commonLanguages, commonSkills, educationHighlights, fieldSkills, levelSkills,
  summaryFor, workPatterns, type WorkPattern,
} from "@/modules/cv/data/cv-expansions";
import { newCv, type Cv } from "./schema";

/**
 * Turning a few plain answers into a CV.
 *
 * The old builder asked for fifty fields across twelve sections. A student who
 * has finished +2 and helped in the family shop has honest answers for about
 * eight of them, so they either abandoned it or padded it, and padding a CV
 * that goes into a visa file is the worse of those two outcomes.
 *
 * So the student writes what they did in their own words and this works out the
 * rest. "helped in my uncle's shop for 6 months" becomes a role title, a date
 * range, four suggested bullets and four skills.
 *
 * NOTHING HERE IS ASSERTED. Every generated line comes back as a suggestion
 * with `chosen: false`, and only what the student ticks reaches the CV. That is
 * not politeness about wording; a bullet saying "managed stock levels" on a CV
 * filed with a visa application is a claim the student has to be able to stand
 * behind at interview, and we do not know whether they did that. The engine
 * offers the sentence. The student says whether it is true.
 *
 * Rules today, a model later. The shape of this file is the interface: a Sketch
 * in, a Draft out. Swapping the rules for a model means replacing the body of
 * `expand`, not the callers.
 */

/** What we actually ask a student for. Everything is optional except a name. */
export type Sketch = {
  name: string;
  phone: string;
  email: string;
  city: string;

  /** plus2 | bachelors | masters */
  level: string;
  field: string;
  institution: string;
  board: string;
  finished: string;
  grade: string;

  /** What they are applying for, and where. */
  target: string;
  destination: string;

  englishTest: string;
  englishScore: string;

  /** One line each, in the student's own words. */
  work: Array<{ what: string; where: string; from: string; to: string }>;

  /** Ticked from a list rather than typed. */
  skills: string[];
  /**
   * How well they say they can do one of those skills, 1 to 5.
   *
   * Optional, and absent by default. A skill with no entry is rendered without
   * a level, because the designs that draw dots must never draw a number
   * nobody gave: on a CV that goes into a visa file, a claim is a claim.
   */
  skillLevels: Record<string, number>;
  languages: string[];
};

export const emptySketch: Sketch = {
  name: "", phone: "", email: "", city: "",
  level: "", field: "", institution: "", board: "", finished: "", grade: "",
  target: "", destination: "", englishTest: "", englishScore: "",
  work: [], skills: [], skillLevels: {}, languages: [],
};

/** A line the engine produced, and whether the student has accepted it. */
export type Suggestion = { text: string; chosen: boolean };

export type Draft = {
  cv: Cv;
  /** Bullets offered per experience entry, keyed by its index. */
  offered: Record<number, Suggestion[]>;
  /** Bullets offered for the education entry. */
  educationOffered: Suggestion[];
  /** The one question worth asking about each job, keyed by index. */
  prompts: Record<number, string>;
};

/**
 * Which pattern a description belongs to.
 *
 * Longest match wins, so "call centre" beats a stray "centre" and a phrase like
 * "tuition centre" is not read as a call centre. Nothing matching is not a
 * failure: the student's own words become the role and they get the general
 * prompts instead of invented ones.
 */
export function matchPattern(text: string): WorkPattern | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ")} `;
  let best: { pattern: WorkPattern; length: number } | null = null;
  for (const pattern of workPatterns) {
    for (const raw of pattern.matches) {
      const m = raw.trim();
      if (!m) continue;
      /*
       * The fragment has to start a word.
       *
       * The old test also accepted a bare substring anywhere, so "it" matched
       * "unit" and "content" matched "contentment". Trailing characters are
       * still allowed, which is deliberate: "advertis" has to catch both
       * "advertising" and "advertisement".
       */
      if (!t.includes(` ${m}`)) continue;
      if (!best || m.length > best.length) best = { pattern, length: m.length };
    }
  }
  return best?.pattern ?? null;
}

const yearOf = (s: string): number | null => {
  const m = s.match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
};

/**
 * Distinct years covered by any job, not the sum of their lengths.
 *
 * Summing double-counts: two jobs held in the same year came out as "2 years of
 * experience", which is a claim the student cannot support at a visa interview.
 * The union is the defensible number, and where the dates are too vague to tell
 * it returns 0 and the summary simply does not mention a duration.
 */
function yearsCovered(work: Sketch["work"]): number {
  const years = new Set<number>();
  for (const w of work) {
    const a = yearOf(w.from);
    const b = yearOf(w.to) ?? (a ? new Date().getFullYear() : null);
    if (!a || !b || b < a) continue;
    for (let y = a; y < b; y += 1) years.add(y);
  }
  return years.size;
}

const titleCase = (s: string) =>
  s.trim().replace(/\s+/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());

/**
 * The skills worth putting in front of this particular student.
 *
 * The screen used to be a fixed list of ten computer packages, which asked a
 * public health graduate with two years in the field whether she could use
 * Canva. What she has is patient care, survey work and report writing, and none
 * of it was on the page, so the section came out saying nothing.
 *
 * So the list is built from what they have already told us: the work they
 * described, what they studied, and how far they took it. Each group carries
 * the reason it is there, because a student who can see why a skill was
 * suggested can judge whether it is true of them, and a group headed "from
 * your work at Ranjana Fashion" gets read, where "Skills" does not.
 *
 * The computer basics stay, last and clearly generic. Everybody does have some
 * of them, and a student whose work we could not read still needs something to
 * tick.
 */
export type SkillGroup = { group: string; why: string; items: string[] };

export function suggestSkills(sketch: Sketch): SkillGroup[] {
  const groups: SkillGroup[] = [];
  const seen = new Set<string>();

  /* Same skill from two sources is one skill. First reason wins, because the
     first is the most specific: work beats field, field beats level. */
  const add = (group: string, why: string, items: string[]) => {
    const fresh = items.filter((i) => !seen.has(i.toLowerCase()));
    if (!fresh.length) return;
    for (const i of fresh) seen.add(i.toLowerCase());
    groups.push({ group, why, items: fresh });
  };

  for (const entry of sketch.work) {
    if (!entry.what.trim() && !entry.where.trim()) continue;
    const pattern = matchPattern(`${entry.what} ${entry.where}`);
    if (!pattern) continue;
    const where = entry.where.trim();
    add(pattern.label, where ? `from your work at ${titleCase(where)}` : "from the work you described", pattern.skills);
  }

  const field = sketch.field.toLowerCase();
  if (field) {
    for (const group of fieldSkills) {
      if (group.matches.some((m) => field.includes(m.trim()))) {
        add(group.group, `usual for ${sketch.field.trim()}`, group.items);
      }
    }
  }

  const byLevel = levelSkills[sketch.level];
  if (byLevel) {
    add("Study skills", sketch.level === "masters" ? "from a postgraduate degree"
      : sketch.level === "bachelors" ? "from a bachelor's degree" : "from higher secondary", byLevel);
  }

  add("On a computer", "tick only what you have actually used", commonSkills);
  return groups;
}

/** The group a chosen skill belongs to, so the CV can head it properly. */
function groupChosenSkills(sketch: Sketch): Cv["skills"] {
  if (!sketch.skills.length) return [];
  const chosen = new Set(sketch.skills.map((s) => s.toLowerCase()));
  const out: Cv["skills"] = [];

  for (const group of suggestSkills(sketch)) {
    const items = group.items.filter((i) => chosen.has(i.toLowerCase()));
    if (items.length) out.push({ group: group.group, items });
  }

  /* Anything they typed themselves, which belongs to no group. */
  const known = new Set(out.flatMap((g) => g.items.map((i) => i.toLowerCase())));
  const own = sketch.skills.filter((s) => !known.has(s.toLowerCase()));
  if (own.length) out.push({ group: "Also", items: own });

  return out;
}

export function expand(sketch: Sketch): Draft {
  const cv: Cv = newCv();
  const offered: Record<number, Suggestion[]> = {};
  const prompts: Record<number, string> = {};

  cv.name = titleCase(sketch.name);
  cv.email = sketch.email.trim();
  cv.phone = sketch.phone.trim();
  cv.location = sketch.city.trim();

  // --- education ----------------------------------------------------------
  const educationOffered: Suggestion[] =
    (educationHighlights[sketch.level] ?? []).map((text) => ({ text, chosen: false }));

  if (sketch.institution || sketch.field) {
    cv.education = [{
      qualification: sketch.field
        ? `${sketch.level === "masters" ? "Master's" : sketch.level === "bachelors" ? "Bachelor's" : "Higher Secondary"} in ${sketch.field}`
        : "Higher Secondary",
      institution: sketch.institution,
      board: sketch.board,
      location: sketch.city,
      start: "",
      end: sketch.finished,
      grade: sketch.grade,
      highlights: [],
    }];
  }

  // --- experience ---------------------------------------------------------
  sketch.work.forEach((entry, i) => {
    if (!entry.what.trim() && !entry.where.trim()) return;
    const pattern = matchPattern(`${entry.what} ${entry.where}`);

    cv.experience.push({
      // Their own words win when they gave a real title; the pattern only fills
      // the gap, because "Sales Assistant" is not better than what they said if
      // what they said was accurate.
      role: entry.what.trim().length > 2 && entry.what.trim().split(/\s+/).length <= 5
        ? titleCase(entry.what)
        : pattern?.role ?? "Work experience",
      organisation: titleCase(entry.where),
      location: sketch.city,
      start: entry.from,
      end: entry.to,
      highlights: [],
    });

    const idx = cv.experience.length - 1;
    offered[idx] = (pattern?.bullets ?? [
      "Describe the main thing you did here in one line",
      "Say who you worked with, or who you reported to",
      "Say what you were trusted to do on your own",
    ]).map((text) => ({ text, chosen: false }));

    if (pattern?.ask) prompts[idx] = pattern.ask;
  });

  // --- skills -------------------------------------------------------------
  cv.skills = groupChosenSkills(sketch);

  // Only the ratings for skills that survived the ticking reach the document.
  const chosen = new Set(sketch.skills.map((x) => x.toLowerCase()));
  cv.skillLevels = Object.fromEntries(
    Object.entries(sketch.skillLevels ?? {}).filter(([name]) => chosen.has(name.toLowerCase())),
  );

  // --- languages, tests, summary -----------------------------------------
  cv.languages = sketch.languages.map((name) => ({
    language: name,
    level: commonLanguages.find((l) => l.name === name)?.level ?? "Conversational",
  }));

  if (sketch.englishTest && sketch.englishScore) {
    cv.tests = [{ name: sketch.englishTest, score: sketch.englishScore, date: "", detail: "" }];
  }

  cv.summary = summaryFor({
    level: sketch.level,
    field: sketch.field,
    target: sketch.target,
    destination: sketch.destination,
    hasWork: cv.experience.length > 0,
    years: yearsCovered(sketch.work),
  });

  return { cv, offered, educationOffered, prompts };
}

/** Fold the ticked suggestions back into the CV, ready to render or download. */
export function applyChoices(draft: Draft): Cv {
  return {
    ...draft.cv,
    education: draft.cv.education.map((e, i) =>
      i === 0 ? { ...e, highlights: draft.educationOffered.filter((s) => s.chosen).map((s) => s.text) } : e),
    experience: draft.cv.experience.map((x, i) => ({
      ...x,
      highlights: (draft.offered[i] ?? []).filter((s) => s.chosen).map((s) => s.text),
    })),
  };
}
