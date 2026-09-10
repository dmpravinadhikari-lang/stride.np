import type { Cv, CvSection } from "@/modules/cv/lib/schema";
import { filledSections } from "@/modules/cv/lib/schema";
import { sectionLabels, type CvTemplate } from "@/modules/cv/data/cv-templates";

/**
 * The CV itself.
 *
 * This one component renders every pattern. What changes between them is the
 * section order and the heading treatment, both of which arrive on the
 * template. So a new pattern is a new entry in data/cv-templates.ts and not a
 * new renderer to keep in step with the other four.
 *
 * Three constraints shape everything here, and all three come from how the
 * document is actually read at the other end:
 *
 *   1. One column, real text, no tables. This is the document an applicant
 *      tracking system parses. A two-column CV with the dates in a text box
 *      reaches a US admissions system as an unreadable jumble, and the student
 *      never finds out why they heard nothing.
 *   2. Print units throughout, pt for type, mm for the page. The output is a
 *      piece of A4 paper, not a web page, and px would leave the type at the
 *      mercy of whatever the browser's print scaling decided to do.
 *   3. Black text on white, one accent used sparingly. A CV printed on an
 *      office laser printer in Leeds has to survive being greyscale.
 */

const HEADING_STYLE: Record<CvTemplate["design"]["headings"], string> = {
  rule: "cv-h cv-h-rule",
  caps: "cv-h cv-h-caps",
  band: "cv-h cv-h-band",
  marker: "cv-h cv-h-marker",
};

export function CvDocument({
  cv,
  template,
  /** The on-screen preview scales; the print copy never does. */
  className = "",
  /**
   * Whether this copy is the document or a picture of one.
   *
   * A CV's own heading is the person's name, so it is an h1, correct when the
   * page IS the CV. But the same component is used as a sample beside marketing
   * copy and as a thumbnail in the design picker, and there it becomes a second
   * h1 on somebody else's page. The homepage had two: its own headline, and
   * "Sunita Gurung".
   *
   * A page with two h1s is a page where a screen reader announces two things as
   * the subject, and where a search engine has to pick. Samples pass
   * `sample` and their name is a paragraph.
   */
  sample = false,
}: {
  cv: Cv;
  template: CvTemplate;
  className?: string;
  sample?: boolean;
}) {
  const sections = filledSections(cv, template.order);
  const d = template.design;
  const heading = HEADING_STYLE[d.headings];

  /*
   * The side panel, when a pattern has one.
   *
   * ORDER IS PRESERVED. The sections keep the order the template declares and
   * are only split into two groups; the panel is placed with grid, so the
   * markup, and therefore the text layer of the printed PDF, still reads
   * top to bottom in one stream. That is the whole reason these patterns are
   * allowed to exist next to the site's own warning about two-column CVs.
   */
  const asideOf = new Set(d.layout === "side" ? d.aside ?? [] : []);
  const main = sections.filter((x) => !asideOf.has(x));
  const aside = sections.filter((x) => asideOf.has(x));

  const contact = [cv.email, cv.phone, cv.location].filter((s) => s.trim());
  const links = cv.links.filter((l) => l.url.trim());

  return (
    <article
      className={[
        "cv-doc",
        `cv-accent-${d.accent}`,
        `cv-face-${d.face}`,
        `cv-density-${d.density}`,
        d.layout === "side" && aside.length ? "cv-doc-side" : "",
        d.tint ? "cv-doc-tint" : "",
        d.dots ? "cv-doc-dots" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      lang="en"
    >
      <header className={`cv-head cv-head-${d.header}`}>
        {sample ? (
          <p className="cv-name" role="presentation">{cv.name.trim() || "Your name"}</p>
        ) : (
          <h1 className="cv-name">{cv.name.trim() || "Your name"}</h1>
        )}
        {cv.headline.trim() && <p className="cv-headline">{cv.headline}</p>}
        {(contact.length > 0 || links.length > 0) && (
          <p className="cv-contact">
            {contact.map((item, i) => (
              <span key={`c${i}`}>
                {i > 0 && <span className="cv-sep"> · </span>}
                {item}
              </span>
            ))}
            {links.map((link, i) => (
              <span key={`l${i}`}>
                <span className="cv-sep"> · </span>
                {/* The label is what reads on paper; the href is what works on
                    screen. Printing the bare URL wastes a line and is unusable
                    either way. */}
                <a href={withProtocol(link.url)}>{link.label.trim() || tidyUrl(link.url)}</a>
              </span>
            ))}
          </p>
        )}
      </header>

      <div className="cv-main">
        {main.map((section) => (
          <section key={section} className="cv-section">
            <h2 className={heading}>{sectionLabels[section]}</h2>
            {renderSection(section, cv, d)}
          </section>
        ))}
      </div>

      {aside.length > 0 && (
        <div className="cv-aside">
          {aside.map((section) => (
            <section key={section} className="cv-section">
              <h2 className={heading}>{sectionLabels[section]}</h2>
              {renderSection(section, cv, d)}
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

function renderSection(section: CvSection, cv: Cv, design: CvTemplate["design"]) {
  switch (section) {
    case "summary":
      return <p className="cv-summary">{cv.summary}</p>;

    case "education":
      return (
        <>
          {cv.education.map((e, i) => (
            <div className="cv-entry" key={i}>
              <div className="cv-entry-top">
                <h3 className="cv-role">{e.qualification}</h3>
                <span className="cv-dates">{dateRange(e.start, e.end)}</span>
              </div>
              <p className="cv-org">
                {join([e.institution, e.board, e.location])}
                {e.grade.trim() && (
                  <>
                    {(e.institution || e.board || e.location) && <span className="cv-sep"> · </span>}
                    <strong>{e.grade}</strong>
                  </>
                )}
              </p>
              <Bullets items={e.highlights} />
            </div>
          ))}
        </>
      );

    case "experience":
      return (
        <>
          {cv.experience.map((e, i) => (
            <div className="cv-entry" key={i}>
              <div className="cv-entry-top">
                <h3 className="cv-role">{e.role}</h3>
                <span className="cv-dates">{dateRange(e.start, e.end)}</span>
              </div>
              {(e.organisation.trim() || e.location.trim()) && (
                <p className="cv-org">{join([e.organisation, e.location])}</p>
              )}
              <Bullets items={e.highlights} />
            </div>
          ))}
        </>
      );

    case "volunteering":
      return (
        <>
          {cv.volunteering.map((v, i) => (
            <div className="cv-entry" key={i}>
              <div className="cv-entry-top">
                <h3 className="cv-role">{v.role}</h3>
                <span className="cv-dates">{dateRange(v.start, v.end)}</span>
              </div>
              {v.organisation.trim() && <p className="cv-org">{v.organisation}</p>}
              <Bullets items={v.highlights} />
            </div>
          ))}
        </>
      );

    case "projects":
      return (
        <>
          {cv.projects.map((p, i) => (
            <div className="cv-entry" key={i}>
              <div className="cv-entry-top">
                <h3 className="cv-role">
                  {p.url.trim() ? <a href={withProtocol(p.url)}>{p.title}</a> : p.title}
                </h3>
                <span className="cv-dates">{p.year}</span>
              </div>
              {p.context.trim() && <p className="cv-org">{p.context}</p>}
              <Bullets items={p.highlights} />
            </div>
          ))}
        </>
      );

    /*
     * Skills, tests and languages are tables, not sentences.
     *
     * All three are the same shape: a label on the left and its value on the
     * right, several times over. Written as running text they became a wall
     * ("Office or admin: Data entry, Record keeping Clinical: Health education
     * ...") that a reader has to parse word by word. Set in a table the labels
     * line up in a column, and somebody skimming for "does she have Excel"
     * finds it by scanning one edge of the page instead of reading.
     *
     * Real table markup rather than a grid, because this document is also
     * printed and copied into other people's systems, and a table survives that
     * where CSS grid does not.
     */
    case "skills": {
      /*
       * Two shapes for one section.
       *
       * With dots, each skill is its own row so the level has somewhere to
       * sit; without, the group runs as a line, which is denser and is what a
       * single-column CV wants. A skill the student never rated has no dots
       * either way, and the row simply reads as the name.
       */
      const levels = cv.skillLevels ?? {};
      const rated = design.dots && cv.skills.some((g) => g.items.some((i) => levels[i]));

      if (!rated) {
        return (
          <table className="cv-table">
            <tbody>
              {cv.skills.map((s, i) => (
                <tr key={i}>
                  <th scope="row">{s.group.trim() || "Skills"}</th>
                  <td>{s.items.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      return (
        <div className="cv-skill-groups">
          {cv.skills.map((g, i) => (
            <div key={i} className="cv-skill-group">
              {g.group.trim() && <p className="cv-skill-head">{g.group}</p>}
              <ul className="cv-skill-list">
                {g.items.map((item) => (
                  <li key={item}>
                    <span className="cv-skill-name">{item}</span>
                    {levels[item] ? <Dots level={levels[item]} /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    case "tests":
      return (
        <table className="cv-table">
          <tbody>
            {cv.tests.map((t, i) => (
              <tr key={i}>
                <th scope="row">{t.name}</th>
                <td>
                  <strong>{t.score}</strong>
                  {t.detail.trim() && <> ({t.detail})</>}
                </td>
                <td className="cv-table-date">{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "certifications":
      return (
        <ul className="cv-defs">
          {cv.certifications.map((c, i) => (
            <li key={i}>
              <span className="cv-def-key">
                {c.url.trim() ? <a href={withProtocol(c.url)}>{c.title}</a> : c.title}
              </span>
              {c.issuer.trim() && <>, {c.issuer}</>}
              {c.year.trim() && <span className="cv-dates-inline"> ({c.year})</span>}
            </li>
          ))}
        </ul>
      );

    case "publications":
      return (
        <ol className="cv-pubs">
          {cv.publications.map((p, i) => (
            <li key={i}>
              {p.url.trim() ? <a href={withProtocol(p.url)}>{p.title}</a> : p.title}
              {p.venue.trim() && <em> {p.venue}</em>}
              {p.year.trim() && <> ({p.year})</>}
            </li>
          ))}
        </ol>
      );

    case "awards":
      return (
        <ul className="cv-defs">
          {cv.awards.map((a, i) => (
            <li key={i}>
              <span className="cv-def-key">{a.title}</span>
              {a.issuer.trim() && <>, {a.issuer}</>}
              {a.year.trim() && <span className="cv-dates-inline"> ({a.year})</span>}
              {a.note.trim() && <>. {a.note}</>}
            </li>
          ))}
        </ul>
      );

    case "languages":
      return (
        <table className="cv-table">
          <tbody>
            {cv.languages.map((l, i) => (
              <tr key={i}>
                <th scope="row">{l.language}</th>
                <td>{l.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "referees":
      return (
        <div className="cv-refs">
          {cv.referees.map((r, i) => (
            <div key={i}>
              <p className="cv-ref-name">{r.name}</p>
              <p className="cv-org">{join([r.role, r.organisation])}</p>
              {(r.email.trim() || r.phone.trim()) && (
                <p className="cv-org">{join([r.email, r.phone])}</p>
              )}
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

function Bullets({ items }: { items: string[] }) {
  const list = items.filter((i) => i.trim());
  if (!list.length) return null;
  return (
    <ul className="cv-bullets">
      {list.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const join = (parts: string[]) => parts.filter((p) => p.trim()).join(" · ");

/**
 * A level, as five dots.
 *
 * The number is also written out for a screen reader and for anything reading
 * the text layer of the PDF, because a row of shapes carries nothing to either
 * of them.
 */
function Dots({ level }: { level: number }) {
  const n = Math.max(1, Math.min(5, Math.round(level)));
  return (
    <span className="cv-dots" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= n ? "on" : ""} />
      ))}
      <span className="cv-dots-text">{` (${n}/5)`}</span>
    </span>
  );
}

function dateRange(start: string, end: string): string {
  const a = start.trim();
  const b = end.trim();
  if (a && b) return `${a} - ${b}`;
  return a || b;
}

function withProtocol(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function tidyUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}
