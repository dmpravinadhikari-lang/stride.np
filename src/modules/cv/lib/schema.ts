import { z } from "zod";

/**
 * The CV data model.
 *
 * Every field is a string or an array, and every field has a default. That is
 * deliberate: this same schema validates three very different inputs, a form a
 * student types by hand, JSON returned by the extraction model when they upload
 * an old CV, and whatever was left in localStorage by a half-finished session
 * three weeks ago. A schema that threw on a missing key would turn all three
 * into an error screen, so instead anything absent becomes empty and the
 * student sees the gap in the form where they can fill it.
 *
 * What is NOT collected here matters as much as what is. There is no photo, no
 * date of birth, no marital status, no gender, no father's name and no caste.
 * Nepali CV convention includes most of those, and in the UK, USA and Canada
 * they are exactly what gets a CV binned, a recruiter or admissions officer
 * who cannot lawfully consider them will often discard the document rather than
 * risk having seen them. Leaving the fields out of the model is the only way to
 * be sure they never reach the page.
 */

/**
 * A forgiving string. The extraction model occasionally returns a number for a
 * year or null for a field it could not find; both become "" rather than
 * failing the whole parse and losing the other twenty fields with it.
 */
const text = (max: number) =>
  z.preprocess(
    (v) => (v == null ? "" : typeof v === "string" ? v : typeof v === "number" ? String(v) : ""),
    z.string().trim().max(max),
  );

/** Bullet lists. Empty strings are dropped so a trailing blank row never prints. */
const bullets = (max: number, count: number) =>
  z
    .preprocess(
      (v) => (Array.isArray(v) ? v : typeof v === "string" && v.trim() ? [v] : []),
      z.array(text(max)),
    )
    .transform((list) => list.filter(Boolean).slice(0, count))
    .default([]);

const Link = z.object({
  label: text(40),
  url: text(300),
});

const Education = z.object({
  qualification: text(140),
  institution: text(160),
  /** NEB, Tribhuvan University, Pokhara University, the board matters abroad. */
  board: text(120),
  location: text(120),
  start: text(24),
  end: text(24),
  /** Whatever the student actually has: "78.4%", "3.6 GPA", "First Division". */
  grade: text(60),
  highlights: bullets(300, 6),
});

const Experience = z.object({
  role: text(140),
  organisation: text(160),
  location: text(120),
  start: text(24),
  end: text(24),
  highlights: bullets(300, 8),
});

const Project = z.object({
  title: text(140),
  context: text(160),
  year: text(24),
  url: text(300),
  highlights: bullets(300, 6),
});

/** Grouped, because "Skills: Python, teamwork, Excel" in one line reads as noise. */
const SkillGroup = z.object({
  group: text(60),
  items: bullets(60, 14),
});

/** IELTS, PTE, TOEFL, Duolingo, SAT, GRE. Its own section: for a study-abroad
 *  CV this is the first thing an admissions officer looks for. */
const TestScore = z.object({
  name: text(60),
  score: text(40),
  date: text(24),
  /** Band breakdown: "L7.5 R7.0 W6.5 S7.0". Often what secures a waiver. */
  detail: text(120),
});

const Certification = z.object({
  title: text(160),
  issuer: text(160),
  year: text(24),
  url: text(300),
});

const Publication = z.object({
  title: text(300),
  venue: text(200),
  year: text(24),
  url: text(300),
});

const Volunteering = z.object({
  role: text(140),
  organisation: text(160),
  start: text(24),
  end: text(24),
  highlights: bullets(300, 5),
});

const Language = z.object({
  language: text(60),
  /** "Native", "Fluent", "C1", "Working knowledge". */
  level: text(60),
});

const Award = z.object({
  title: text(160),
  issuer: text(160),
  year: text(24),
  note: text(240),
});

const Referee = z.object({
  name: text(120),
  role: text(140),
  organisation: text(160),
  email: text(160),
  phone: text(40),
});

export const CvSchema = z.object({
  name: text(120),
  /** "BSc Computer Science graduate", one line under the name, not a job title. */
  headline: text(140),
  email: text(160),
  phone: text(40),
  location: text(120),
  links: z.array(Link).max(6).default([]),
  summary: text(900),
  education: z.array(Education).max(8).default([]),
  experience: z.array(Experience).max(12).default([]),
  projects: z.array(Project).max(8).default([]),
  skills: z.array(SkillGroup).max(6).default([]),
  tests: z.array(TestScore).max(6).default([]),
  certifications: z.array(Certification).max(10).default([]),
  publications: z.array(Publication).max(12).default([]),
  volunteering: z.array(Volunteering).max(8).default([]),
  /*
   * How well the student says they can do a named skill, 1 to 5.
   *
   * Kept beside the skills rather than inside them, so a skill can exist
   * without a rating and nothing has to be invented to render it. Only the
   * designs that draw dots read this, and they draw nothing where there is no
   * entry: a made-up "4 out of 5" against MS Excel on a document that goes
   * into a visa file is a claim the student has to be able to stand behind.
   */
  skillLevels: z.record(z.string(), z.number().min(1).max(5)).default({}),
  languages: z.array(Language).max(8).default([]),
  awards: z.array(Award).max(10).default([]),
  referees: z.array(Referee).max(4).default([]),
});

export type Cv = z.infer<typeof CvSchema>;
export type CvSection = keyof Pick<
  Cv,
  | "summary"
  | "education"
  | "experience"
  | "projects"
  | "skills"
  | "tests"
  | "certifications"
  | "publications"
  | "volunteering"
  | "languages"
  | "awards"
  | "referees"
>;

/**
 * A blank CV, fresh every time.
 *
 * USE THIS, never `{ ...emptyCv }`.
 *
 * A spread is a shallow copy, so every "blank" CV made that way shared one set
 * of arrays with every other. `expand()` did exactly that and then pushed each
 * job onto `cv.experience`, which was really the shared array, so the entries
 * never went away. Typing "Marketing Manager" into the live preview produced
 * eleven jobs called "Mar", "Mark", "Marke" and so on, one per keystroke, and
 * the page count climbed to thirteen. Nothing in the code looked wrong at the
 * call site, which is why this is a function now.
 */
export const newCv = (): Cv => ({
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  summary: "",
  education: [],
  experience: [],
  projects: [],
  skills: [],
  tests: [],
  certifications: [],
  publications: [],
  volunteering: [],
  skillLevels: {},
  languages: [],
  awards: [],
  referees: [],
});

/**
 * The same thing as a constant, deeply frozen.
 *
 * Frozen on purpose: it is handed out as an initial value in several places,
 * and the freeze turns the silent corruption above into an immediate, obvious
 * error the first time anything tries to write through it.
 */
export const emptyCv: Cv = (() => {
  const cv = newCv();
  for (const value of Object.values(cv)) if (Array.isArray(value)) Object.freeze(value);
  return Object.freeze(cv);
})();

/** Blank rows, so "Add another" always inserts something the form can render. */
export const blank = {
  education: (): Cv["education"][number] => ({
    qualification: "",
    institution: "",
    board: "",
    location: "",
    start: "",
    end: "",
    grade: "",
    highlights: [],
  }),
  experience: (): Cv["experience"][number] => ({
    role: "",
    organisation: "",
    location: "",
    start: "",
    end: "",
    highlights: [],
  }),
  projects: (): Cv["projects"][number] => ({ title: "", context: "", year: "", url: "", highlights: [] }),
  skills: (): Cv["skills"][number] => ({ group: "", items: [] }),
  tests: (): Cv["tests"][number] => ({ name: "", score: "", date: "", detail: "" }),
  certifications: (): Cv["certifications"][number] => ({ title: "", issuer: "", year: "", url: "" }),
  publications: (): Cv["publications"][number] => ({ title: "", venue: "", year: "", url: "" }),
  volunteering: (): Cv["volunteering"][number] => ({ role: "", organisation: "", start: "", end: "", highlights: [] }),
  languages: (): Cv["languages"][number] => ({ language: "", level: "" }),
  awards: (): Cv["awards"][number] => ({ title: "", issuer: "", year: "", note: "" }),
  referees: (): Cv["referees"][number] => ({ name: "", role: "", organisation: "", email: "", phone: "" }),
  links: (): Cv["links"][number] => ({ label: "", url: "" }),
};

/** True when a row holds nothing worth printing. Used to drop empties on save. */
export function isBlankRow(row: unknown): boolean {
  if (row == null || typeof row !== "object") return true;
  return Object.values(row as Record<string, unknown>).every((v) =>
    Array.isArray(v) ? v.filter(Boolean).length === 0 : !String(v ?? "").trim(),
  );
}

/**
 * Parses anything into a Cv, keeping whatever was valid.
 *
 * Used on the extraction model's output and on localStorage. Neither is
 * trusted, and for both a partial CV is far more useful than an exception.
 */
export function parseCv(input: unknown): Cv {
  const parsed = CvSchema.safeParse(input);
  if (parsed.success) return tidy(parsed.data);

  // Field by field, so one bad key costs one field rather than the document.
  const out: Record<string, unknown> = newCv() as unknown as Record<string, unknown>;
  if (input && typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (!(key in emptyCv)) continue;
      const field = (CvSchema.shape as Record<string, z.ZodTypeAny>)[key];
      const one = field?.safeParse(value);
      if (one?.success) out[key] = one.data;
    }
  }
  return tidy(out as Cv);
}

/** Drops empty rows, which accumulate as students add and abandon sections. */
export function tidy(cv: Cv): Cv {
  const out = { ...cv };
  for (const key of Object.keys(out) as (keyof Cv)[]) {
    const value = out[key];
    if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[key] = value.filter((row) => !isBlankRow(row));
    }
  }
  return out;
}

/** Sections carrying content, in the order the template asked for them. */
export function filledSections(cv: Cv, order: CvSection[]): CvSection[] {
  return order.filter((s) => {
    const value = cv[s];
    return Array.isArray(value) ? value.length > 0 : !!String(value).trim();
  });
}
