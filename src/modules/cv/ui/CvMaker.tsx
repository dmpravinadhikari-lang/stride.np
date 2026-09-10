"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "@/modules/cv/lib/compat";
import { destinations } from "@/modules/cv/lib/compat";
import { cvTemplates, templateById, ruleFor, sectionLabels, type CvTemplate } from "@/modules/cv/data/cv-templates";
import { emptyCv, parseCv, tidy, type Cv } from "@/modules/cv/lib/schema";
import { best, emptyBrief, experienceBands, isComplete, purposes, recommend, type Brief } from "@/modules/cv/lib/recommend";
import { reviewCv, type Finding, type Review } from "@/modules/cv/lib/review";
import { cvFilename, downloadText, downloadWord } from "@/modules/cv/lib/download";
import { DocumentsPanel } from "./DocumentsPanel";
import { applyDocuments, type DocumentResult } from "@/modules/cv/lib/documents";
import { CvDocument } from "./CvDocument";
import { CvFields } from "./CvFields";
import { previewCv } from "@/modules/cv/lib/sample";
import { track } from "@/modules/cv/lib/compat";

/**
 * The CV builder.
 *
 * Four steps, and the order of them is the whole design:
 *
 *   start, upload what you have, or begin from nothing.
 *   brief  . Five questions, which is what lets the tool recommend rather than
 *             present a gallery of layouts and leave the student guessing.
 *   pattern, the recommendation, the reason for it, and the runner-up.
 *   build  . The form, the live page, the check, and the downloads.
 *
 * The work is saved to localStorage and to nowhere else. A CV holds a student's
 * phone number and their family's circumstances, and this tool is free and
 * ungated, so there is no honest trade in which we keep it. That also means it
 * survives a closed tab, which matters more than it sounds: a student filling
 * this in on a shared computer at a cyber café does not get a second run at it.
 */

const STORAGE_KEY = "hp-cv-v2";
const STEPS = ["start", "brief", "pattern", "build"] as const;
type Step = (typeof STEPS)[number];

type Saved = { cv: Cv; brief: Brief; templateId: string; step: Step };

/** A4 at 96dpi, which is what a browser means by 210mm. */
const PAGE_PX = 794;

export function CvMaker() {
  const [step, setStep] = useState<Step>("start");
  const [cv, setCv] = useState<Cv>(emptyCv);
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [templateId, setTemplateId] = useState<string>("");
  const [check, setCheck] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);

  const template = useMemo(() => templateById(templateId || best(brief).top.template.id), [templateId, brief]);
  const review = useMemo(() => reviewCv(cv, template, brief), [cv, template, brief]);

  /* --- Restore, once, before anything can overwrite it. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Saved>;
        if (saved.cv) setCv(parseCv(saved.cv));
        if (saved.brief) setBrief({ ...emptyBrief, ...saved.brief });
        if (saved.templateId) setTemplateId(saved.templateId);
        if (saved.step && STEPS.includes(saved.step)) setStep(saved.step);
      }
    } catch {
      /* A corrupted or unavailable store simply means starting fresh. */
    }
    setRestored(true);
  }, []);

  /* --- Save on every change, once the restore has happened. */
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cv, brief, templateId, step } satisfies Saved));
    } catch {
      /* A full or blocked store must not break the form. */
    }
  }, [cv, brief, templateId, step, restored]);

  const set = useCallback((patch: Partial<Cv>) => setCv((prev) => ({ ...prev, ...patch })), []);

  const go = (next: Step) => {
    setStep(next);
    track("cv_step", { step: next, template: templateId || "auto" });
    // The steps are tall, so a step change has to bring the top back into view.
    requestAnimationFrame(() => {
      document.getElementById("cv-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  function reset() {
    setCv(emptyCv);
    setBrief(emptyBrief);
    setTemplateId("");
    setCheck([]);
    setStep("start");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to do */
    }
  }

  return (
    <div id="cv-builder" className="scroll-mt-28">
      <div data-noprint>
        <Rail step={step} onJump={go} canBuild={isComplete(brief)} />

        {step === "start" && (
          <StartStep
            onImported={(imported, notes) => {
              setCv(tidy(imported));
              setCheck(notes);
              go("brief");
            }}
            onScratch={() => go("brief")}
            onDocuments={(fromDocs, results) => {
              // Merged onto whatever is already there rather than replacing it,
              // so a student who typed something, went back and then uploaded
              // their certificates does not lose what they typed.
              setCv(applyDocuments(cv, results));
              setCheck(checksFor(fromDocs, results));
              go("brief");
            }}
          />
        )}

        {step === "brief" && (
          <BriefStep
            brief={brief}
            setBrief={setBrief}
            onBack={() => go("start")}
            onNext={() => {
              if (!templateId) setTemplateId(best(brief).top.template.id);
              go("pattern");
            }}
          />
        )}

        {step === "pattern" && (
          <PatternStep
            cv={cv}
            brief={brief}
            chosen={template.id}
            onChoose={(id) => {
              setTemplateId(id);
              track("cv_pattern_chosen", { template: id, recommended: best(brief).top.template.id });
            }}
            onBack={() => go("brief")}
            onNext={() => go("build")}
          />
        )}
      </div>

      {step === "build" && (
        <BuildStep
          cv={cv}
          set={set}
          template={template}
          brief={brief}
          review={review}
          check={check}
          onBack={() => go("pattern")}
          onReset={reset}
          onTemplate={(id) => {
            setTemplateId(id);
            track("cv_design_switched", { template: id });
          }}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   The rail
========================================================================== */

const RAIL: { id: Step; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "brief", label: "About you" },
  { id: "pattern", label: "Pattern" },
  { id: "build", label: "Build & download" },
];

function Rail({ step, onJump, canBuild }: { step: Step; onJump: (s: Step) => void; canBuild: boolean }) {
  const at = STEPS.indexOf(step);
  return (
    <ol className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-3 text-[0.82rem]">
      {RAIL.map((r, i) => {
        const done = i < at;
        const now = i === at;
        const reachable = done || now || (r.id === "build" && canBuild) || i <= at + 1;
        return (
          <li key={r.id} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-5 bg-line-2" aria-hidden />}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(r.id)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 font-bold transition-colors ${
                now
                  ? "bg-navy text-white"
                  : done
                    ? "bg-brand-50 text-brand-ink hover:bg-brand-100"
                    : reachable
                      ? "text-muted hover:text-navy"
                      : "text-muted/50"
              }`}
            >
              <span
                className={`grid place-items-center rounded-full text-[0.65rem] ${
                  done ? "bg-brand-ink text-white" : now ? "bg-white/20 text-white" : "bg-wash text-muted"
                }`}
                style={{ height: "1.15rem", width: "1.15rem" }}
              >
                {done ? "✓" : i + 1}
              </span>
              {r.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ==========================================================================
   Step 1, start
========================================================================== */

function StartStep({
  onImported,
  onScratch,
  onDocuments,
}: {
  onImported: (cv: Cv, check: string[]) => void;
  onScratch: () => void;
  onDocuments: (cv: Cv, results: DocumentResult[]) => void;
}) {
  const [mode, setMode] = useState<"choose" | "paste" | "documents">("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [via, setVia] = useState<string>("");
  const [pasted, setPasted] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function send(body: FormData | string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cv/import", {
        method: "POST",
        ...(typeof body === "string"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: body }) }
          : { body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "That did not work. You can fill the form in instead.");
        return;
      }
      setVia(json.via);
      track("cv_imported", { via: json.via, source: json.source ?? "file" });
      onImported(parseCv(json.cv), Array.isArray(json.check) ? json.check : []);
    } catch {
      setError("The upload could not reach us. Check your connection, or fill the form in instead.");
    } finally {
      setBusy(false);
    }
  }

  function upload(file: File | undefined | null) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("That file is over 8MB. Export it as a PDF from Word, or paste the text instead.");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    void send(form);
  }

  if (busy) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center">
        <p className="mt-5 text-lg font-bold text-ink">Reading your CV…</p>
        <p className="mt-2 text-[0.9rem] text-muted">
          {via === "pdf" ? "Pulling the text out of the PDF." : "This takes a few seconds."}
        </p>
      </div>
    );
  }

  if (mode === "documents") {
    return <DocumentsPanel onUse={onDocuments} onBack={() => setMode("choose")} />;
  }

  return (
    <div>
      {/* Three ways in, and the order is deliberate. Most students have no CV
          and no intention of typing one. They have photographs of their
          certificates on their phone, so that path goes first and widest. */}
      <button
        type="button"
        onClick={() => setMode("documents")}
        className="group mb-4 block w-full rounded-card border-2 border-brand-200 bg-brand-50 p-8 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-ink">
              Easiest
            </span>
            <h3 className="mt-3 text-xl font-bold text-ink">
              I have my documents, not a CV
            </h3>
            <p className="mt-3 leading-relaxed text-ink-2">
              Send photos of your marksheets, certificates, IELTS report and any experience
              letters. We read them and build the CV from them. Your board, your campus, your
              percentage, your test scores, already filled in.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[0.9rem] font-bold text-brand-ink">
              Upload my documents
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" className="transition-transform duration-200 group-hover:translate-x-1">
                <path d="M5 12h14m-6-7 7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </button>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* --- Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files?.[0]);
          }}
          className={`rounded-card border-2 border-dashed p-8 transition-colors ${
            dragging ? "border-brand bg-brand-50" : "border-line-2 bg-white"
          }`}
        >
          <h3 className="text-xl font-bold text-ink">I already have a CV</h3>
          <p className="mt-3 leading-relaxed text-ink-2">
            Upload it and we will read your details out of it, so you are correcting a filled form
            rather than typing one from nothing.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.odt,.txt,.md,.rtf"
            className="sr-only"
            onChange={(e) => upload(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-[0.95rem] font-bold text-navy shadow-[0_8px_24px_-10px_rgba(54,210,255,0.9)] transition-colors hover:bg-brand-light"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0L7 9m5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Choose a file
          </button>
          <p className="mt-3 text-[0.82rem] text-muted">
            PDF, Word, ODT or text. Up to 8MB. Or drag it onto this box.
          </p>

          <button
            type="button"
            onClick={() => setMode(mode === "paste" ? "choose" : "paste")}
            className="mt-4 text-[0.85rem] font-bold text-brand-ink underline underline-offset-4"
          >
            {mode === "paste" ? "Hide the paste box" : "Or paste the text instead"}
          </button>

          {mode === "paste" && (
            <div className="mt-4">
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={7}
                placeholder="Paste the whole CV here. Headings, dates and all."
                className="w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[0.9rem] outline-none focus:border-brand-ink"
              />
              <button
                type="button"
                disabled={pasted.trim().length < 40}
                onClick={() => void send(pasted)}
                className="mt-3 rounded-full bg-navy px-5 py-2.5 text-[0.88rem] font-bold text-white transition-opacity disabled:opacity-40"
              >
                Read this
              </button>
            </div>
          )}
        </div>

        {/* --- From scratch */}
        <div className="rounded-card border border-line bg-wash p-8">
          <h3 className="text-xl font-bold text-ink">I am starting from nothing</h3>
          <p className="mt-3 leading-relaxed text-ink-2">
            Most students are. We ask for the things a CV actually needs, in the order it needs
            them, and tell you what to write where you get stuck.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              "About five minutes for a first version",
              "Nothing is compulsory except your name and an email",
              "Your work saves in this browser as you type",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[0.92rem] text-ink-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-ink)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {line}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onScratch}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-[0.95rem] font-bold text-white transition-colors hover:bg-navy-90"
          >
            Start from scratch
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M5 12h14m-6-7 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-hard-50 px-5 py-4 text-[0.9rem] leading-relaxed text-hard">{error}</p>
      )}

      <p className="mt-6 text-[0.82rem] leading-relaxed text-muted">
        <strong className="text-ink-2">What happens to your file.</strong> It is read in memory and
        never saved, not to our server, not to our CRM, and it is not treated as an enquiry. The
        text is passed to an extraction model to pull the fields out, and then dropped. Your finished
        CV is stored only in this browser, which is also why clearing your browsing data will clear it.
      </p>
    </div>
  );
}

/**
 * What to look at first after documents have been read.
 *
 * Different from the CV-import checks: a stack of certificates gives a strong
 * education section and no contact details at all, because a marksheet does not
 * carry an email address. Saying so up front stops the student hunting for a
 * mistake that is not there.
 */
function checksFor(cv: Cv, results: DocumentResult[]): string[] {
  const out: string[] = [];
  if (!cv.email.trim()) out.push("your email address, which no certificate carries");
  if (!cv.phone.trim()) out.push("your phone number");
  if (!cv.name.trim()) out.push("your name");
  if (cv.education.some((e) => !e.grade.trim())) out.push("the marks on each qualification");
  if (results.some((r) => r.confidence === "low")) {
    out.push("anything read from a blurred photo, one of them was hard to make out");
  }
  return out.slice(0, 4);
}

/* ==========================================================================
   Step 2, the brief
========================================================================== */

function BriefStep({
  brief,
  setBrief,
  onBack,
  onNext,
}: {
  brief: Brief;
  setBrief: (b: Brief) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const patch = (p: Partial<Brief>) => setBrief({ ...brief, ...p });
  const ready = isComplete(brief);

  return (
    <div className="rounded-card border border-line bg-white p-7 sm:p-9">
      <h3 className="text-2xl font-bold text-ink">Five questions, then we pick the pattern.</h3>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
        A CV for a university application and a CV for a part-time job in Manchester are different
        documents. These answers decide which one you get, and none of them go anywhere.
      </p>

      <div className="mt-9 space-y-8">
        <Question label="What is this CV for?">
          <Choices
            options={purposes.map((p) => ({ value: p.value, label: p.label, hint: p.hint }))}
            value={brief.purpose}
            onChange={(v) => patch({ purpose: v as Brief["purpose"] })}
          />
        </Question>

        <Question label="What have you completed?">
          <Choices
            compact
            options={[
              { value: "plus2", label: "+2 or A-Levels" },
              { value: "bachelors", label: "Bachelor's" },
              { value: "masters", label: "Master's" },
            ]}
            value={brief.level}
            onChange={(v) => patch({ level: v as Brief["level"] })}
          />
        </Question>

        <Question label="And what are you applying for?">
          <Choices
            compact
            options={[
              { value: "diploma", label: "Diploma / PG diploma" },
              { value: "bachelors", label: "Bachelor's" },
              { value: "masters", label: "Master's" },
              { value: "phd", label: "PhD / research" },
            ]}
            value={brief.target}
            onChange={(v) => patch({ target: v as Brief["target"] })}
          />
        </Question>

        <Question label="How much work experience do you have?" hint="Full-time paid work. Internships count for less, and that is fine.">
          <Choices
            compact
            options={experienceBands.map((b) => ({ value: String(b.months), label: b.label }))}
            value={brief.experienceMonths == null ? "" : String(brief.experienceMonths)}
            onChange={(v) => patch({ experienceMonths: Number(v) })}
          />
        </Question>

        <Question label="Any break in your study or work?" hint="Extremely common in Nepal, and not a problem. It changes which pattern hides it best.">
          <Choices
            compact
            options={[
              { value: "none", label: "No break" },
              { value: "under1", label: "Under a year" },
              { value: "1to2", label: "1 to 2 years" },
              { value: "over2", label: "More than 2 years" },
            ]}
            value={brief.gap}
            onChange={(v) => patch({ gap: v as Brief["gap"] })}
          />
        </Question>

        <Question label="Have you done any research?" hint="Optional.">
          <Choices
            compact
            options={[
              { value: "none", label: "None" },
              { value: "thesis", label: "A thesis or dissertation" },
              { value: "published", label: "Something published" },
            ]}
            value={brief.research}
            onChange={(v) => patch({ research: v as Brief["research"] })}
          />
        </Question>

        <Question label="Where are you applying?" hint="Optional. It sets the conventions. What to leave off, and how long it should be.">
          <div className="flex flex-wrap gap-2">
            {destinations.map((d) => (
              <button
                key={d.slug}
                type="button"
                onClick={() => patch({ destination: brief.destination === d.slug ? "" : d.slug })}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[0.88rem] font-semibold transition-colors ${
                  brief.destination === d.slug
                    ? "border-navy bg-navy text-white"
                    : "border-line-2 text-ink hover:border-navy hover:bg-wash"
                }`}
              >
                <Flag code={d.code} />
                {d.short}
              </button>
            ))}
          </div>
        </Question>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="rounded-full px-5 py-3 text-[0.9rem] font-bold text-muted hover:text-navy">
          Back
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-[0.95rem] font-bold text-navy shadow-[0_8px_24px_-10px_rgba(54,210,255,0.9)] transition-opacity hover:bg-brand-light disabled:opacity-40 disabled:shadow-none"
        >
          See my pattern
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <path d="M5 12h14m-6-7 7 7-7 7" />
          </svg>
        </button>
        {!ready && <span className="text-[0.84rem] text-muted">The first four questions, then this opens.</span>}
      </div>
    </div>
  );
}

function Question({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[1.05rem] font-bold text-ink">{label}</p>
      {hint && <p className="mt-1.5 text-[0.86rem] leading-relaxed text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Choices({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-4 py-2.5 text-[0.88rem] font-semibold transition-colors ${
              value === o.value ? "border-navy bg-navy text-white" : "border-line-2 text-ink hover:border-navy hover:bg-wash"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            value === o.value ? "border-navy bg-navy text-white" : "border-line-2 bg-white hover:border-navy hover:bg-wash"
          }`}
        >
          <span className="block font-bold">{o.label}</span>
          {o.hint && (
            <span className={`mt-1 block text-[0.84rem] leading-snug ${value === o.value ? "text-white/70" : "text-muted"}`}>
              {o.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ==========================================================================
   Step 3, the pattern
========================================================================== */

function PatternStep({
  cv,
  brief,
  chosen,
  onChoose,
  onBack,
  onNext,
}: {
  cv: Cv;
  brief: Brief;
  chosen: string;
  onChoose: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const ranked = useMemo(() => recommend(brief), [brief]);
  const top = ranked[0];
  const rule = ruleFor(brief.destination);
  const { cv: preview, isSample } = previewCv(cv);

  return (
    <div>
      <div className="rounded-card border border-brand-200 bg-brand-50 p-7 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-ink">Our recommendation</p>
            <h3 className="mt-3 text-3xl font-bold text-ink">{top.template.name}</h3>
            <p className="mt-3 text-lg leading-relaxed text-ink-2">{top.reason}</p>
            <p className="mt-4 text-[0.9rem] font-semibold text-brand-ink">
              {top.template.pages} · {top.template.tagline}
            </p>
          </div>
          {/* The recommended design itself, rather than the mascot. This panel
              is answering "what will my CV look like", and a picture of a panda
              does not answer it. */}
          <div className="hidden shrink-0 sm:block">
            <PatternThumb cv={preview} template={top.template} size="lg" />
          </div>
        </div>
      </div>

      {rule && (
        <div className="mt-4 rounded-card border border-line bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-ink">
            Because you chose {rule.label}
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[0.86rem] font-bold text-ink">Leave off, without exception</p>
              <ul className="mt-2 space-y-1.5">
                {rule.never.map((n) => (
                  <li key={n} className="text-[0.88rem] text-ink-2">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[0.86rem] font-bold text-ink">What they expect</p>
              <ul className="mt-2 space-y-1.5">
                {rule.expect.map((n) => (
                  <li key={n} className="text-[0.88rem] text-ink-2">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-5 border-t border-line pt-4 text-[0.86rem] leading-relaxed text-muted">
            {rule.note} Called a <strong className="text-ink-2">{rule.calledIt}</strong> there.{" "}
            {rule.length}
          </p>
        </div>
      )}

      <p className="mt-10 text-[1.05rem] font-bold text-ink">All five patterns, ranked for you.</p>
      <p className="mt-1.5 text-[0.88rem] text-muted">
        Take a different one if you disagree. You can switch at any point without losing anything.
        {isSample && " The previews use an example CV until you have entered your own details."}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ranked.map((r, i) => (
          <PatternCard
            key={r.template.id}
            cv={preview}
            rec={r}
            rank={i}
            selected={chosen === r.template.id}
            onChoose={() => onChoose(r.template.id)}
          />
        ))}
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="rounded-full px-5 py-3 text-[0.9rem] font-bold text-muted hover:text-navy">
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-[0.95rem] font-bold text-navy shadow-[0_8px_24px_-10px_rgba(54,210,255,0.9)] transition-colors hover:bg-brand-light"
        >
          Build my CV
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <path d="M5 12h14m-6-7 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * A real thumbnail of the pattern, drawn from the same component that prints.
 *
 * Not a mock-up and not an icon: the actual CvDocument at a tenth scale, with
 * the student's own details in it once they have any. Two reasons it has to be
 * the real thing. A mock-up drifts from the document the moment either
 * changes, and a student picking between five text descriptions was picking
 * blind, which was the complaint. This is also why the five designs had to be
 * made genuinely different first; at this size a heading rule is invisible.
 */
function PatternThumb({
  cv,
  template,
  size = "sm",
}: {
  cv: Cv;
  template: CvTemplate;
  size?: "sm" | "lg";
}) {
  return (
    <span className={`cv-thumb${size === "lg" ? " cv-thumb-lg" : ""}`} aria-hidden="true">
      <CvDocument cv={cv} template={template} />
    </span>
  );
}

function PatternCard({
  cv,
  rec,
  rank,
  selected,
  onChoose,
}: {
  cv: Cv;
  rec: ReturnType<typeof recommend>[number];
  rank: number;
  selected: boolean;
  onChoose: () => void;
}) {
  const t = rec.template;
  return (
    <button
      type="button"
      onClick={onChoose}
      className={`rounded-card border p-6 text-left transition-all duration-200 ${
        selected
          ? "border-navy bg-white shadow-[0_18px_40px_-24px_rgba(12,20,51,0.28)]"
          : "border-line bg-white hover:border-brand-200 hover:-translate-y-0.5"
      }`}
    >
      <div className="mb-5 flex gap-5">
        <PatternThumb cv={cv} template={t} />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8rem] font-semibold leading-snug text-muted">
            {t.looksLike}
          </span>
        </span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-ink">{t.name}</h4>
          <p className="mt-1 text-[0.88rem] text-muted">{t.pages}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rank === 0 && (
            <span className="rounded-full bg-good-50 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-good">
              Best fit
            </span>
          )}
          <span
            className={`grid h-6 w-6 place-items-center rounded-full border-2 ${
              selected ? "border-navy bg-navy text-white" : "border-line-2"
            }`}
          >
            {selected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
        </div>
      </div>

      <p className="mt-3 leading-relaxed text-ink-2">{t.tagline}</p>

      <ul className="mt-4 space-y-1.5">
        {t.bestFor.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[0.86rem] text-ink-2">
            <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            {b}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-line pt-3 text-[0.83rem] leading-relaxed text-muted">
        <strong className="text-ink-2">Not for you if: </strong>
        {t.avoidIf}
      </p>

      {/* The labels keep their own casing, lowercasing them turned "English &
          entrance tests" into "english & entrance tests". */}
      <p className="mt-3 text-[0.8rem] font-semibold text-brand-ink">
        Leads on: {t.encourage.slice(0, 3).map((s) => sectionLabels[s]).join(" · ")}
      </p>
    </button>
  );
}

/* ==========================================================================
   Step 4, build
========================================================================== */

function BuildStep({
  cv,
  set,
  template,
  brief,
  review,
  check,
  onBack,
  onReset,
  onTemplate,
}: {
  cv: Cv;
  set: (patch: Partial<Cv>) => void;
  template: CvTemplate;
  brief: Brief;
  review: Review;
  check: string[];
  onBack: () => void;
  onReset: () => void;
  onTemplate: (id: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  const [tab, setTab] = useState<"preview" | "check">("preview");
  const [downloaded, setDownloaded] = useState(false);

  /* The preview is true to print, so it has to be scaled to whatever width the
     column happens to be, measured rather than assumed, because that column is
     half the screen on a desktop and all of it on a phone.
   *
   * Keyed on `tab`, and this matters: the stage unmounts when the student looks
   * at the check and a brand-new element mounts when they come back, so an
   * observer attached once on mount ends up watching a detached node and the
   * zoom freezes at whatever it last was. The first measurement is also taken
   * again on the next frame, because the very first one can land before the
   * grid has resolved its column widths and reads far too narrow. */
  useEffect(() => {
    if (tab !== "preview") return;
    const el = stageRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth - 28; // the stage's own padding
      if (width > 40) setZoom(Math.min(1, Math.max(0.3, width / PAGE_PX)));
    };
    measure();
    const frame = requestAnimationFrame(measure);

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", measure);
      };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [tab]);

  const ready = !!cv.name.trim() && !!cv.email.trim();
  const { cv: preview } = previewCv(cv);

  function toPdf() {
    track("cv_downloaded", { format: "pdf", template: template.id, score: review.score });
    setDownloaded(true);
    // The print copy is already in the DOM, so there is nothing to wait for.
    window.print();
  }

  function toWord() {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    track("cv_downloaded", { format: "doc", template: template.id, score: review.score });
    setDownloaded(true);
    downloadWord(html, cv.name);
  }

  function toTxt() {
    track("cv_downloaded", { format: "txt", template: template.id, score: review.score });
    setDownloaded(true);
    downloadText(cv, template);
  }

  return (
    <>
      {/* grid-cols-1 is load-bearing on phones, not decoration. Without it the
          single implicit column is auto-sized, and the A4-wide document in the
          preview pushed the track to 425px inside a 390px screen, so the whole
          builder scrolled sideways. grid-cols-1 resolves to
          repeat(1, minmax(0, 1fr)), which caps the track at the container. */}
      <div
        className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10"
        data-noprint
      >
        {/* --- The form */}
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-ink">
                {template.name} pattern
              </p>
              <p className="mt-1 text-[0.86rem] text-muted">{template.pages}</p>
            </div>
            <button type="button" onClick={onBack} className="text-[0.85rem] font-bold text-brand-ink underline underline-offset-4">
              Change pattern
            </button>
          </div>

          <CvFields cv={cv} set={set} template={template} check={check} />

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button type="button" onClick={onReset} className="text-[0.84rem] font-semibold text-muted underline underline-offset-4 hover:text-hard">
              Clear everything and start again
            </button>
            <span className="text-[0.84rem] text-muted">Saved in this browser as you type.</span>
          </div>
        </div>

        {/* --- The page, and the check */}
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 flex items-center gap-2">
            <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
              Your CV
            </TabButton>
            <TabButton active={tab === "check"} onClick={() => setTab("check")}>
              Check
              {review.findings.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[0.68rem] ${review.band === "needs-work" ? "bg-hard-50 text-hard" : "bg-warn-50 text-warn"}`}>
                  {review.findings.length}
                </span>
              )}
            </TabButton>
            <span className="ml-auto text-[0.8rem] text-muted">
              about {review.pages} page{review.pages === 1 ? "" : "s"}
            </span>
          </div>

          {/* The five designs, switchable here rather than only back at the
              pattern step. This is where a student is looking at their finished
              CV, and it is the moment they actually want to try the others, 
              sending them back two screens to do it was the wrong shape. Each
              swatch is the real document with their own details in it. */}
          {tab === "preview" && (
            <div className="mb-4">
              <p className="mb-2.5 text-[0.8rem] font-bold uppercase tracking-wider text-muted">
                Design
              </p>
              <div className="flex flex-wrap gap-2.5">
                {cvTemplates.map((t) => {
                  const active = t.id === template.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onTemplate(t.id)}
                      aria-pressed={active}
                      title={`${t.name}: ${t.looksLike}`}
                      className={`rounded-xl p-1 transition-all ${
                        active
                          ? "bg-navy shadow-[0_8px_20px_-12px_rgba(12,20,51,0.5)]"
                          : "bg-transparent hover:bg-wash"
                      }`}
                    >
                      <span className="cv-thumb cv-thumb-xs block">
                        <CvDocument cv={preview} template={t} sample />
                      </span>
                      <span
                        className={`mt-1 block max-w-[78px] truncate text-[0.68rem] font-semibold ${
                          active ? "text-white" : "text-muted"
                        }`}
                      >
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "preview" ? (
            /* The zoom is a custom property on the stage, which the document
               inherits. A measured number cannot be a Tailwind class, and
               inheriting one property is cleaner than injecting a stylesheet. */
            <div
              ref={stageRef}
              className="cv-stage max-h-[74vh]"
              style={{ "--cv-zoom": zoom } as React.CSSProperties}
            >
              <CvDocument cv={cv} template={template} />
            </div>
          ) : (
            <CheckPanel review={review} />
          )}

          <div className="mt-5 rounded-card border border-line bg-white p-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-bold text-ink">Download it. Free, and no email.</p>
              <ScorePill review={review} />
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                disabled={!ready}
                onClick={toPdf}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-[0.9rem] font-bold text-navy shadow-[0_8px_24px_-10px_rgba(54,210,255,0.9)] transition-opacity hover:bg-brand-light disabled:opacity-40 disabled:shadow-none"
              >
                PDF
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={toWord}
                className="rounded-full border border-line-2 px-5 py-3 text-[0.9rem] font-bold text-ink transition-colors hover:border-navy hover:bg-wash disabled:opacity-40"
              >
                Word
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={toTxt}
                className="rounded-full border border-line-2 px-5 py-3 text-[0.9rem] font-bold text-ink transition-colors hover:border-navy hover:bg-wash disabled:opacity-40"
              >
                Plain text
              </button>
            </div>

            {!ready ? (
              <p className="mt-3 text-[0.83rem] text-warn">Add your name and an email address, and these open.</p>
            ) : (
              <p className="mt-3 text-[0.83rem] leading-relaxed text-muted">
                PDF opens your browser&apos;s print window, choose <strong className="text-ink-2">Save as PDF</strong>{" "}
                as the destination. It will save as {cvFilename(cv.name, "pdf")}. Word gives you an
                editable copy; plain text is for application forms that strip formatting.
              </p>
            )}
          </div>

          {downloaded && <AfterDownload cv={cv} brief={brief} review={review} template={template} />}
        </div>
      </div>

      {/*
        The print copy.

        Hidden on screen, and the only thing left standing when the print
        stylesheet hides everything marked data-noprint. It is a second render
        of the same component rather than a repositioned first one, because the
        preview lives inside a scrolling, scaled, sticky column and no amount of
        print CSS reliably unpicks all three.
      */}
      <div className="cv-print-host" ref={printRef}>
        <CvDocument cv={cv} template={template} />
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-4 py-2 text-[0.86rem] font-bold transition-colors ${
        active ? "bg-navy text-white" : "text-muted hover:bg-wash hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

function ScorePill({ review }: { review: Review }) {
  const tone = review.band === "strong" ? "good" : review.band === "workable" ? "warn" : "hard";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        tone === "good" ? "bg-good-50 text-good" : tone === "warn" ? "bg-warn-50 text-warn" : "bg-hard-50 text-hard"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {review.score}/100
    </span>
  );
}

function CheckPanel({ review }: { review: Review }) {
  const groups: { severity: Finding["severity"]; label: string; blurb: string }[] = [
    { severity: "must", label: "Fix before you send this", blurb: "These stop the CV doing its job." },
    { severity: "should", label: "Worth fixing", blurb: "Each of these costs you marks with a reader." },
    { severity: "polish", label: "Polish", blurb: "Small things, but they are what separate two similar files." },
  ];

  return (
    <div className="rounded-card border border-line bg-white p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-lg font-bold text-ink">{review.headline}</p>
        <ScorePill review={review} />
      </div>
      <p className="mt-2 text-[0.86rem] text-muted">
        {review.words} words, about {review.pages} page{review.pages === 1 ? "" : "s"}. Checked as you type, no
        model, no guessing, and the same checks a counsellor runs by hand.
      </p>

      {review.findings.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-good-50 px-5 py-4 text-[0.9rem] leading-relaxed text-good">
          Nothing left to flag. Read it once more aloud for typos, that is the one thing no checker
          catches: and send it.
        </p>
      ) : (
        <div className="mt-6 max-h-[46vh] space-y-6 overflow-y-auto pr-1">
          {groups.map((g) => {
            const items = review.findings.filter((f) => f.severity === g.severity);
            if (!items.length) return null;
            return (
              <div key={g.severity}>
                <p
                  className={`text-[0.8rem] font-bold uppercase tracking-wider ${
                    g.severity === "must" ? "text-hard" : g.severity === "should" ? "text-warn" : "text-muted"
                  }`}
                >
                  {g.label}
                </p>
                <p className="mt-1 text-[0.8rem] text-muted">{g.blurb}</p>
                <ul className="mt-3 space-y-3">
                  {items.map((f, i) => (
                    <li key={i} className="rounded-2xl bg-wash px-4 py-3.5">
                      <p className="text-[0.88rem] font-bold text-ink">{f.title}</p>
                      <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-2">{f.fix}</p>
                      <p className="mt-1.5 text-[0.75rem] font-semibold uppercase tracking-wider text-muted">
                        {f.section}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * After a download.
 *
 * The offer of a human read comes here and nowhere earlier, because the whole
 * promise of the tool is that it is free and ungated, asking for a number
 * before the download would make that a lie. By this point the student has what
 * they came for and can ignore this entirely.
 */
function AfterDownload({
  cv,
  brief,
  review,
  template,
}: {
  cv: Cv;
  brief: Brief;
  review: Review;
  template: CvTemplate;
}) {
  const [name, setName] = useState(cv.name);
  const [phone, setPhone] = useState(cv.phone);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send() {
    if (name.trim().length < 2 || phone.replace(/\D/g, "").length < 7) {
      setState("error");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: cv.email,
          destination: brief.destination,
          stage: brief.level || "unspecified",
          page: "/tools/cv-maker",
          message: [
            `Asked for a CV review. ${template.name} pattern, self-check ${review.score}/100.`,
            `For: ${brief.purpose || "unstated"}, ${brief.level || "?"} → ${brief.target || "?"}.`,
            brief.destination ? `Destination: ${brief.destination}.` : "",
            `Sections filled: ${[
              cv.education.length && "education",
              cv.experience.length && "experience",
              cv.tests.length && "tests",
              cv.skills.length && "skills",
              cv.volunteering.length && "volunteering",
            ]
              .filter(Boolean)
              .join(", ") || "very few"}.`,
            review.findings.length ? `Top gap: ${review.findings[0].title}.` : "No gaps flagged.",
          ]
            .filter(Boolean)
            .join(" "),
        }),
      });
      if (!res.ok) throw new Error();
      track("cv_review_requested", { template: template.id, score: review.score });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="mt-4 rounded-card border border-good/30 bg-good-50 p-6">
        <p className="font-bold text-good">Got it: we will call you.</p>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-2">
          A counsellor will go through your CV line by line, usually within a working day. Bring
          your transcripts to the call if you have them.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-wash p-6">
      <p className="font-bold text-ink">Want a person to read it too?</p>
      <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-2">
        Optional, and it changes nothing about what you have already downloaded. A counsellor will go
        through it line by line and tell you what a UK or Canadian admissions officer would take
        issue with. Also free.
      </p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[0.92rem] outline-none focus:border-brand-ink"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone or Viber"
          type="tel"
          inputMode="tel"
          className="rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[0.92rem] outline-none focus:border-brand-ink"
        />
        <button
          type="button"
          disabled={state === "sending"}
          onClick={() => void send()}
          className="rounded-full bg-navy px-5 py-2.5 text-[0.9rem] font-bold text-white transition-opacity disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Ask for a read"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2.5 text-[0.84rem] text-hard">Check the name and number, then try once more.</p>
      )}
      <p className="mt-3 text-[0.78rem] text-muted">
        Your CV itself is not sent. Only your name and number, so we can ring you.
      </p>
    </div>
  );
}
