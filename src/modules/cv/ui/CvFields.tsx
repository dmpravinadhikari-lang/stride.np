"use client";

import { useState, type ReactNode } from "react";
import { blank, type Cv, type CvSection } from "@/modules/cv/lib/schema";
import { sectionLabels, type CvTemplate } from "@/modules/cv/data/cv-templates";

/**
 * The editor.
 *
 * Sections appear in the order the chosen pattern prints them, which means the
 * form and the preview beside it always read top-to-bottom together. The
 * sections that pattern leads on are open; the rest are collapsed with a count
 * on the tab. A student filling a CV for the first time is looking at twelve
 * sections and about sixty fields, and showing all of it at once is how they
 * decide the whole thing is too much and close the tab.
 *
 * Bullets are edited as one-per-line text rather than as a list of inputs.
 * Fifteen separate inputs with add and remove buttons is more code, more
 * clicks, and worse on a phone, and every student already knows how to press
 * Enter for a new line.
 */

/**
 * The array-valued fields, which all edit the same way. Links are in here too
 * even though they are not a section, they print in the header rather than in
 * the body, but they are added and removed exactly like everything else.
 */
type ListKey = Exclude<CvSection, "summary"> | "links";

export function CvFields({
  cv,
  set,
  template,
  /** Fields the import was unsure about, so the form can point at them. */
  check,
}: {
  cv: Cv;
  set: (patch: Partial<Cv>) => void;
  template: CvTemplate;
  check?: string[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { details: true };
    for (const s of template.order) initial[s] = template.encourage.includes(s);
    // Anything that already has content is open, whatever the pattern thinks, 
    // an imported CV whose experience is collapsed looks like it was lost.
    for (const s of template.order) {
      const value = cv[s];
      if (Array.isArray(value) ? value.length > 0 : String(value).trim()) initial[s] = true;
    }
    return initial;
  });

  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  // Typed at the call sites below; the cast is here because TypeScript cannot
  // narrow a computed key back to its own element type through Partial<Cv>.
  const updateAt = <K extends ListKey>(key: K, i: number, patch: Partial<Cv[K][number]>) =>
    set({
      [key]: (cv[key] as Cv[K][number][]).map((row, j) => (j === i ? { ...row, ...patch } : row)),
    } as unknown as Partial<Cv>);

  const addTo = <K extends ListKey>(key: K) =>
    set({ [key]: [...(cv[key] as unknown[]), blank[key]()] } as unknown as Partial<Cv>);

  const removeAt = <K extends ListKey>(key: K, i: number) =>
    set({ [key]: (cv[key] as unknown[]).filter((_, j) => j !== i) } as unknown as Partial<Cv>);

  const count = (key: ListKey) => (cv[key] as unknown[]).length;

  return (
    <div className="space-y-3">
      {/* --- Your details, which is never collapsed away and never optional. */}
      <Panel
        title="Your details"
        open={open.details}
        onToggle={() => toggle("details")}
        badge={cv.name && cv.email ? "Done" : "Needed"}
        tone={cv.name && cv.email ? "good" : "warn"}
      >
        {check && check.length > 0 && (
          <p className="mb-4 rounded-2xl bg-warn-50 px-4 py-3 text-[0.85rem] leading-relaxed text-warn">
            Read from your old CV, please check {check.join(", ")}.
          </p>
        )}
        <Grid>
          <Field label="Full name" hint="Exactly as it appears on your passport.">
            <Input value={cv.name} onChange={(v) => set({ name: v })} placeholder="Ram Bahadur Thapa" />
          </Field>
          <Field label="One-line headline" hint="Not a job title, what you are.">
            <Input
              value={cv.headline}
              onChange={(v) => set({ headline: v })}
              placeholder="BBS graduate, two years in retail operations"
            />
          </Field>
          <Field label="Email">
            <Input value={cv.email} onChange={(v) => set({ email: v })} placeholder="ram.thapa@gmail.com" type="email" />
          </Field>
          <Field label="Phone" hint="With +977, so it can be dialled from abroad.">
            <Input value={cv.phone} onChange={(v) => set({ phone: v })} placeholder="+977 9801234567" type="tel" />
          </Field>
          <Field label="Location" hint="City and country only. Never your street address.">
            <Input value={cv.location} onChange={(v) => set({ location: v })} placeholder="Kathmandu, Nepal" />
          </Field>
        </Grid>

        <Rows
          label="Links"
          count={cv.links.length}
          onAdd={() => addTo("links")}
          addLabel="Add a link"
          empty="LinkedIn, GitHub, a portfolio. Only if they are real and current."
        >
          {cv.links.map((l, i) => (
            <Row key={i} onRemove={() => removeAt("links", i)}>
              <Grid cols={2}>
                <Field label="Label">
                  <Input value={l.label} onChange={(v) => updateAt("links", i, { label: v })} placeholder="LinkedIn" />
                </Field>
                <Field label="URL">
                  <Input
                    value={l.url}
                    onChange={(v) => updateAt("links", i, { url: v })}
                    placeholder="linkedin.com/in/ramthapa"
                  />
                </Field>
              </Grid>
            </Row>
          ))}
        </Rows>

        <p className="mt-5 rounded-2xl bg-wash px-4 py-3 text-[0.82rem] leading-relaxed text-ink-2">
          There is no field here for a photograph, date of birth, marital status, gender or
          father&apos;s name: and that is deliberate. Every one of the five destinations treats
          those as details it must not consider, and a CV carrying them is often discarded unread.
        </p>
      </Panel>

      {/* --- Everything else, in the order this pattern prints it. */}
      {template.order.map((section) => {
        if (section === "summary") {
          return (
            <Panel
              key={section}
              title={sectionLabels.summary}
              open={open.summary}
              onToggle={() => toggle("summary")}
              badge={cv.summary.trim() ? `${words(cv.summary)} words` : undefined}
              lead={template.encourage.includes("summary")}
            >
              <Field
                label="Three or four lines at the top"
                hint="What you have finished, what you are applying for, and one thing you are good at. About 50 words."
              >
                <TextArea
                  value={cv.summary}
                  onChange={(v) => set({ summary: v })}
                  rows={4}
                  placeholder="BBS graduate from Tribhuvan University with two years in retail operations, applying for an MSc in Supply Chain Management. Comfortable with inventory systems and with the reporting that keeps a 12-person team on target."
                />
              </Field>
            </Panel>
          );
        }

        const key = section as ListKey;
        return (
          <Panel
            key={section}
            title={sectionLabels[section]}
            open={open[section]}
            onToggle={() => toggle(section)}
            badge={count(key) ? String(count(key)) : undefined}
            lead={template.encourage.includes(section)}
          >
            {renderSection(key)}
          </Panel>
        );
      })}
    </div>
  );

  function renderSection(key: ListKey): ReactNode {
    switch (key) {
      case "education":
        return (
          <Rows
            label="Qualifications"
            count={cv.education.length}
            onAdd={() => addTo("education")}
            addLabel="Add a qualification"
            empty="Most recent first. Your bachelor's before your +2, your +2 before your SEE."
          >
            {cv.education.map((e, i) => (
              <Row key={i} onRemove={() => removeAt("education", i)} title={e.qualification || "New qualification"}>
                <Grid>
                  <Field label="Qualification" hint="Its real name: Bachelor of Business Studies, +2 Science, SEE.">
                    <Input
                      value={e.qualification}
                      onChange={(v) => updateAt("education", i, { qualification: v })}
                      placeholder="Bachelor of Business Studies"
                    />
                  </Field>
                  <Field label="College or school">
                    <Input
                      value={e.institution}
                      onChange={(v) => updateAt("education", i, { institution: v })}
                      placeholder="Shanker Dev Campus"
                    />
                  </Field>
                  <Field label="Board or university" hint="This is what an admissions office recognises.">
                    <Input
                      value={e.board}
                      onChange={(v) => updateAt("education", i, { board: v })}
                      placeholder="Tribhuvan University"
                    />
                  </Field>
                  <Field label="Marks" hint="Copy exactly what your transcript says.">
                    <Input value={e.grade} onChange={(v) => updateAt("education", i, { grade: v })} placeholder="78.4%" />
                  </Field>
                  <Field label="Started">
                    <Input value={e.start} onChange={(v) => updateAt("education", i, { start: v })} placeholder="2020" />
                  </Field>
                  <Field label="Finished">
                    <Input value={e.end} onChange={(v) => updateAt("education", i, { end: v })} placeholder="2024" />
                  </Field>
                </Grid>
                <Bullets
                  label="Anything worth adding"
                  hint="A thesis title, a major subject, a rank in the class. One per line. Skip it if there is nothing."
                  value={e.highlights}
                  onChange={(v) => updateAt("education", i, { highlights: v })}
                />
              </Row>
            ))}
          </Rows>
        );

      case "experience":
        return (
          <Rows
            label="Jobs and internships"
            count={cv.experience.length}
            onAdd={() => addTo("experience")}
            addLabel="Add a role"
            empty="Family business, tuition teaching and unpaid internships all count. Most recent first."
          >
            {cv.experience.map((e, i) => (
              <Row key={i} onRemove={() => removeAt("experience", i)} title={e.role || "New role"}>
                <Grid>
                  <Field label="Job title">
                    <Input value={e.role} onChange={(v) => updateAt("experience", i, { role: v })} placeholder="Sales Officer" />
                  </Field>
                  <Field label="Employer">
                    <Input
                      value={e.organisation}
                      onChange={(v) => updateAt("experience", i, { organisation: v })}
                      placeholder="Amigo Traders Pvt. Ltd."
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      value={e.location}
                      onChange={(v) => updateAt("experience", i, { location: v })}
                      placeholder="Kathmandu"
                    />
                  </Field>
                  <Field label="From">
                    <Input value={e.start} onChange={(v) => updateAt("experience", i, { start: v })} placeholder="Jan 2023" />
                  </Field>
                  <Field label="To" hint="Write Present if you are still there.">
                    <Input value={e.end} onChange={(v) => updateAt("experience", i, { end: v })} placeholder="Present" />
                  </Field>
                </Grid>
                <Bullets
                  label="What you did, and what changed because you did it"
                  hint="Two or three lines. Start each with a verb, and put a number in where you honestly have one."
                  value={e.highlights}
                  onChange={(v) => updateAt("experience", i, { highlights: v })}
                  placeholder={"Handled 40 walk-in enquiries a day across three product lines\nCut stock-out incidents by a third by rebuilding the reorder sheet\nTrained four new joiners on the billing system"}
                />
              </Row>
            ))}
          </Rows>
        );

      case "volunteering":
        return (
          <Rows
            label="Volunteering and leadership"
            count={cv.volunteering.length}
            onAdd={() => addTo("volunteering")}
            addLabel="Add something"
            empty="A club you ran, a blood donation drive, a campaign, teaching at a community school. Scholarship panels read this section first."
          >
            {cv.volunteering.map((v, i) => (
              <Row key={i} onRemove={() => removeAt("volunteering", i)} title={v.role || "New entry"}>
                <Grid>
                  <Field label="Your role">
                    <Input value={v.role} onChange={(x) => updateAt("volunteering", i, { role: x })} placeholder="Secretary" />
                  </Field>
                  <Field label="Organisation">
                    <Input
                      value={v.organisation}
                      onChange={(x) => updateAt("volunteering", i, { organisation: x })}
                      placeholder="Rotaract Club of Kathmandu"
                    />
                  </Field>
                  <Field label="From">
                    <Input value={v.start} onChange={(x) => updateAt("volunteering", i, { start: x })} placeholder="2022" />
                  </Field>
                  <Field label="To">
                    <Input value={v.end} onChange={(x) => updateAt("volunteering", i, { end: x })} placeholder="2024" />
                  </Field>
                </Grid>
                <Bullets
                  label="What you actually did"
                  hint="One per line, starting with a verb. Numbers matter here more than anywhere."
                  value={v.highlights}
                  onChange={(x) => updateAt("volunteering", i, { highlights: x })}
                  placeholder={"Organised a blood donation camp that collected 84 units\nLed a team of nine volunteers across three wards"}
                />
              </Row>
            ))}
          </Rows>
        );

      case "projects":
        return (
          <Rows
            label="Projects"
            count={cv.projects.length}
            onAdd={() => addTo("projects")}
            addLabel="Add a project"
            empty="A final-year project, a piece of coursework, something you built on your own. This is how a student with no work experience fills a page honestly."
          >
            {cv.projects.map((p, i) => (
              <Row key={i} onRemove={() => removeAt("projects", i)} title={p.title || "New project"}>
                <Grid>
                  <Field label="Title">
                    <Input value={p.title} onChange={(v) => updateAt("projects", i, { title: v })} placeholder="Inventory tracker for a retail chain" />
                  </Field>
                  <Field label="Where it sat" hint="Coursework, final-year project, personal.">
                    <Input value={p.context} onChange={(v) => updateAt("projects", i, { context: v })} placeholder="Final-year project, BBS" />
                  </Field>
                  <Field label="Year">
                    <Input value={p.year} onChange={(v) => updateAt("projects", i, { year: v })} placeholder="2024" />
                  </Field>
                  <Field label="Link" hint="Optional.">
                    <Input value={p.url} onChange={(v) => updateAt("projects", i, { url: v })} placeholder="github.com/…" />
                  </Field>
                </Grid>
                <Bullets
                  label="What it did and what you used"
                  value={p.highlights}
                  onChange={(v) => updateAt("projects", i, { highlights: v })}
                  placeholder={"Built a stock tracker in Excel and Google Apps Script for a four-shop chain\nCut the monthly stock count from two days to three hours"}
                />
              </Row>
            ))}
          </Rows>
        );

      case "skills":
        return (
          <Rows
            label="Skill groups"
            count={cv.skills.length}
            onAdd={() => addTo("skills")}
            addLabel="Add a group"
            empty="Group them: Software, Laboratory, Teaching, Languages. An ungrouped list of fifteen skills reads as noise."
          >
            {cv.skills.map((s, i) => (
              <Row key={i} onRemove={() => removeAt("skills", i)} title={s.group || "New group"}>
                <Grid cols={1}>
                  <Field label="Group name">
                    <Input value={s.group} onChange={(v) => updateAt("skills", i, { group: v })} placeholder="Software" />
                  </Field>
                  <Field
                    label="Skills in this group"
                    hint="Comma separated. Specific things only. A piece of software, a technique, a machine. Not &ldquo;hard-working&rdquo;."
                  >
                    <Input
                      value={s.items.join(", ")}
                      onChange={(v) => updateAt("skills", i, { items: v.split(",").map((x) => x.trim()).filter(Boolean) })}
                      placeholder="Excel (pivot tables, VLOOKUP), Tally, QuickBooks, SPSS"
                    />
                  </Field>
                </Grid>
              </Row>
            ))}
          </Rows>
        );

      case "tests":
        return (
          <Rows
            label="Test scores"
            count={cv.tests.length}
            onAdd={() => addTo("tests")}
            addLabel="Add a test"
            empty="IELTS, PTE, TOEFL, Duolingo, SAT, GRE. Only tests you have actually sat, never a planned date."
          >
            {cv.tests.map((t, i) => (
              <Row key={i} onRemove={() => removeAt("tests", i)} title={t.name || "New test"}>
                <Grid>
                  <Field label="Test">
                    <Input value={t.name} onChange={(v) => updateAt("tests", i, { name: v })} placeholder="IELTS" />
                  </Field>
                  <Field label="Overall score">
                    <Input value={t.score} onChange={(v) => updateAt("tests", i, { score: v })} placeholder="7.0" />
                  </Field>
                  <Field label="Band breakdown" hint="Often what secures a waiver.">
                    <Input value={t.detail} onChange={(v) => updateAt("tests", i, { detail: v })} placeholder="L7.5 R7.0 W6.5 S7.0" />
                  </Field>
                  <Field label="Date taken">
                    <Input value={t.date} onChange={(v) => updateAt("tests", i, { date: v })} placeholder="Mar 2026" />
                  </Field>
                </Grid>
              </Row>
            ))}
          </Rows>
        );

      case "certifications":
        return (
          <Rows
            label="Certifications and training"
            count={cv.certifications.length}
            onAdd={() => addTo("certifications")}
            addLabel="Add a certification"
            empty="Anything with a certificate behind it: a computer course, a first-aid ticket, a Coursera specialisation you finished."
          >
            {cv.certifications.map((c, i) => (
              <Row key={i} onRemove={() => removeAt("certifications", i)} title={c.title || "New certification"}>
                <Grid>
                  <Field label="Title">
                    <Input value={c.title} onChange={(v) => updateAt("certifications", i, { title: v })} placeholder="Diploma in Computer Application" />
                  </Field>
                  <Field label="Issued by">
                    <Input value={c.issuer} onChange={(v) => updateAt("certifications", i, { issuer: v })} placeholder="CTEVT" />
                  </Field>
                  <Field label="Year">
                    <Input value={c.year} onChange={(v) => updateAt("certifications", i, { year: v })} placeholder="2023" />
                  </Field>
                  <Field label="Link" hint="Optional.">
                    <Input value={c.url} onChange={(v) => updateAt("certifications", i, { url: v })} placeholder="coursera.org/verify/…" />
                  </Field>
                </Grid>
              </Row>
            ))}
          </Rows>
        );

      case "publications":
        return (
          <Rows
            label="Publications and research"
            count={cv.publications.length}
            onAdd={() => addTo("publications")}
            addLabel="Add a publication"
            empty="A paper, a poster, a conference talk, a thesis in a university repository. A supervisor reads this before anything else."
          >
            {cv.publications.map((p, i) => (
              <Row key={i} onRemove={() => removeAt("publications", i)} title={p.title || "New publication"}>
                <Grid>
                  <Field label="Title">
                    <Input value={p.title} onChange={(v) => updateAt("publications", i, { title: v })} />
                  </Field>
                  <Field label="Journal, conference or repository">
                    <Input value={p.venue} onChange={(v) => updateAt("publications", i, { venue: v })} placeholder="Journal of Nepal Medical Association" />
                  </Field>
                  <Field label="Year">
                    <Input value={p.year} onChange={(v) => updateAt("publications", i, { year: v })} placeholder="2025" />
                  </Field>
                  <Field label="DOI or link">
                    <Input value={p.url} onChange={(v) => updateAt("publications", i, { url: v })} placeholder="doi.org/…" />
                  </Field>
                </Grid>
              </Row>
            ))}
          </Rows>
        );

      case "languages":
        return (
          <Rows
            label="Languages"
            count={cv.languages.length}
            onAdd={() => addTo("languages")}
            addLabel="Add a language"
            empty="Nepali, English, Hindi, Newari, Maithili. Worth listing. Multilingual is an asset abroad, not a given."
          >
            {cv.languages.map((l, i) => (
              <Row key={i} onRemove={() => removeAt("languages", i)} title={l.language || "New language"}>
                <Grid cols={2}>
                  <Field label="Language">
                    <Input value={l.language} onChange={(v) => updateAt("languages", i, { language: v })} placeholder="Nepali" />
                  </Field>
                  <Field label="Level">
                    <Input value={l.level} onChange={(v) => updateAt("languages", i, { level: v })} placeholder="Native" />
                  </Field>
                </Grid>
              </Row>
            ))}
          </Rows>
        );

      case "awards":
        return (
          <Rows
            label="Awards and scholarships"
            count={cv.awards.length}
            onAdd={() => addTo("awards")}
            addLabel="Add an award"
            empty="A merit scholarship, a topper's prize, a competition you placed in, a district-level anything."
          >
            {cv.awards.map((a, i) => (
              <Row key={i} onRemove={() => removeAt("awards", i)} title={a.title || "New award"}>
                <Grid>
                  <Field label="Award">
                    <Input value={a.title} onChange={(v) => updateAt("awards", i, { title: v })} placeholder="Merit scholarship" />
                  </Field>
                  <Field label="Given by">
                    <Input value={a.issuer} onChange={(v) => updateAt("awards", i, { issuer: v })} placeholder="Shanker Dev Campus" />
                  </Field>
                  <Field label="Year">
                    <Input value={a.year} onChange={(v) => updateAt("awards", i, { year: v })} placeholder="2023" />
                  </Field>
                  <Field label="One line of context" hint="Optional. Say how selective it was.">
                    <Input value={a.note} onChange={(v) => updateAt("awards", i, { note: v })} placeholder="Awarded to the top 5 of 340 students" />
                  </Field>
                </Grid>
              </Row>
            ))}
          </Rows>
        );

      case "referees":
        return (
          <Rows
            label="Referees"
            count={cv.referees.length}
            onAdd={() => addTo("referees")}
            addLabel="Add a referee"
            empty="Ask them first, and warn them a call may come. Australia and New Zealand expect two named referees; the UK and USA prefer them left off."
          >
            {cv.referees.map((r, i) => (
              <Row key={i} onRemove={() => removeAt("referees", i)} title={r.name || "New referee"}>
                <Grid>
                  <Field label="Name">
                    <Input value={r.name} onChange={(v) => updateAt("referees", i, { name: v })} placeholder="Dr Sita Sharma" />
                  </Field>
                  <Field label="Their role" hint="A name with no title is worth nothing.">
                    <Input value={r.role} onChange={(v) => updateAt("referees", i, { role: v })} placeholder="Associate Professor" />
                  </Field>
                  <Field label="Organisation">
                    <Input value={r.organisation} onChange={(v) => updateAt("referees", i, { organisation: v })} placeholder="Shanker Dev Campus" />
                  </Field>
                  <Field label="Email">
                    <Input value={r.email} onChange={(v) => updateAt("referees", i, { email: v })} />
                  </Field>
                  <Field label="Phone">
                    <Input value={r.phone} onChange={(v) => updateAt("referees", i, { phone: v })} />
                  </Field>
                </Grid>
              </Row>
            ))}
          </Rows>
        );

      case "links":
        return null;

      default:
        return null;
    }
  }
}

/* --------------------------------------------------------------------------
   Form primitives. Kept local to the CV builder: the site has no other form
   this dense, and pushing them into components/ui.tsx would export eight
   things that nothing else uses.
-------------------------------------------------------------------------- */

const inputCls =
  "w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-brand-ink";

function Panel({
  title,
  children,
  open,
  onToggle,
  badge,
  tone = "plain",
  lead = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  onToggle: () => void;
  badge?: string;
  tone?: "plain" | "good" | "warn";
  lead?: boolean;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white ${lead ? "border-brand-200" : "border-line"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!!open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-wash/60"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        <span className="flex-1 font-bold text-ink">{title}</span>
        {lead && !open && (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-brand-ink">
            Key
          </span>
        )}
        {badge && (
          <span
            className={`rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${
              tone === "good"
                ? "bg-good-50 text-good"
                : tone === "warn"
                  ? "bg-warn-50 text-warn"
                  : "bg-wash text-muted"
            }`}
          >
            {badge}
          </span>
        )}
      </button>
      {open && <div className="border-t border-line px-5 py-5">{children}</div>}
    </div>
  );
}

function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 }) {
  return <div className={`grid gap-4 ${cols === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>;
}

/**
 * The hint sits outside the <label>, not inside it.
 *
 * A label wrapping both the control and the hint makes the hint part of the
 * input's accessible name, so a screen reader announces "Full name, exactly as
 * it appears on your passport, edit text" for every one of about sixty fields.
 * Outside, the name is just "Full name" and the hint is read as the adjacent
 * text it is.
 */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-[0.82rem] font-bold text-ink">{label}</span>
        {children}
      </label>
      {hint && <p className="mt-1.5 text-[0.78rem] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`${inputCls} resize-y leading-relaxed`}
    />
  );
}

/** Bullets as lines. One textarea, and everybody already knows how it works. */
function Bullets({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-4">
      <Field label={label} hint={hint ?? "One per line."}>
        <TextArea
          value={value.join("\n")}
          onChange={(v) => onChange(v.split("\n").map((l) => l.replace(/^\s*[-*•]\s*/, "")))}
          rows={Math.min(8, Math.max(3, value.length + 1))}
          placeholder={placeholder}
        />
      </Field>
    </div>
  );
}

function Rows({
  label,
  count,
  onAdd,
  addLabel,
  empty,
  children,
}: {
  label: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
  empty: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 first:mt-0">
      {/* Visible, not sr-only. Hidden, the links block's helper text read as a
          second hint belonging to the Location field above it. */}
      <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wider text-muted">{label}</p>
      {count === 0 && <p className="mb-4 text-[0.86rem] leading-relaxed text-muted">{empty}</p>}
      <div className="space-y-3">{children}</div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-2 px-4 py-2 text-[0.85rem] font-bold text-ink transition-colors hover:border-navy hover:bg-wash"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {addLabel}
      </button>
    </div>
  );
}

function Row({ children, onRemove, title }: { children: ReactNode; onRemove: () => void; title?: string }) {
  return (
    <div className="rounded-2xl bg-wash/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-[0.82rem] font-bold uppercase tracking-wider text-muted">{title ?? ""}</p>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full px-2.5 py-1 text-[0.78rem] font-bold text-muted transition-colors hover:bg-hard-50 hover:text-hard"
        >
          Remove
        </button>
      </div>
      {children}
    </div>
  );
}

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
