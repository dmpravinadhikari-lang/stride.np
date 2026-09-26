"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ruleFor, templateById, type CvTemplate } from "@/modules/cv/data/cv-templates";
import { commonLanguages, commonSkills } from "@/modules/cv/data/cv-expansions";
import { destinations } from "@/modules/cv/lib/compat";
import { applyChoices, emptySketch, expand, suggestSkills, type Draft, type Sketch } from "@/modules/cv/lib/expand";
import type { Cv } from "@/modules/cv/lib/schema";
import { reviewCv } from "@/modules/cv/lib/review";
import { emptyBrief, recommend, type Brief } from "@/modules/cv/lib/recommend";
import { cvFilename, downloadText, downloadWord } from "@/modules/cv/lib/download";
import { CvDocument } from "./CvDocument";
import { track } from "@/modules/cv/lib/compat";

/**
 * The CV builder, rebuilt around what a student can actually answer.
 *
 * The old one asked fifty questions across twelve sections and expected the
 * student to know what belonged in each. Most of them are seventeen, have
 * finished +2, and have helped in a shop. They filled four sections, left eight
 * blank, and got a CV that looked empty.
 *
 * So this asks eight short questions, one to a screen, and writes the CV from
 * the answers. The questions are in the words a student would use rather than
 * the words a CV uses: "what have you done?" and not "professional experience".
 *
 * ONE THING AT A TIME. A phone screen in Kathmandu shows about six form fields
 * before the keyboard covers the rest, and a wall of them is where people stop.
 * Every screen here holds one question, a large button, and nothing else.
 *
 * NOTHING IS REQUIRED EXCEPT A NAME. Every screen can be skipped. A half-filled
 * CV that exists beats a complete one that was abandoned on question thirty.
 *
 * THE SUGGESTIONS ARE TICKED, NOT ASSUMED. After the questions the engine
 * offers wording for what they described, and the student chooses which lines
 * are true. That is deliberate: this CV is filed with a visa application, and a
 * sentence the student cannot stand behind at interview is worse than a blank.
 *
 * Saved to localStorage and nowhere else. This tool is free and ungated, so
 * there is no honest trade in which we keep a student's phone number and their
 * family's circumstances. It also survives a closed tab, which matters on a
 * shared machine at a cyber cafe.
 */

const STORAGE_KEY = "hp-cv-v3";

type Phase = "intro" | "you" | "study" | "going" | "english" | "work" | "skills" | "languages"
  | "polish" | "look" | "done";

const ASKED: Phase[] = ["you", "study", "going", "english", "work", "skills", "languages"];

/** Screens that cannot render without a draft. See the restore effect. */
const NEEDS_DRAFT: Phase[] = ["polish", "look", "done"];
const ORDER: Phase[] = ["intro", ...ASKED, "polish", "look", "done"];

const LEVELS = [
  { id: "plus2", label: "+2 or A-Levels" },
  { id: "bachelors", label: "Bachelor's" },
  { id: "masters", label: "Master's" },
];

const TARGETS = [
  { id: "diploma", label: "Diploma" },
  { id: "bachelors", label: "Bachelor's" },
  { id: "masters", label: "Master's" },
  { id: "phd", label: "PhD" },
];

const TESTS = ["IELTS", "PTE", "TOEFL", "Duolingo", "Not taken yet"];

/* ---------------------------------------------------------------- pieces -- */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.9rem] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.8rem] text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line-2 bg-white px-4 py-3 text-[1rem] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-navy";

function Choice({
  options, value, onChange,
}: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(value === o.id ? "" : o.id)}
          className={`rounded-full border-2 px-4 py-2.5 text-[0.92rem] font-bold transition-colors ${
            value === o.id
              ? "border-navy bg-navy text-white"
              : "border-line-2 text-ink-2 hover:border-navy hover:text-navy"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A list of things to tick, and optionally to rate.
 *
 * The dots appear only once a skill is ticked, and only where `onLevel` is
 * given. They are deliberately optional: a student who ignores them gets a CV
 * with no levels on it, which is the honest default. Nothing invents a rating,
 * because a "4 out of 5" beside MS Excel is a claim they have to be able to
 * stand behind at an interview.
 */
function TickList({
  options, chosen, onToggle, columns = 2, level, onLevel,
}: {
  options: string[];
  chosen: string[];
  onToggle: (v: string) => void;
  columns?: number;
  level?: (v: string) => number;
  onLevel?: (v: string, n: number) => void;
}) {
  return (
    <div className={`grid gap-2 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {options.map((o) => {
        const on = chosen.includes(o);
        const n = level?.(o) ?? 0;
        return (
          <div
            key={o}
            className={`rounded-xl border-2 transition-colors ${
              on ? "border-navy bg-navy/[0.04]" : "border-line-2 hover:border-navy"
            }`}
          >
            <button
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={on}
              className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-[0.92rem] font-semibold ${
                on ? "text-navy" : "text-ink-2"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[0.7rem] font-black ${
                  on ? "border-navy bg-navy text-white" : "border-line-2"
                }`}
              >
                {on ? "✓" : ""}
              </span>
              {o}
            </button>

            {on && onLevel && (
              <div className="flex items-center gap-2 px-3.5 pb-2.5">
                <span className="text-[0.72rem] font-semibold text-muted">
                  {n ? `${n} of 5` : "How well?"}
                </span>
                <span className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onLevel(o, i)}
                      aria-label={`${o}: ${i} out of 5`}
                      className={`h-4 w-4 rounded-full border transition-colors ${
                        i <= n ? "border-navy bg-navy" : "border-line-2 bg-white hover:border-navy"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-[0.7rem] text-muted">optional</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The mascot, at the two moments it is welcome and not before. */
/**
 * The graduate. This was the last place still using the retired SVG character,
 * which meant the CV maker had a different panda from the rest of the site.
 *
 * The pose earns its place here rather than being decoration: cap, gown and
 * diploma are what the CV is for, so he marks the two moments that matter, 
 * the invitation to start, and the finished file.
 */
/** The illustration slot the builder came with. OfficeYak does not use a mascot,
 *  so this renders nothing and the layout closes up around it. */
function Panda(_: { width?: number; sway?: boolean }) {
  return null;
}

/**
 * The page, scaled to whatever width the column happens to be.
 *
 * CvDocument renders at A4 width because it has to be true to what prints. The
 * column beside a form is never 794px, so it is measured and scaled rather than
 * assumed. Measured again on the next frame, because the first reading can land
 * before the grid has resolved its columns and comes back far too narrow.
 *
 * DEFINED AT MODULE LEVEL, AND THAT IS NOT A STYLE CHOICE. This and the two
 * wrappers below used to live inside CvBuilder. A component declared inside a
 * render is a new function on every render, React reads a new function as a
 * different component, and it therefore throws the whole subtree away and
 * mounts a fresh one on every keystroke. The visible symptom was that typing a
 * phone number put the digits in the name field: each character remounted the
 * form, focus was lost, and the autoFocus on the name input caught it.
 */
function Preview({ cv, template }: { cv: Cv; template: CvTemplate }) {
  const stage = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.42);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth - 24;
      if (width > 40) setZoom(Math.min(1, Math.max(0.25, width / 794)));
    };
    measure();
    const frame = requestAnimationFrame(measure);
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", measure); };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, []);

  const started = Boolean(cv.name || cv.education.length || cv.experience.length);

  return (
    <div ref={stage} className="rounded-2xl border border-line bg-wash/40 p-3">
      <p className="mb-2 px-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted">
        Your CV so far
      </p>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
        <div style={{ height: 1123 * zoom }} className="relative">
          <div
            style={{ width: 794, transform: `scale(${zoom})`, transformOrigin: "top left" }}
            className="absolute left-0 top-0"
          >
            {/* The panel beside the questions is a picture of the document,
                not the document, so it does not claim the page's h1. */}
            <CvDocument cv={cv} template={template} sample />
          </div>
        </div>
      </div>
      {!started && (
        <p className="mt-2 px-1 text-[0.78rem] leading-relaxed text-muted">
          This fills in as you answer.
        </p>
      )}
    </div>
  );
}

/** Questions on the left, the page on the right, once there is a form. */
function WithPreview({
  children, cv, template,
}: { children: React.ReactNode; cv: Cv; template: CvTemplate }) {
  return (
    <div data-cv-builder className="scroll-mt-6 mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">{children}</div>
      <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <Preview cv={cv} template={template} />
      </aside>
    </div>
  );
}

function Shell({
  title, sub, children, canSkip = true, stepIndex, showBack, onNext, onBack, cv, template,
  onDone,
}: {
  title: string; sub?: string; children: React.ReactNode; canSkip?: boolean;
  stepIndex: number; showBack: boolean; onNext: () => void; onBack: () => void;
  cv: Cv; template: CvTemplate;
  /** Present once a CV has been finished, so an edit is one question long. */
  onDone?: () => void;
}) {
  return (
    <WithPreview cv={cv} template={template}>
      {/*
        The way out, once there is something to go back to.
        Somebody who came back to fix one spelling should not have to walk
        through six more questions to see their CV again.
      */}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-wash px-4 py-2 text-[0.86rem] font-bold text-ink-2 transition-colors hover:text-navy"
        >
          ← Back to my CV
        </button>
      )}
      {stepIndex >= 0 && (
        <div className="mb-8 flex items-center gap-1.5" aria-hidden="true">
          {ASKED.map((p, i) => (
            <span key={p} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-navy" : "bg-line"}`} />
          ))}
        </div>
      )}
      <h2 className="text-[1.6rem] font-black leading-tight tracking-tight text-navy sm:text-[1.9rem]">{title}</h2>
      {sub && <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-2">{sub}</p>}
      {/*
        Enter moves on. The screens are loose inputs rather than a <form>, so
        the key everybody presses after typing an answer did nothing, and on a
        phone keyboard that key is labelled "go".
      */}
      <div
        className="mt-7 space-y-5"
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const el = e.target as HTMLElement;
          if (el.tagName === "TEXTAREA") return;
          e.preventDefault();
          onNext();
        }}
      >
        {children}
      </div>
      <div className="mt-9 flex items-center gap-3">
        <button type="button" onClick={onNext}
          className="rounded-full bg-navy px-8 py-4 text-[1rem] font-bold text-white transition-colors hover:bg-navy-90">
          Continue
        </button>
        {canSkip && (
          <button type="button" onClick={onNext} className="text-[0.92rem] font-semibold text-muted hover:text-navy">
            Skip this
          </button>
        )}
        {showBack && (
          <button type="button" onClick={onBack} className="ml-auto text-[0.92rem] font-semibold text-muted hover:text-navy">
            Back
          </button>
        )}
      </div>
    </WithPreview>
  );
}

/**
 * Rebuild the draft from the answers without losing what they already ticked.
 *
 * `expand` is pure and always returns every suggestion unticked, which is
 * right the first time through and wrong every time after it. A student who
 * goes back from the finished CV to correct a spelling must not be handed an
 * empty CV as the price.
 *
 * Matched on the sentence rather than its position, because adding a job moves
 * every index after it while leaving the sentences alone. Anything the rebuild
 * no longer offers simply does not come back, which is correct: a bullet about
 * a job they have just deleted should not survive it.
 */
function carryTicks(old: Draft | null, fresh: Draft): Draft {
  if (!old) return fresh;

  const chosenText = new Set<string>();
  for (const list of Object.values(old.offered)) {
    for (const s of list) if (s.chosen) chosenText.add(s.text);
  }
  for (const s of old.educationOffered) if (s.chosen) chosenText.add(s.text);

  const restore = (list: { text: string; chosen: boolean }[]) =>
    list.map((s) => (chosenText.has(s.text) ? { ...s, chosen: true } : s));

  return {
    ...fresh,
    educationOffered: restore(fresh.educationOffered),
    offered: Object.fromEntries(
      Object.entries(fresh.offered).map(([i, list]) => [i, restore(list)]),
    ),
  };
}

/* --------------------------------------------------------------- builder -- */

export function CvBuilder() {
  const [phase, setPhase] = useState<Phase>("intro");
  /*
   * Whether a CV has ever been finished on this device.
   *
   * It decides whether the questions offer a way straight back to the CV. Kept
   * in the saved copy alongside the answers, so somebody who closes the tablet
   * and comes back tomorrow to change one line still gets the short way out.
   */
  const [finished, setFinished] = useState(false);

  const [sketch, setSketch] = useState<Sketch>(emptySketch);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [templateId, setTemplateId] = useState<string>("fresher");
  const [restored, setRestored] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Sketch>(k: K, v: Sketch[K]) => setSketch((s) => ({ ...s, [k]: v }));

  /*
   * Restore once, before anything can overwrite it.
   *
   * THE DRAFT IS SAVED TOO, and that is not an optimisation.
   *
   * The phase was saved and the draft was not. Three of the screens need a
   * draft to render, the suggestions, the design picker and the finished CV, 
   * so a student who got as far as any of them and came back the next day
   * restored to that phase with no draft, matched none of the branches, and
   * got a blank space where the whole tool should be. Nothing on screen, no
   * error, no way back: the page looked broken because it was.
   *
   * Two defences, because this cost a live tool. The draft is persisted, so
   * the ticked suggestions survive a reload. And if it is ever missing anyway
   *, an old saved copy from before this change, a half-written store, it is
   * rebuilt from the sketch, which is pure and costs nothing.
   */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          sketch?: Sketch; phase?: Phase; templateId?: string; draft?: Draft | null;
          finished?: boolean;
        };
        const sk = saved.sketch ? { ...emptySketch, ...saved.sketch } : emptySketch;
        if (saved.sketch) setSketch(sk);
        if (saved.templateId) setTemplateId(saved.templateId);
        if (saved.finished) setFinished(true);

        if (saved.phase && ORDER.includes(saved.phase)) {
          setPhase(saved.phase);
          if (NEEDS_DRAFT.includes(saved.phase)) {
            setDraft(saved.draft ?? expand(sk));
          } else if (saved.draft) {
            setDraft(saved.draft);
          }
        }
      }
    } catch {
      /* A corrupt or blocked store is not worth an error message. */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sketch, phase, templateId, draft, finished }));
    } catch {
      /* Private mode, or a draft too big for the quota. The tool still works,
         it just will not survive a reload. */
    }
  }, [sketch, phase, templateId, draft, finished, restored]);

  const [ownSkill, setOwnSkill] = useState("");

  /* The suggestions for the skills screen, and the ones they typed themselves. */
  const skillGroups = useMemo(() => suggestSkills(sketch), [sketch]);
  const own = useMemo(() => {
    const known = new Set(skillGroups.flatMap((g) => g.items.map((i) => i.toLowerCase())));
    return sketch.skills.filter((v) => !known.has(v.toLowerCase()));
  }, [skillGroups, sketch.skills]);

  const template = useMemo(() => templateById(templateId), [templateId]);
  const cv = useMemo(() => (draft ? applyChoices(draft) : null), [draft]);

  /*
   * The CV as it stands right now, for the panel beside the questions.
   *
   * Recomputed from the sketch on every keystroke rather than only at the end.
   * That is the whole point of showing it: a student typing their name should
   * watch their name appear on a page, because a form that gives nothing back
   * feels like a form that is going nowhere. expand() is pure and small, so
   * running it per keystroke costs nothing worth measuring.
   *
   * Once the suggestions are on screen the real draft takes over, so ticking a
   * line visibly adds it to the page. That is the moment the tool explains
   * itself without a word of instruction.
   */
  const preview = useMemo(
    () => (draft ? applyChoices(draft) : applyChoices(expand(sketch))),
    [draft, sketch],
  );
  /*
   * The country, as a slug the rules can be looked up by.
   *
   * The question stores the full name, because that is what a student reads on
   * a button. The country conventions are keyed by slug, so until this existed
   * the review knew the destination and could not act on it: a student
   * applying to Australia was never told it expects named referees, and one
   * applying to the UK was never told the length convention there.
   */
  const countrySlug = useMemo(
    () => destinations.find((d) => d.name === sketch.destination)?.slug ?? "",
    [sketch.destination],
  );
  const country = useMemo(() => ruleFor(countrySlug) ?? null, [countrySlug]);

  const review = useMemo(
    () =>
      cv
        ? reviewCv(cv, template, {
            ...emptyBrief,
            level: sketch.level as never,
            destination: countrySlug,
          })
        : null,
    [cv, template, sketch.level, countrySlug],
  );

  /*
   * The sketch, in the shape the recommender already understands.
   *
   * recommend() was written against a six-question brief and ranks the five
   * patterns properly. Rather than write a second ranking that would drift from
   * it, the few answers this flow collects are mapped onto that shape and the
   * gaps left empty; the scoring handles absent values by not scoring them.
   */
  const brief: Brief = useMemo(() => {
    const years = sketch.work.reduce((n, w) => {
      const a = Number((w.from.match(/20\d{2}/) ?? [])[0]);
      const b = Number((w.to.match(/20\d{2}/) ?? [])[0]) || new Date().getFullYear();
      return a && b > a ? n + (b - a) : n;
    }, 0);
    return {
      ...emptyBrief,
      level: (sketch.level || "") as Brief["level"],
      target: (sketch.target || "") as Brief["target"],
      experienceMonths: years * 12,
    };
  }, [sketch]);

  const ranked = useMemo(() => recommend(brief), [brief]);

  /* The recommended pattern is pre-selected, once, when they first arrive at
     the look step. Overruling it is a scroll and a tap. */
  const pickedLook = useRef(false);
  useEffect(() => {
    if (phase !== "look" || pickedLook.current || !ranked.length) return;
    pickedLook.current = true;
    setTemplateId(ranked[0].template.id);
  }, [phase, ranked]);

  const stepIndex = ASKED.indexOf(phase);
  const canGoBack: boolean = phase !== "you";
  const go = (next: Phase) => {
    /*
     * Any screen that shows the finished CV is rebuilt from the answers first.
     *
     * The draft holds a copy of the CV made when the questions were last
     * answered. Going back to correct a name and jumping straight to "Back to
     * my CV" left that copy untouched, so the page still showed the old
     * spelling and the download carried it. Rebuilding here, with the ticks
     * carried across, means every way back out of an edit shows the edit.
     */
    if (next === "polish" || next === "look" || next === "done") {
      /*
       * Rebuilt from the answers, but the ticks are carried across.
       *
       * This used to be a plain `setDraft(expand(sketch))`, which was fine
       * when the only way here was forwards. Now that somebody can go back
       * from the finished CV and correct a spelling, a plain rebuild would
       * silently untick every line they had already agreed to and hand them
       * an empty CV as the price of fixing one letter.
       *
       * Matched on the text of the suggestion, not its position: the position
       * moves when a job is added, the sentence does not.
       */
      setDraft((old) => carryTicks(old, expand(sketch)));
      if (next === "polish") track("cv_expanded", { jobs: String(sketch.work.length) });
    }
    if (next === "done") setFinished(true);
    setPhase(next);

    /*
     * Back to the top of the form, not the top of the page.
     *
     * This used to be window.scrollTo(0). The builder sits well down a page of
     * marketing copy, so every answered question threw the student back up to
     * the hero and they had to scroll down again to find the next one.
     *
     * Left alone when the form is already sitting near the top of the view,
     * because scrolling a page that is already in the right place is its own
     * small annoyance. Deferred a frame so the new screen has laid out and its
     * position is the one being measured.
     */
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>("[data-cv-builder]");
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top >= -8 && top <= 96) return;
      /*
       * scrollIntoView rather than arithmetic on scrollY.
       *
       * Computing a target from getBoundingClientRect().top plus scrollY reads
       * a rectangle that is itself moving while a previous smooth scroll is
       * still running, so the page crept a couple of dozen pixels instead of
       * going where it was sent. The gap under the viewport top comes from
       * scroll-margin-top on the element, which the browser applies for us.
       */
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const nextOf = (p: Phase) => ORDER[Math.min(ORDER.indexOf(p) + 1, ORDER.length - 1)];
  const backOf = (p: Phase) => ORDER[Math.max(ORDER.indexOf(p) - 1, 0)];

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const tick = (kind: "job" | "education", idx: number, at: number) =>
    setDraft((d) => {
      if (!d) return d;
      if (kind === "job") {
        const next = { ...d.offered, [idx]: d.offered[idx].map((s, i) => (i === at ? { ...s, chosen: !s.chosen } : s)) };
        return { ...d, offered: next };
      }
      return { ...d, educationOffered: d.educationOffered.map((s, i) => (i === at ? { ...s, chosen: !s.chosen } : s)) };
    });

  /* ------------------------------------------------------------- chrome -- */

  /* -------------------------------------------------------------- screens -- */

  if (phase === "intro") {
    return (
      <div data-cv-builder className="scroll-mt-6 mx-auto max-w-xl px-5 py-14 text-center">
        {/* text-center does not centre a fixed-width block, so he sat off to
            the left of a centred headline. */}
        <span className="mx-auto block w-[132px]">
          <Panda width={132} sway />
        </span>
        <h1 className="mt-6 text-[2rem] font-black leading-tight tracking-tight text-navy sm:text-[2.4rem]">
          Create your CV in a few clicks, for FREE.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[1.02rem] leading-relaxed text-ink-2">
          Eight short questions in plain words. We write it up properly, you tick what is true, and
          you download it.
        </p>
        <button
          type="button"
          onClick={() => { track("cv_started"); go("you"); }}
          className="mt-9 rounded-full bg-navy px-10 py-4 text-[1.05rem] font-bold text-white transition-colors hover:bg-navy-90"
        >
          Start
        </button>
        {/*
          The promise, at the top rather than in the small print.
          Every other free CV builder is free until the download, so a student
          arriving here is braced for the wall and reads any silence as one.
        */}
        <p className="mx-auto mt-7 max-w-md rounded-2xl bg-good-50 px-5 py-3.5 text-[0.95rem] font-bold leading-relaxed text-good">
          100% free, including the download. No account, no email, no payment, no watermark.
        </p>
        <p className="mt-4 text-[0.85rem] text-muted">
          Saved on this device as you go, and nothing is sent to us.
        </p>
      </div>
    );
  }

  if (phase === "you") {
    return (
      <Shell title="First, who are you?" sub="Only your name is needed. The rest helps a college contact you." canSkip={false} stepIndex={stepIndex} showBack={canGoBack} onDone={finished ? () => go("done") : undefined} onNext={() => go(nextOf(phase))} onBack={() => go(backOf(phase))} cv={preview} template={template}>
        <Field label="Your full name"><input className={inputCls} value={sketch.name} onChange={(e) => set("name", e.target.value)} placeholder="As on your passport" autoFocus /></Field>
        <Field label="Phone"><input className={inputCls} value={sketch.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98…" inputMode="tel" /></Field>
        <Field label="Email"><input className={inputCls} value={sketch.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" type="email" /></Field>
        <Field label="Where you live"><input className={inputCls} value={sketch.city} onChange={(e) => set("city", e.target.value)} placeholder="Kathmandu" /></Field>
      </Shell>
    );
  }

  if (phase === "study") {
    return (
      <Shell title="What have you studied?" sub="Whatever you finished most recently." stepIndex={stepIndex} showBack={canGoBack} onDone={finished ? () => go("done") : undefined} onNext={() => go(nextOf(phase))} onBack={() => go(backOf(phase))} cv={preview} template={template}>
        <Field label="Level"><Choice options={LEVELS} value={sketch.level} onChange={(v) => set("level", v)} /></Field>
        <Field label="Subject or stream" hint="Science, Management, Humanities, BBS, BSc CSIT and so on">
          <input className={inputCls} value={sketch.field} onChange={(e) => set("field", e.target.value)} placeholder="Management" />
        </Field>
        <Field label="School or college"><input className={inputCls} value={sketch.institution} onChange={(e) => set("institution", e.target.value)} placeholder="Kalika Higher Secondary" /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Board"><input className={inputCls} value={sketch.board} onChange={(e) => set("board", e.target.value)} placeholder="NEB" /></Field>
          <Field label="Finished"><input className={inputCls} value={sketch.finished} onChange={(e) => set("finished", e.target.value)} placeholder="2025" inputMode="numeric" /></Field>
          <Field label="Result"><input className={inputCls} value={sketch.grade} onChange={(e) => set("grade", e.target.value)} placeholder="68%" /></Field>
        </div>
      </Shell>
    );
  }

  if (phase === "going") {
    return (
      <Shell title="Where do you want to go?" sub="So the CV is written for the right application." stepIndex={stepIndex} showBack={canGoBack} onDone={finished ? () => go("done") : undefined} onNext={() => go(nextOf(phase))} onBack={() => go(backOf(phase))} cv={preview} template={template}>
        <Field label="What are you applying for?"><Choice options={TARGETS} value={sketch.target} onChange={(v) => set("target", v)} /></Field>
        <Field label="Which country?">
          <Choice
            options={destinations.map((d) => ({ id: d.name, label: d.short }))}
            value={sketch.destination}
            onChange={(v) => set("destination", v)}
          />
        </Field>
      </Shell>
    );
  }

  if (phase === "english") {
    return (
      <Shell title="Have you taken an English test?" sub="If not, skip. It can be added later." stepIndex={stepIndex} showBack={canGoBack} onDone={finished ? () => go("done") : undefined} onNext={() => go(nextOf(phase))} onBack={() => go(backOf(phase))} cv={preview} template={template}>
        <Field label="Test"><Choice options={TESTS.map((t) => ({ id: t, label: t }))} value={sketch.englishTest} onChange={(v) => set("englishTest", v)} /></Field>
        {sketch.englishTest && sketch.englishTest !== "Not taken yet" && (
          <Field label="Overall score" hint="Add the band breakdown if you have it, like 6.5 (L6.0)">
            <input className={inputCls} value={sketch.englishScore} onChange={(e) => set("englishScore", e.target.value)} placeholder="6.5" />
          </Field>
        )}
      </Shell>
    );
  }

  if (phase === "work") {
    const rows = sketch.work.length ? sketch.work : [{ what: "", where: "", from: "", to: "" }];
    const update = (i: number, k: keyof Sketch["work"][number], v: string) => {
      const next = rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r));
      set("work", next);
    };
    return (
      <Shell
        title="Have you done any work?"
        sub="Anything counts. Helping in a shop, tuition, an internship, the family land. Write it how you would say it."
       stepIndex={stepIndex} showBack={canGoBack} onDone={finished ? () => go("done") : undefined} onNext={() => go(nextOf(phase))} onBack={() => go(backOf(phase))} cv={preview} template={template}>
        {rows.map((row, i) => (
          <div key={i} className="rounded-2xl border border-line-2 p-4">
            <Field label="What did you do?">
              <input className={inputCls} value={row.what} onChange={(e) => update(i, "what", e.target.value)} placeholder="helped in my uncle's clothes shop" />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Where"><input className={inputCls} value={row.where} onChange={(e) => update(i, "where", e.target.value)} placeholder="Ranjana Fashion" /></Field>
              <Field label="From"><input className={inputCls} value={row.from} onChange={(e) => update(i, "from", e.target.value)} placeholder="2024" inputMode="numeric" /></Field>
              <Field label="To"><input className={inputCls} value={row.to} onChange={(e) => update(i, "to", e.target.value)} placeholder="2025 or now" /></Field>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("work", [...rows, { what: "", where: "", from: "", to: "" }])}
          className="rounded-full border-2 border-line-2 px-5 py-2.5 text-[0.9rem] font-bold text-ink-2 hover:border-navy hover:text-navy"
        >
          Add another
        </button>
      </Shell>
    );
  }

  if (phase === "skills") {
    /*
     * Built from their own answers, not from a fixed list.
     *
     * This screen used to ask every student the same ten computer packages,
     * which meant a nurse with two years on a ward was asked about Canva and
     * had nowhere to say "patient care". Each group now carries the reason it
     * appeared, so a student can tell at a glance whether it is true of them.
     */
    return (
      <Shell
        title="Which of these can you actually do?"
        sub="Picked from what you have told us. Tick only what is true."
        stepIndex={stepIndex} showBack={canGoBack} onDone={finished ? () => go("done") : undefined} onNext={() => go(nextOf(phase))} onBack={() => go(backOf(phase))} cv={preview} template={template}>
        <div className="space-y-7">
          {skillGroups.map((g) => (
            <section key={g.group}>
              <h3 className="text-[0.95rem] font-black text-navy">
                {g.group}
                <span className="ml-2 text-[0.82rem] font-semibold text-muted">{g.why}</span>
              </h3>
              <div className="mt-3">
                <TickList
                  options={g.items}
                  chosen={sketch.skills}
                  onToggle={(v) => set("skills", toggle(sketch.skills, v))}
                  level={(v) => sketch.skillLevels?.[v] ?? 0}
                  onLevel={(v, n) =>
                    set("skillLevels", {
                      ...sketch.skillLevels,
                      // Tapping the dot already set clears it, so a rating can
                      // be taken back rather than only ever raised.
                      ...(sketch.skillLevels?.[v] === n ? { [v]: 0 } : { [v]: n }),
                    })
                  }
                />
              </div>
            </section>
          ))}

          <section>
            <h3 className="text-[0.95rem] font-black text-navy">
              Something else
              <span className="ml-2 text-[0.82rem] font-semibold text-muted">anything we have missed</span>
            </h3>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = ownSkill.trim();
                if (!v) return;
                if (!sketch.skills.some((x) => x.toLowerCase() === v.toLowerCase())) {
                  set("skills", [...sketch.skills, v]);
                }
                setOwnSkill("");
              }}
            >
              <input
                className={`${inputCls} max-w-xs`}
                value={ownSkill}
                onChange={(e) => setOwnSkill(e.target.value)}
                placeholder="Driving licence, tailoring, video editing"
              />
              <button type="submit" className="rounded-full border-2 border-line-2 px-5 py-2.5 text-[0.9rem] font-bold text-ink-2 hover:border-navy hover:text-navy">
                Add
              </button>
            </form>
            {own.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {own.map((v) => (
                  <button key={v} type="button" onClick={() => set("skills", toggle(sketch.skills, v))}
                    className="rounded-full bg-navy px-3.5 py-1.5 text-[0.85rem] font-bold text-white">
                    {v} <span aria-hidden="true" className="ml-1 opacity-70">×</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </Shell>
    );
  }

  if (phase === "languages") {
    return (
      <Shell title="Which languages do you speak?" sub="Last question." stepIndex={stepIndex} showBack={canGoBack} onDone={finished ? () => go("done") : undefined} onNext={() => go(nextOf(phase))} onBack={() => go(backOf(phase))} cv={preview} template={template}>
        <TickList
          options={commonLanguages.map((l) => l.name)}
          chosen={sketch.languages}
          onToggle={(v) => set("languages", toggle(sketch.languages, v))}
          columns={3}
        />
      </Shell>
    );
  }

  if (phase === "polish" && draft) {
    const anyOffered =
      draft.educationOffered.length + Object.keys(draft.offered).length > 0;
    return (
      <WithPreview cv={preview} template={template}>
        <div>
          <div>
            <h2 className="text-[1.6rem] font-black leading-tight tracking-tight text-navy sm:text-[1.9rem]">
              Here is what we can say about you.
            </h2>
            <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-2">
              Tick every line that is true. Leave the rest. Only what you tick goes on your CV, and
              you should be able to talk about each one at an interview.
            </p>
          </div>
        </div>

        {!anyOffered && (
          <p className="mt-8 rounded-2xl bg-wash p-5 text-[0.95rem] text-ink-2">
            Nothing to suggest yet, which just means the earlier questions were skipped. You can go
            back, or carry on and write the CV yourself.
          </p>
        )}

        {draft.cv.experience.map((job, i) => (
          <section key={i} className="mt-8">
            <h3 className="text-[1.05rem] font-bold text-ink">{job.role}{job.organisation ? `, ${job.organisation}` : ""}</h3>
            {draft.prompts[i] && (
              <p className="mt-1 text-[0.86rem] font-semibold text-brand-ink">{draft.prompts[i]}</p>
            )}
            <div className="mt-3 space-y-2">
              {(draft.offered[i] ?? []).map((s, at) => (
                <button
                  key={at}
                  type="button"
                  onClick={() => tick("job", i, at)}
                  className={`flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[0.94rem] transition-colors ${
                    s.chosen ? "border-navy bg-navy/[0.04] text-navy" : "border-line-2 text-ink-2 hover:border-navy"
                  }`}
                >
                  <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[0.7rem] font-black ${s.chosen ? "border-navy bg-navy text-white" : "border-line-2"}`}>
                    {s.chosen ? "✓" : ""}
                  </span>
                  {s.text}
                </button>
              ))}
            </div>
          </section>
        ))}

        {draft.educationOffered.length > 0 && (
          <section className="mt-8">
            <h3 className="text-[1.05rem] font-bold text-ink">Your studies</h3>
            <div className="mt-3 space-y-2">
              {draft.educationOffered.map((s, at) => (
                <button key={at} type="button" onClick={() => tick("education", 0, at)}
                  className={`flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[0.94rem] transition-colors ${s.chosen ? "border-navy bg-navy/[0.04] text-navy" : "border-line-2 text-ink-2 hover:border-navy"}`}>
                  <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[0.7rem] font-black ${s.chosen ? "border-navy bg-navy text-white" : "border-line-2"}`}>{s.chosen ? "✓" : ""}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 flex items-center gap-3">
          <button type="button" onClick={() => go("look")} className="rounded-full bg-navy px-8 py-4 text-[1rem] font-bold text-white hover:bg-navy-90">
            Choose the look
          </button>
          <button type="button" onClick={() => go("languages")} className="ml-auto text-[0.92rem] font-semibold text-muted hover:text-navy">Back</button>
        </div>
      </WithPreview>
    );
  }

  if (phase === "look") {
    return (
      <WithPreview cv={preview} template={template}>
        <h2 className="text-[1.6rem] font-black leading-tight tracking-tight text-navy sm:text-[1.9rem]">Pick a look.</h2>
        <p className="mt-2 text-[0.98rem] text-ink-2">
          Each one shows your own details, so you can see the difference rather than guess at it.
          All of them are plain enough for a university to read.
        </p>

        {/*
          Real pages, not swatches.

          Every thumbnail is the same CvDocument that prints, at a tenth scale,
          carrying the student's own content. A mock-up drifts from the document
          the moment either changes, and a row of names and taglines is what the
          old builder had: it left students choosing blind, which was the
          complaint that produced this screen in the first place.

          Five, and deliberately not more. The decorative templates other
          builders offer are two-column layouts with photographs and colour
          bars, and for a CV that goes into a CAS or a visa file those are a
          trap dressed as a feature.
        */}
        <div className="mt-7 -mx-5 overflow-x-auto px-5 pb-2">
          <div className="flex gap-4" style={{ minWidth: "min-content" }}>
            {ranked.map((r, i) => {
              const t = r.template;
              const on = templateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  aria-pressed={on}
                  className={`w-[160px] shrink-0 rounded-2xl border-2 p-3 text-left transition-colors ${
                    on ? "border-navy bg-navy/[0.04]" : "border-line-2 hover:border-navy"
                  }`}
                >
                  <span className="cv-thumb mx-auto" aria-hidden="true">
                    <CvDocument cv={preview} template={t} sample />
                  </span>
                  <span className="mt-3 flex items-center gap-1.5">
                    <span className="text-[0.88rem] font-bold text-ink">{t.name}</span>
                    {i === 0 && (
                      <span className="rounded-full bg-good-50 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-good">
                        For you
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[0.78rem] leading-snug text-muted">{t.tagline}</span>
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const chosen = ranked.find((r) => r.template.id === templateId);
          if (!chosen) return null;
          return (
            <div className="mt-4 space-y-1.5">
              <p className="text-[0.88rem] leading-relaxed text-ink-2">
                <strong className="font-bold text-ink">Why this one.</strong> {chosen.reason}
              </p>
              {/* The counter-argument, on anything we did not recommend. A
                  student overruling the suggestion should know what they are
                  trading away. */}
              {chosen.caveat && (
                <p className="text-[0.86rem] leading-relaxed text-warn">{chosen.caveat}</p>
              )}
            </div>
          );
        })()}
        <div className="mt-9 flex items-center gap-3">
          <button type="button" onClick={() => go("done")} className="rounded-full bg-navy px-8 py-4 text-[1rem] font-bold text-white hover:bg-navy-90">See my CV</button>
          <button type="button" onClick={() => go("polish")} className="ml-auto text-[0.92rem] font-semibold text-muted hover:text-navy">Back</button>
        </div>
      </WithPreview>
    );
  }

  if (phase === "done" && cv) {
    return (
      <div data-cv-builder className="scroll-mt-6 mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-start gap-4">
          <Panda width={64} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.6rem] font-black leading-tight tracking-tight text-navy sm:text-[1.9rem]">Your CV is ready.</h2>
            {review && (
              <p className="mt-2 text-[0.96rem] text-ink-2">
                {review.headline} About {review.pages} page{review.pages === 1 ? "" : "s"}.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => { track("cv_download", { format: "word" }); downloadWord(printRef.current?.innerHTML ?? "", cvFilename(cv.name, "doc")); }}
            className="rounded-full bg-navy px-7 py-3.5 text-[0.98rem] font-bold text-white hover:bg-navy-90"
          >
            Download for Word
          </button>
          <button
            type="button"
            onClick={() => { track("cv_download", { format: "text" }); downloadText(cv, template); }}
            className="rounded-full border-2 border-line-2 px-7 py-3.5 text-[0.98rem] font-bold text-ink-2 hover:border-navy hover:text-navy"
          >
            Plain text
          </button>
          {/* Both ways back, from the screen people actually end on. Choosing a
              look was a one-time decision buried mid-flow, and the moment
              anybody wants to try another one is after they have seen the
              finished thing. */}
          <button type="button" onClick={() => go("look")} className="ml-auto text-[0.92rem] font-semibold text-muted hover:text-navy">Change the look</button>
          <button type="button" onClick={() => go("polish")} className="text-[0.92rem] font-semibold text-muted hover:text-navy">Edit the wording</button>
          {/*
            The third way back, and the one that was missing.
            The look and the wording could both be changed from here; the
            answers underneath them could not, so a typo in a name or a job
            left off meant starting again from nothing.
          */}
          <button type="button" onClick={() => go("you")} className="text-[0.92rem] font-semibold text-muted hover:text-navy">Change my answers</button>
        </div>

        {/*
          Said at the download, not only at the start.
          This is the moment a student on a free tool braces for the wall, and
          almost every other CV builder puts one here.
        */}
        <p className="mt-4 text-[0.92rem] font-semibold text-good">
          Free, all the way through the download. No account, no email, no payment, no watermark.
        </p>

        {/*
          What that country actually expects.
          The conventions were in the data and applied only to referees, so a
          student applying to Canada was never told it is called a resume there
          and never told to leave the photograph off. Those are the two things
          that get a CV discarded before a word of it is read.
        */}
        {country && (
          <div className="mt-7 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
            <p className="text-[0.78rem] font-black uppercase tracking-[0.12em] text-brand-ink">
              Applying to {country.label}
            </p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">
              Called a <strong className="text-ink">{country.calledIt}</strong> there.{" "}
              {country.length}
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[0.78rem] font-bold uppercase tracking-wider text-hard">Leave off</p>
                <ul className="mt-1.5 space-y-1">
                  {country.never.map((n) => (
                    <li key={n} className="text-[0.88rem] text-ink-2">{n}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[0.78rem] font-bold uppercase tracking-wider text-good">They expect</p>
                <ul className="mt-1.5 space-y-1">
                  {country.expect.map((n) => (
                    <li key={n} className="text-[0.88rem] text-ink-2">{n}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 border-t border-brand-200 pt-3.5 text-[0.87rem] leading-relaxed text-muted">
              {country.note}
            </p>
          </div>
        )}

        {review && review.findings.length > 0 && (
          <div className="mt-7 rounded-2xl border border-line bg-wash/50 p-5">
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-muted">Worth fixing</p>
            <ul className="mt-2 space-y-1.5">
              {review.findings.slice(0, 4).map((f, i) => (
                <li key={i} className="text-[0.9rem] leading-relaxed text-ink-2">
                  <strong className="font-bold text-ink">{f.title}.</strong> {f.fix}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-white p-4 sm:p-8">
          <div ref={printRef}>
            <CvDocument cv={cv} template={template} />
          </div>
        </div>
      </div>
    );
  }

  /*
   * Never nothing.
   *
   * Every phase above is handled, and the ones that need a draft are given one
   * on restore. This is the net under all of it: whatever state we end up in,
   * the student sees the tool rather than an empty gap in the page.
   */
  return (
    <div data-cv-builder className="scroll-mt-6 mx-auto max-w-xl px-5 py-14 text-center">
      <span className="mx-auto block w-[132px]">
        <Panda width={132} sway />
      </span>
      <h2 className="mt-6 text-[1.5rem] font-black leading-tight tracking-tight text-navy">
        Let us pick this up again.
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-[0.98rem] leading-relaxed text-ink-2">
        Your answers are still saved on this device.
      </p>
      <button
        type="button"
        onClick={() => go(sketch.name.trim() ? "polish" : "you")}
        className="mt-7 rounded-full bg-navy px-9 py-4 text-[1rem] font-bold text-white hover:bg-navy-90"
      >
        Carry on
      </button>
    </div>
  );
}
