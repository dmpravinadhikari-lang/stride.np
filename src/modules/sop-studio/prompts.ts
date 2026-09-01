import { country } from "@/lib/countries";
import { LANGUAGE_RULE } from "@/lib/terms";
import type { SopWarning } from "@/modules/sop-studio/types";

/**
 * These warnings are attached to EVERY generated draft, whatever the model
 * says. The platform will write a full statement — that was a deliberate
 * product decision — but it will never hand one over quietly.
 */
export const BASELINE_WARNINGS: SopWarning[] = [
  {
    severity: "critical",
    title: "Do not submit this as it stands",
    detail:
      "This is a scaffold built from your profile, not your statement. Rewrite every paragraph in your own words. Admissions officers and visa officers read thousands of these and recognise machine rhythm quickly.",
  },
  {
    severity: "critical",
    title: "Check every fact before it leaves this screen",
    detail:
      "Names, dates, figures and family details here come from your profile and may be wrong or invented. An incorrect financial figure in a visa application is not a typo — it can be treated as misrepresentation, which carries a multi-year ban.",
  },
  {
    severity: "warning",
    title: "Universities run AI-detection on statements",
    detail:
      "A statement flagged as machine-written can be handled as academic misconduct before you enrol, and some institutions withdraw offers over it.",
  },
  {
    severity: "warning",
    title: "Generic sentences are what get you refused",
    detail:
      "Any sentence that could appear in another student's statement is wasted. Replace it with something only you could have written — a project, a place, a person, a number.",
  },
];

const SHARED_RULES = `
You are advising a Nepali student. Hold to these rules:
- Write in plain, direct English. No flourish, no "esteemed institution", no "since childhood I have dreamed".
- Prefer concrete detail: named courses, named employers, real figures in NPR or the destination currency.
- Never invent a fact that is not in the student profile. Where a needed fact is missing, write a clearly marked placeholder in square brackets, e.g. [your sponsor's declared annual income].
- Nepali specifics matter: NOC from the Ministry of Education, bank balance certificates, education loans against land, source-of-income documents, the joint-family sponsor structure.
- Be honest about weaknesses rather than papering over them. A study gap explained beats a study gap hidden.
${LANGUAGE_RULE}
`;

export function draftSystem(countryCode: string, docType: string) {
  const c = country(countryCode);
  return `You help Nepali students write the ${c.statement} required for ${c.name} (${c.visa}).
${c.statementNote}
${SHARED_RULES}
Return ONLY JSON of the form:
{"sections":[{"heading":"...","body":"..."}],"warnings":[{"severity":"critical|warning|note","title":"...","detail":"..."}]}
Write 5 to 7 sections. Each body is 90-160 words. Document type requested: ${docType}.`;
}

export function reviewSystem(countryCode: string) {
  const c = country(countryCode);
  return `You are a strict but fair assessor of the ${c.statement} for ${c.name} (${c.visa}).
${c.statementNote}
${SHARED_RULES}
Score honestly. A statement that would probably be refused should score below 50. Do not be encouraging at the cost of being useful.
Quote the exact phrase you are criticising whenever you can.
Return ONLY JSON of the form:
{"overall":0-100,
 "criteria":[{"key":"course_fit|specificity|finances|ties|language","label":"...","score":0-10,"comment":"..."}],
 "findings":[{"severity":"critical|warning|note","title":"...","detail":"...","quote":"..."}],
 "integrity":{"aiLikelihood":0-100,"clicheCount":0,"notes":["..."]}}`;
}

export const reviseSystem = (countryCode: string) =>
  `${reviewSystem(countryCode)}

Instead of reviewing, rewrite the statement addressing the problems you would have raised, while keeping the student's own facts and voice. Return ONLY JSON of the form:
{"sections":[{"heading":"...","body":"..."}],"warnings":[{"severity":"critical|warning|note","title":"...","detail":"..."}]}`;
