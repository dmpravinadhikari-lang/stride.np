import type { Cv } from "./schema";
import { filledSections } from "./schema";
import { sectionLabels, type CvTemplate } from "@/modules/cv/data/cv-templates";

/**
 * Getting the finished CV off the site, in three formats, for free.
 *
 *   PDF, the browser's own print-to-PDF. This produces real, selectable,
 *           vector text, which is what an applicant tracking system needs to
 *           read. The alternative, rasterising the page onto a canvas and
 *           wrapping it in a PDF, which is how most free CV builders do it, 
 *           produces a picture of a CV. It looks identical to the student and
 *           is completely unreadable to the system that screens it. That is the
 *           single worst thing this tool could do to somebody, so it does not
 *           do it, and it costs no dependency to avoid.
 *
 *   Word, the CV's own markup with a Word-targeted stylesheet, served as
 *           .doc. Word opens it as an editable document. Needed because a fair
 *           number of universities and agents still ask for Word, and because a
 *           student who wants to change one line six months from now should not
 *           have to come back here to do it.
 *
 *   Text, for pasting into the online application forms that give you a
 *           textarea and strip every bit of formatting you paste into it.
 *
 * All three are ungated. No email, no sign-up, no watermark, no "upgrade to
 * remove branding". The tool is the advertisement.
 */

/** "Ram Bahadur Thapa" → "Ram-Bahadur-Thapa-CV". */
export function cvFilename(name: string, ext: string): string {
  const stem =
    name
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-{2}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "My";
  return `${stem}-CV.${ext}`;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick rather than immediately: Safari has not finished
  // with the URL when click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Word's HTML support is roughly Internet Explorer's, so this stylesheet uses
 * none of what the on-screen document uses: no flexbox, no zoom, no mm. The
 * dates float instead, headings are bordered rather than filled, and lengths
 * are in points. Same markup, same class names, different rendering engine, 
 * which is why it is a second stylesheet and not a copy of the first.
 */
const WORD_CSS = `
@page WordSection1 { size: 595.3pt 841.9pt; margin: 40pt 45pt; }
div.WordSection1 { page: WordSection1; }
body { font-family: Calibri, Arial, sans-serif; font-size: 10.5pt; color: #111; line-height: 1.35; }
h1, h2, h3 { margin: 0; font-family: Calibri, Arial, sans-serif; }
a { color: #111; text-decoration: none; }
.cv-name { font-size: 21pt; font-weight: bold; color: #05617F; margin: 0 0 2pt 0; }
.cv-headline { font-size: 11pt; font-weight: bold; color: #333; margin: 0 0 3pt 0; }
.cv-contact { font-size: 9.5pt; color: #333; margin: 0 0 10pt 0; }
.cv-sep { color: #999; }
.cv-section { margin-top: 12pt; }
.cv-h { font-size: 10.5pt; font-weight: bold; color: #05617F; text-transform: uppercase;
        letter-spacing: 1pt; border-bottom: 1pt solid #05617F; padding-bottom: 2pt; margin: 0 0 5pt 0; }
.cv-entry { margin-top: 8pt; }
.cv-entry-top { }
.cv-role { font-size: 10.5pt; font-weight: bold; color: #111; display: inline; }
.cv-dates { float: right; font-size: 9.5pt; color: #444; }
.cv-org { font-size: 9.8pt; color: #444; margin: 1pt 0 0 0; clear: both; }
.cv-summary { font-size: 10pt; margin: 0; }
.cv-bullets { margin: 3pt 0 0 0; padding-left: 14pt; }
.cv-bullets li { font-size: 10pt; margin: 0 0 2pt 0; }
.cv-defs { margin: 0; padding: 0; list-style: none; }
.cv-defs li { font-size: 10pt; margin: 0 0 3pt 0; list-style: none; }
.cv-def-key { font-weight: bold; color: #111; }
.cv-pubs { margin: 0; padding-left: 16pt; font-size: 10pt; }
.cv-pubs li { margin: 0 0 4pt 0; }
.cv-refs { }
.cv-ref-name { font-size: 10pt; font-weight: bold; margin: 6pt 0 0 0; }
`;

/**
 * Builds the Word document from the CV's live markup.
 *
 * The markup is read out of the hidden print copy rather than rebuilt from the
 * data, so there is exactly one place that decides what a CV looks like. The
 * accent class is dropped because Word does not resolve CSS custom properties
 * and would leave every heading black.
 */
export function downloadWord(hostHtml: string, name: string): void {
  const body = hostHtml
    // Word does not resolve CSS custom properties, so the accent class would
    // leave every heading black. The Word stylesheet sets the colour outright.
    .replace(/ class="cv-doc[^"]*"/, ' class="cv-doc"')
    /*
     * The dates move ahead of the job title.
     *
     * On screen the entry heading is a flex row and source order is irrelevant.
     * Word's engine is roughly Internet Explorer's, where a right-floated
     * element only pulls up onto the line above if it comes first in the
     * source, otherwise every date lands on its own line and the CV grows by a
     * page. Same markup, reordered for a different renderer.
     */
    .replace(
      /(<h3 class="cv-role">[\s\S]*?<\/h3>)(<span class="cv-dates">[\s\S]*?<\/span>)/g,
      "$2$1",
    );

  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(name || "CV")}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>${WORD_CSS}</style></head>
<body><div class="WordSection1">${body}</div></body></html>`;

  saveBlob(
    // The BOM is what makes Word read it as UTF-8 rather than as Windows-1252,
    // which is the difference between "Bhandari" and a row of question marks.
    new Blob(["﻿", doc], { type: "application/msword;charset=utf-8" }),
    cvFilename(name, "doc"),
  );
}

/** The plain-text CV, for application forms that only take pasted text. */
export function cvToText(cv: Cv, template: CvTemplate): string {
  const out: string[] = [];
  const rule = (label: string) => out.push("", label.toUpperCase(), "-".repeat(label.length));
  const dates = (a: string, b: string) => [a, b].filter((s) => s.trim()).join(" - ");
  const line = (parts: (string | undefined)[], sep = " | ") =>
    parts.filter((p) => p && p.trim()).join(sep);

  out.push(cv.name || "Your name");
  if (cv.headline.trim()) out.push(cv.headline);
  const contact = line([cv.email, cv.phone, cv.location, ...cv.links.map((l) => l.url)]);
  if (contact) out.push(contact);

  for (const section of filledSections(cv, template.order)) {
    switch (section) {
      case "summary":
        rule(sectionLabels.summary);
        out.push(cv.summary);
        break;
      case "education":
        rule(sectionLabels.education);
        for (const e of cv.education) {
          out.push(line([e.qualification, dates(e.start, e.end)], "  ").trim());
          const sub = line([e.institution, e.board, e.location, e.grade]);
          if (sub) out.push(`  ${sub}`);
          for (const h of e.highlights) out.push(`  - ${h}`);
        }
        break;
      case "experience":
        rule(sectionLabels.experience);
        for (const e of cv.experience) {
          out.push(line([e.role, dates(e.start, e.end)], "  ").trim());
          const sub = line([e.organisation, e.location]);
          if (sub) out.push(`  ${sub}`);
          for (const h of e.highlights) out.push(`  - ${h}`);
        }
        break;
      case "volunteering":
        rule(sectionLabels.volunteering);
        for (const v of cv.volunteering) {
          out.push(line([v.role, dates(v.start, v.end)], "  ").trim());
          if (v.organisation.trim()) out.push(`  ${v.organisation}`);
          for (const h of v.highlights) out.push(`  - ${h}`);
        }
        break;
      case "projects":
        rule(sectionLabels.projects);
        for (const p of cv.projects) {
          out.push(line([p.title, p.year], "  ").trim());
          if (p.context.trim()) out.push(`  ${p.context}`);
          for (const h of p.highlights) out.push(`  - ${h}`);
        }
        break;
      case "skills":
        rule(sectionLabels.skills);
        for (const s of cv.skills) out.push(line([s.group, s.items.join(", ")], ": "));
        break;
      case "tests":
        rule(sectionLabels.tests);
        for (const t of cv.tests) {
          // Not a plain join: "IELTS: 7.0: Listening 7.5" read as two colons.
          // The date takes a comma, the same as the rendered page.
          out.push(
            `${t.name}: ${t.score}${t.detail.trim() ? ` (${t.detail})` : ""}${t.date.trim() ? `, ${t.date}` : ""}`,
          );
        }
        break;
      case "certifications":
        rule(sectionLabels.certifications);
        for (const c of cv.certifications) out.push(line([c.title, c.issuer, c.year]));
        break;
      case "publications":
        rule(sectionLabels.publications);
        cv.publications.forEach((p, i) => out.push(`${i + 1}. ${line([p.title, p.venue, p.year], ". ")}`));
        break;
      case "languages":
        rule(sectionLabels.languages);
        for (const l of cv.languages) out.push(line([l.language, l.level], ": "));
        break;
      case "awards":
        rule(sectionLabels.awards);
        for (const a of cv.awards) out.push(line([a.title, a.issuer, a.year, a.note]));
        break;
      case "referees":
        rule(sectionLabels.referees);
        for (const r of cv.referees) {
          out.push(r.name);
          const sub = line([r.role, r.organisation, r.email, r.phone]);
          if (sub) out.push(`  ${sub}`);
        }
        break;
    }
  }

  return out.join("\n").replace(/\n{3}/g, "\n\n").trim() + "\n";
}

export function downloadText(cv: Cv, template: CvTemplate): void {
  saveBlob(new Blob([cvToText(cv, template)], { type: "text/plain;charset=utf-8" }), cvFilename(cv.name, "txt"));
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
