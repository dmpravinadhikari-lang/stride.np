import type { Cv } from "./schema";
import type { CvTemplate } from "@/modules/cv/data/cv-templates";
import { ruleFor } from "@/modules/cv/data/cv-templates";
import type { Brief } from "./recommend";

/**
 * The CV check.
 *
 * Entirely deterministic. No model is involved. That is a deliberate choice:
 * every finding here has to be one we can explain and one that is true whether
 * or not an API key is configured, because this check is the part of the tool a
 * student actually learns from. "Add a number to this bullet" changes how they
 * write for the rest of their life; a paragraph of generated praise changes
 * nothing.
 *
 * Findings are ordered by severity and each carries the fix, not just the
 * complaint. A checker that says "weak bullet points" without saying what a
 * strong one looks like has told the student only that they have failed.
 */

export type Severity = "must" | "should" | "polish";

export type Finding = {
  severity: Severity;
  /** The section it belongs to, for the jump link. */
  section: string;
  title: string;
  fix: string;
};

export type Review = {
  score: number;
  band: "strong" | "workable" | "needs-work";
  headline: string;
  findings: Finding[];
  /** Rough page count, from a word and line estimate. */
  pages: number;
  words: number;
};

/**
 * Verbs that open a bullet well. Not exhaustive. It does not need to be, since
 * a bullet opening on a verb outside this list still passes the check that
 * matters, which is that it does not open on "Responsible for".
 */
const STRONG_VERBS = [
  "achieved", "adapted", "advised", "analysed", "analyzed", "arranged", "assessed", "audited",
  "built", "chaired", "coached", "collected", "compiled", "completed", "conducted", "coordinated",
  "created", "cut", "delivered", "designed", "developed", "diagnosed", "documented", "doubled",
  "drafted", "drove", "edited", "established", "evaluated", "exceeded", "expanded", "facilitated",
  "founded", "grew", "handled", "headed", "implemented", "improved", "increased", "initiated",
  "installed", "instructed", "introduced", "investigated", "launched", "led", "maintained",
  "managed", "mentored", "negotiated", "operated", "organised", "organized", "oversaw", "planned",
  "prepared", "presented", "processed", "produced", "programmed", "published", "raised", "ran",
  "recruited", "redesigned", "reduced", "reorganised", "reported", "researched", "resolved",
  "restructured", "reviewed", "revised", "saved", "scheduled", "secured", "selected", "served",
  "simplified", "solved", "sourced", "streamlined", "strengthened", "supervised", "supported",
  "surveyed", "taught", "tested", "trained", "translated", "tripled", "updated", "upgraded",
  "won", "wrote",
];

/** Openings that waste the most valuable four words on the page. */
const WEAK_OPENINGS = [
  "responsible for",
  "duties included",
  "in charge of",
  "worked on",
  "worked as",
  "helped with",
  "involved in",
  "tasked with",
  "was part of",
  "assisted in",
];

const FIRST_PERSON = /\b(i|my|me|myself|we|our)\b/i;
const HAS_NUMBER = /\d/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2}$/;

/** Words on the page, used for the length estimate. */
function countWords(cv: Cv): number {
  let words = 0;
  const add = (s: string) => (words += s.trim() ? s.trim().split(/\s+/).length : 0);

  add(cv.name);
  add(cv.headline);
  add(cv.summary);
  for (const e of cv.education) [e.qualification, e.institution, e.board, e.grade, ...e.highlights].forEach(add);
  for (const e of cv.experience) [e.role, e.organisation, ...e.highlights].forEach(add);
  for (const p of cv.projects) [p.title, p.context, ...p.highlights].forEach(add);
  for (const s of cv.skills) [s.group, ...s.items].forEach(add);
  for (const t of cv.tests) [t.name, t.score, t.detail].forEach(add);
  for (const c of cv.certifications) [c.title, c.issuer].forEach(add);
  for (const p of cv.publications) [p.title, p.venue].forEach(add);
  for (const v of cv.volunteering) [v.role, v.organisation, ...v.highlights].forEach(add);
  for (const a of cv.awards) [a.title, a.issuer, a.note].forEach(add);
  for (const r of cv.referees) [r.name, r.role, r.organisation].forEach(add);
  return words;
}

/** All bullets, tagged with where they came from so the finding can point. */
function allBullets(cv: Cv): { section: string; text: string }[] {
  const out: { section: string; text: string }[] = [];
  for (const e of cv.experience) for (const t of e.highlights) out.push({ section: "Work experience", text: t });
  for (const v of cv.volunteering) for (const t of v.highlights) out.push({ section: "Volunteering", text: t });
  for (const p of cv.projects) for (const t of p.highlights) out.push({ section: "Projects", text: t });
  for (const e of cv.education) for (const t of e.highlights) out.push({ section: "Education", text: t });
  return out;
}

export function reviewCv(cv: Cv, template: CvTemplate, brief: Brief): Review {
  const findings: Finding[] = [];
  const must = (section: string, title: string, fix: string) => findings.push({ severity: "must", section, title, fix });
  const should = (section: string, title: string, fix: string) => findings.push({ severity: "should", section, title, fix });
  const polish = (section: string, title: string, fix: string) => findings.push({ severity: "polish", section, title, fix });

  // --- Contact. A CV nobody can reply to has failed at the only thing it must
  // do, so these are the only findings that can take the score below 50.
  if (!cv.name.trim()) must("Your details", "No name on the CV", "Put your full name as it appears on your passport at the top.");
  if (!cv.email.trim()) {
    must("Your details", "No email address", "Admissions offices reply by email, almost never by phone. Add one.");
  } else if (!EMAIL_OK.test(cv.email.trim())) {
    must("Your details", "That email address will not work", "Check for a missing @ or a typo in the domain.");
  }
  if (!cv.phone.trim()) {
    should("Your details", "No phone number", "Add your number with the country code: +977 98…, so it is dialable from abroad.");
  } else if (!cv.phone.includes("+")) {
    polish("Your details", "Phone number has no country code", "Write it as +977 9801234567. A number without +977 cannot be dialled from the UK.");
  }
  if (!cv.location.trim()) {
    polish("Your details", "No location", "\"Kathmandu, Nepal\" is enough. Never your full street address.");
  }

  // --- Education. The one section a student CV cannot be without.
  if (!cv.education.length) {
    must("Education", "No education section", "This is the section admissions officers look for first. Add your most recent qualification at least.");
  } else {
    const undated = cv.education.filter((e) => !e.end.trim() && !e.start.trim()).length;
    if (undated) {
      should("Education", `${undated} qualification${undated > 1 ? "s" : ""} with no dates`, "Add at least the completion year. An undated qualification reads as one being hidden.");
    }
    const ungraded = cv.education.filter((e) => !e.grade.trim()).length;
    if (ungraded === cv.education.length) {
      should("Education", "No marks anywhere", "Add your percentage or GPA. Leaving it off is read as a bad result, not as modesty.");
    }
    const noBoard = cv.education.filter((e) => !e.board.trim() && !e.institution.trim()).length;
    if (noBoard) polish("Education", "A qualification with no institution", "Name the school, college or university, and the board or university it sits under.");
  }

  // --- English tests, which for a study-abroad CV are load-bearing.
  if (!cv.tests.length && brief.purpose !== "job") {
    should("English & entrance tests", "No English test score", "If you have taken IELTS, PTE, TOEFL or Duolingo, put it on the CV. If you have not taken one yet, leave this out rather than writing \"planned\".");
  }

  // --- Experience, and the bullets, which is where most CVs are actually lost.
  const bullets = allBullets(cv);
  if (cv.experience.length && !cv.experience.some((e) => e.highlights.length)) {
    should("Work experience", "Job titles with nothing under them", "Two or three bullets each. What you did, and what changed because you did it.");
  }

  const weak = bullets.filter((b) => WEAK_OPENINGS.some((w) => b.text.toLowerCase().trimStart().startsWith(w)));
  if (weak.length) {
    should(
      weak[0].section,
      `${weak.length} bullet${weak.length > 1 ? "s" : ""} starting with "${firstWords(weak[0].text, 3)}"`,
      "Open on a verb instead. \"Responsible for the front desk\" becomes \"Handled 40 walk-in enquiries a day\".",
    );
  }

  const pronouns = bullets.filter((b) => FIRST_PERSON.test(firstWords(b.text, 2)));
  if (pronouns.length) {
    polish(pronouns[0].section, `${pronouns.length} bullet${pronouns.length > 1 ? "s" : ""} written in the first person`, "Drop the \"I\". \"I managed the shop\" becomes \"Managed the shop\": it is the CV convention everywhere.");
  }

  const noVerb = bullets.filter((b) => {
    const first = firstWords(b.text, 1).toLowerCase().replace(/[^a-z]/g, "");
    return first.length > 2 && !STRONG_VERBS.includes(first) && !FIRST_PERSON.test(first);
  });
  if (noVerb.length >= Math.max(2, Math.ceil(bullets.length * 0.5)) && bullets.length >= 3) {
    polish(noVerb[0].section, "Most bullets do not start with an action verb", "Led, built, managed, cut, delivered, taught. The first word carries the bullet.");
  }

  const unquantified = bullets.filter((b) => !HAS_NUMBER.test(b.text));
  if (bullets.length >= 3 && unquantified.length === bullets.length) {
    should(unquantified[0].section, "No numbers anywhere in your bullets", "One number per bullet where you honestly have one: how many students, how many rupees, how many hours a week, how much faster.");
  }

  const longBullets = bullets.filter((b) => b.text.split(/\s+/).length > 32);
  if (longBullets.length) {
    polish(longBullets[0].section, `${longBullets.length} bullet${longBullets.length > 1 ? "s are" : " is"} too long`, "Two lines maximum. A bullet that runs to four lines is a paragraph wearing a dot.");
  }

  // --- Profile.
  const summaryWords = cv.summary.trim() ? cv.summary.trim().split(/\s+/).length : 0;
  if (!summaryWords) {
    should("Personal profile", "No personal profile", "Three or four lines at the top: what you have completed, what you are applying for, and one thing you are good at.");
  } else if (summaryWords > 90) {
    should("Personal profile", "Profile is too long", `${summaryWords} words. Cut it to about 50. The profile exists to buy you the next fifteen seconds, not to tell the whole story.`);
  }
  if (FIRST_PERSON.test(cv.summary) && summaryWords > 0) {
    polish("Personal profile", "Profile is written in the first person", "Either commit to \"I\" throughout the profile or drop it entirely. Half and half is what looks careless.");
  }

  // --- Skills.
  if (!cv.skills.length) {
    should("Skills", "No skills section", "Group them: technical, software, languages, laboratory. An ungrouped list of fifteen skills reads as noise.");
  } else {
    const ungrouped = cv.skills.filter((s) => !s.group.trim());
    if (ungrouped.length) polish("Skills", "A skills group with no heading", "Name each group: \"Software\", \"Laboratory\", \"Teaching\".");
    const soft = cv.skills.flatMap((s) => s.items).filter((i) => /^(hard.?working|team.?player|punctual|honest|sincere|dedicated|responsible|good communication)/i.test(i.trim()));
    if (soft.length >= 2) {
      should("Skills", "Several skills nobody can verify", `"${soft[0]}" appears on almost every CV and is never checked. Replace with something specific: a piece of software, a technique, a language, a certification.`);
    }
  }

  // --- What the template asked for and did not get.
  for (const section of template.encourage) {
    const value = cv[section];
    const empty = Array.isArray(value) ? value.length === 0 : !String(value).trim();
    if (empty && !findings.some((f) => f.section.toLowerCase().startsWith(String(section).slice(0, 5)))) {
      polish(
        String(section),
        `The ${template.name.toLowerCase()} pattern leads on ${sectionWord(section)}, and yours is empty`,
        `Either fill it or switch pattern. A CV whose strongest section is blank is being read in the wrong shape.`,
      );
    }
  }

  // --- Referees, per destination convention.
  const rule = ruleFor(brief.destination);
  if (rule) {
    const wantsReferees = brief.destination === "australia" || brief.destination === "new-zealand";
    if (wantsReferees && !cv.referees.length) {
      should("Referees", `${rule.label} expects named referees`, "Two, with their role and how to reach them. Ask them first, and warn them a call may come.");
    }
    if (!wantsReferees && cv.referees.some((r) => r.phone.trim() || r.email.trim())) {
      polish("Referees", `${rule.label} does not expect referee contact details on the CV`, "\"Referees available on request\" is the convention there. It also keeps your referee's number off a document you email widely.");
    }
  }
  if (cv.referees.some((r) => !r.role.trim() && !r.organisation.trim())) {
    polish("Referees", "A referee with no role", "A name alone means nothing. Give their job title and where they work, that is what makes the reference worth having.");
  }

  // --- Length.
  const words = countWords(cv);
  const pages = estimatePages(cv, words);
  const cap = template.id === "research" ? 3 : template.pages.startsWith("1 page") ? 1 : 2;
  if (pages > cap) {
    should(
      "Length",
      `About ${pages} pages, and the ${template.name.toLowerCase()} pattern should be ${template.pages.toLowerCase()}`,
      "Cut the oldest entries and the bullets that describe duties rather than results. Nothing from before your last qualification usually survives.",
    );
  }
  if (words < 120 && cv.education.length) {
    should("Length", "The CV is very thin", "Under 120 words of content. Add bullets to your education and any project, volunteering or part-time work. An empty CV is worse than a short one.");
  }

  // --- Score. Starts at 100, each finding costs by severity, and the contact
  // failures are weighted hardest because they make the rest irrelevant.
  const cost = { must: 16, should: 7, polish: 3 } as const;
  let score = 100;
  for (const f of findings) score -= cost[f.severity];
  score = Math.max(4, Math.min(100, score));

  const band: Review["band"] = score >= 82 ? "strong" : score >= 58 ? "workable" : "needs-work";

  return {
    score,
    band,
    headline:
      band === "strong"
        ? "This is a CV you can send."
        : band === "workable"
          ? "Sendable, but you are leaving marks on the table."
          : "Worth fixing before you send this anywhere.",
    findings: findings.sort((a, b) => order(a.severity) - order(b.severity)),
    pages,
    words,
  };
}

const order = (s: Severity) => (s === "must" ? 0 : s === "should" ? 1 : 2);

/**
 * Page estimate.
 *
 * Words alone underestimate badly, because a CV's height comes from its entry
 * headings and bullet rows as much as its prose, twelve one-line bullets take
 * far more vertical space than a 100-word paragraph. So lines are counted too.
 */
function estimatePages(cv: Cv, words: number): number {
  let lines = 6; // name, headline, contact row, spacing
  const entries =
    cv.education.length + cv.experience.length + cv.projects.length + cv.volunteering.length + cv.publications.length;
  lines += entries * 3;
  lines += cv.skills.length + cv.tests.length + cv.certifications.length + cv.awards.length + cv.languages.length;
  lines += cv.referees.length * 3;
  const bulletLines = allBullets(cv).reduce((n, b) => n + Math.max(1, Math.ceil(b.text.split(/\s+/).length / 14)), 0);
  lines += bulletLines;
  lines += Math.ceil(words / 200); // section headings and general prose overflow
  return Math.max(1, Math.round((lines / 44) * 10) / 10);
}

function firstWords(s: string, n: number): string {
  return s.trim().split(/\s+/).slice(0, n).join(" ");
}

function sectionWord(section: string): string {
  const map: Record<string, string> = {
    education: "your education",
    experience: "your work experience",
    skills: "your skills",
    projects: "your projects",
    publications: "your publications",
    volunteering: "your volunteering and leadership",
    tests: "your test scores",
    summary: "your personal profile",
    awards: "your awards",
    certifications: "your certifications",
    referees: "your referees",
    languages: "your languages",
  };
  return map[section] ?? section;
}
