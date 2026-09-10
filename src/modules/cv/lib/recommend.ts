import { cvTemplates, type CvTemplate, type TemplateId } from "@/modules/cv/data/cv-templates";

/**
 * Which CV pattern suits this student.
 *
 * Scored rather than branched, for the same reason the eligibility check is
 * scored: a student with three years of work applying for a PhD is not an edge
 * case to be special-cased, they are a student for whom two patterns both score
 * well and the difference should be shown rather than hidden. Every pattern
 * comes back ranked with the reason it placed where it did, and the student can
 * take the second one if they disagree.
 */

export type Purpose = "university" | "scholarship" | "job" | "research";

export type Brief = {
  purpose: Purpose | "";
  /** Highest qualification completed. */
  level: "plus2" | "bachelors" | "masters" | "";
  /** What they are applying for next. */
  target: "diploma" | "bachelors" | "masters" | "phd" | "";
  /** Full-time paid work, in months. Internships count at half. */
  experienceMonths: number | null;
  /** A break of a year or more in study or work. */
  gap: "none" | "under1" | "1to2" | "over2" | "";
  /** A thesis, paper, poster or conference presentation. */
  research: "none" | "thesis" | "published" | "";
  /** Destination slug, or "" while undecided. */
  destination: string;
};

export const emptyBrief: Brief = {
  purpose: "",
  level: "",
  target: "",
  experienceMonths: null,
  gap: "",
  research: "",
  destination: "",
};

export type Recommendation = {
  template: CvTemplate;
  score: number;
  /** Why this one, in one sentence addressed to the student. */
  reason: string;
  /** The honest counter-argument, shown on anything not ranked first. */
  caveat?: string;
};

const PURPOSE_LABEL: Record<Purpose, string> = {
  university: "a university application",
  scholarship: "a scholarship application",
  job: "a part-time or graduate job",
  research: "a research or PhD application",
};

export const purposes: { value: Purpose; label: string; hint: string }[] = [
  { value: "university", label: "Applying to a university", hint: "A bachelor's, diploma or taught master's." },
  { value: "scholarship", label: "Applying for a scholarship", hint: "Chevening, Commonwealth, GREAT, university awards." },
  { value: "job", label: "A job once I am there", hint: "Part-time work while studying, or a graduate role after." },
  { value: "research", label: "A PhD or research place", hint: "Where a supervisor reads it before an admissions office does." },
];

/**
 * Months of experience, asked as bands because nobody knows their own figure to
 * the month and a slider invites a guess that then looks like a claim.
 */
export const experienceBands: { label: string; months: number }[] = [
  { label: "None yet", months: 0 },
  { label: "Internships only", months: 4 },
  { label: "Under a year", months: 8 },
  { label: "1 to 2 years", months: 18 },
  { label: "3 to 5 years", months: 42 },
  { label: "More than 5 years", months: 72 },
];

export function recommend(brief: Brief): Recommendation[] {
  const months = brief.experienceMonths ?? 0;
  const hasGap = brief.gap === "1to2" || brief.gap === "over2";
  const researchy = brief.research === "published" || brief.research === "thesis";

  const scored = cvTemplates.map((template): Recommendation => {
    let score = 0;
    const reasons: string[] = [];
    let caveat: string | undefined;

    switch (template.id) {
      case "fresher": {
        score = 42;
        if (brief.level === "plus2") {
          score += 26;
          reasons.push("you have finished +2, so your marks and your board are the strongest thing on the page");
        }
        if (brief.target === "bachelors" || brief.target === "diploma") {
          score += 18;
          reasons.push("undergraduate admissions read education first and experience barely at all");
        }
        if (months <= 8) {
          score += 16;
          reasons.push("with little paid work yet, an experience section would look thin");
        } else {
          score -= Math.min(30, (months - 8) / 2);
          caveat = "You have real work experience now, and this pattern pushes it down the page.";
        }
        if (brief.purpose === "job") {
          score -= 22;
          caveat = "For a job application an employer wants what you have done before what you studied.";
        }
        if (brief.target === "phd") {
          score -= 26;
          caveat = "A PhD application is read by academics who look for research before anything else.";
        }
        break;
      }

      case "professional": {
        score = 34;
        score += Math.min(32, months / 2);
        if (months >= 18) reasons.push(`${bandLabel(months)} of work is the first thing worth reading about you`);
        if (brief.purpose === "job") {
          score += 22;
          reasons.push("employers abroad scan for roles and dates before they look at your degree");
        }
        if (brief.target === "masters") {
          score += 14;
          reasons.push("master's admissions treat relevant experience as evidence your course choice is genuine");
        }
        if (months < 8) {
          score -= 26;
          caveat = "With under a year of work, leading on experience draws attention to how little there is.";
        }
        if (brief.target === "phd") score -= 12;
        break;
      }

      case "skills": {
        score = 28;
        if (hasGap) {
          score += 30;
          reasons.push("it opens on what you can do, so a gap is not the first thing anyone reads");
        }
        if (brief.purpose === "job") {
          score += 18;
          reasons.push("a skills block near the top is what an employer's tracking system matches against");
        }
        if (months > 0 && months < 18) {
          score += 10;
          reasons.push("short or scattered jobs read better grouped by skill than listed one by one");
        }
        if (!hasGap) {
          score -= 14;
          caveat = "Your history looks straightforward, and a skills-first CV invites the question of what it is hiding.";
        }
        if (brief.target === "phd") score -= 20;
        break;
      }

      case "research": {
        score = 18;
        if (brief.target === "phd" || brief.purpose === "research") {
          score += 40;
          reasons.push("a supervisor reads this before an admissions office does, and they look for method and output");
        }
        if (brief.research === "published") {
          score += 24;
          reasons.push("you have something published, which belongs on page one rather than buried");
        } else if (brief.research === "thesis") {
          score += 12;
          reasons.push("your thesis is research output and this pattern gives it a section of its own");
        }
        if (brief.destination === "usa" && brief.target === "phd") {
          score += 8;
          reasons.push("US graduate assistantships are awarded on this document");
        }
        if (brief.level === "plus2") {
          score -= 34;
          caveat = "This pattern expects research output you will not have yet at +2 level.";
        }
        if (!researchy && brief.target !== "phd" && brief.purpose !== "research") {
          score -= 24;
          caveat = "Without research output, an academic CV reads as off-target.";
        }
        break;
      }

      case "scholarship": {
        score = 24;
        if (brief.purpose === "scholarship") {
          score += 40;
          reasons.push("funding panels score leadership and impact, which this pattern puts before your marks");
        }
        if (months >= 18 && brief.purpose === "scholarship") {
          score += 12;
          reasons.push("Chevening and Commonwealth both want work experience, and yours qualifies");
        }
        if (brief.purpose !== "scholarship") {
          score -= 20;
          caveat = "Built for funding panels. A university admissions office wants a plainer document.";
        }
        break;
      }
    }

    // The purpose is always worth one plain sentence, because a student who
    // picked "a job once I am there" should see that the tool heard them.
    if (!reasons.length && brief.purpose) {
      reasons.push(`it is a reasonable general shape for ${PURPOSE_LABEL[brief.purpose as Purpose]}`);
    }

    return {
      template,
      score: Math.max(0, Math.min(100, Math.round(score))),
      reason: sentence(reasons),
      caveat,
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/** The winner, plus the runner-up worth showing beside it. */
export function best(brief: Brief): { top: Recommendation; alternative: Recommendation | null } {
  const ranked = recommend(brief);
  const [top, second] = ranked;
  // Only offer an alternative when it is genuinely close. A second choice 40
  // points behind is not a choice, it is a distraction.
  const alternative = second && top.score - second.score <= 18 ? second : null;
  return { top, alternative };
}

export const isComplete = (brief: Brief) =>
  !!brief.purpose && !!brief.level && !!brief.target && brief.experienceMonths != null;

function bandLabel(months: number): string {
  if (months >= 72) return "More than five years";
  if (months >= 42) return "Three to five years";
  if (months >= 18) return "One to two years";
  if (months >= 8) return "Under a year";
  return "A few months";
}

function sentence(parts: string[]): string {
  if (!parts.length) return "A safe, plain pattern that suits most applications.";
  const first = parts[0];
  const head = first.charAt(0).toUpperCase() + first.slice(1);
  return parts.length === 1 ? `${head}.` : `${head}, and ${parts.slice(1, 2).join("")}.`;
}

export type { TemplateId };
