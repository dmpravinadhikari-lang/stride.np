"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * The controls every student-facing question is built from.
 *
 * One rule decides all of this: a student answers eight easy questions far more
 * readily than they fill in a page of eight inputs, and every answer they give
 * makes them more likely to give the next one. So nothing here asks anyone to
 * type. A category is a chip you tap; a quantity is a slider you drag, opening
 * on a sensible value so the question is already half-answered when it appears.
 *
 * The momentum has to be visible or it does not work, which is what the step
 * dots and the answered count are for. Seeing two questions left is more
 * encouraging than seeing 78%.
 */

/* ------------------------------------------------------------------ chips */

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  /** Flag or emoji, shown before the label. */
  icon?: string;
  /** A second line, for options that need a word of disambiguation. */
  sub?: string;
};

export function ChipGroup<T extends string>({
  options, value, onChange, columns = false,
}: {
  options: ReadonlyArray<ChipOption<T>>;
  value: T | "";
  onChange: (v: T) => void;
  /** Stack full-width rather than wrapping, for options with a sub-line. */
  columns?: boolean;
}) {
  return (
    <div className={columns ? "grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2.5"}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-left text-[14px] font-semibold transition-all duration-200 ${
              columns ? "w-full" : "rounded-full"
            } ${
              on
                ? "border-brand-500 bg-brand-500 text-ink shadow-[0_8px_20px_-14px_rgba(0,22,25,.7)]"
                : "border-line-2 bg-panel text-ink-2 hover:border-brand-400"
            }`}
          >
            {o.icon && <span aria-hidden className="text-[16px] leading-none">{o.icon}</span>}
            <span className="min-w-0">
              {o.label}
              {o.sub && (
                <span className={`block text-[12px] font-medium ${on ? "text-white/70" : "text-muted"}`}>
                  {o.sub}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- slider */

export function Slider({
  min, max, step, value, onChange, format, note,
}: {
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  note?: ReactNode;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <p className="num text-[30px] font-semibold leading-none text-ink">{format(value)}</p>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="quiz-range mt-5"
        // The filled portion is painted on the track itself, so the drag reads
        // as "how much of this have I chosen" rather than as a dot on a line.
        style={{
          background: `linear-gradient(90deg, var(--color-brand-400) ${pct}%, var(--color-line) ${pct}%)`,
        }}
      />
      <div className="mt-2 flex justify-between text-[11.5px] text-muted">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      {note && <p className="mt-3.5 text-[13px] leading-relaxed text-muted">{note}</p>}
    </div>
  );
}

/* -------------------------------------------------------------- step dots */

export function StepDots({ steps, current, done }: { steps: number; current: number; done: (i: number) => boolean }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: steps }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
            i === current ? "w-8 bg-brand-500" : done(i) ? "w-4 bg-brand-400" : "w-4 bg-line-2"
          }`}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- wizard */

export type Step<A> = {
  id: string;
  title: string;
  hint?: string;
  /** Whether this step has been answered. Gates Continue. */
  done: (a: A) => boolean;
  /**
   * Run when the student first arrives at this step, to seed a slider with a
   * plausible starting value. Seeding in the initial state instead would count
   * the step as answered before it had been seen, which made the progress dots
   * lie on the very first screen.
   */
  onEnter?: (a: A, set: (patch: Partial<A>) => void) => void;
  render: (a: A, set: (patch: Partial<A>) => void) => ReactNode;
};

export function Wizard<A>({
  steps, answers, setAnswers, onFinish, finishLabel = "See my answer", footer,
}: {
  steps: ReadonlyArray<Step<A>>;
  answers: A;
  setAnswers: (fn: (prev: A) => A) => void;
  onFinish: () => void;
  finishLabel?: string;
  footer?: ReactNode;
}) {
  const [step, setStep] = useState(0);
  const shell = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<A>) => setAnswers((prev) => ({ ...prev, ...patch }));
  const current = steps[step];
  const answered = useMemo(() => steps.filter((s) => s.done(answers)).length, [steps, answers]);
  const last = step === steps.length - 1;

  // Moving between questions can leave the card's top above the viewport on a
  // phone, which reads as the page having jumped somewhere random. Only pull it
  // back when it has actually scrolled out of reach.
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < -24) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { steps[step]?.onEnter?.(answers, set); }, [step]);

  return (
    <div ref={shell} className="scroll-mt-24 rounded-[24px] border border-line bg-panel p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <StepDots steps={steps.length} current={step} done={(i) => steps[i].done(answers)} />
        <p className="text-[12.5px] font-semibold text-muted">
          {answered} of {steps.length}
        </p>
      </div>

      {/* Keyed on the step id so React remounts it and the question slides in,
          rather than swapping its text under the reader's eyes. */}
      <div key={current.id} className="quiz-step">
        <h2 className="h-tight mt-7 text-[22px] leading-snug sm:text-[25px]">{current.title}</h2>
        {current.hint && <p className="mt-2 text-[14px] leading-relaxed text-muted">{current.hint}</p>}
        <div className="mt-7">{current.render(answers, set)}</div>
      </div>

      <div className="mt-9 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-full border border-line-2 px-5 py-3 text-[14px] font-semibold text-ink-2 transition-colors hover:border-brand-400"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={() => (last ? onFinish() : setStep(step + 1))}
          disabled={!current.done(answers)}
          className="flex-1 rounded-[10px] bg-brand-500 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-brand-400 disabled:opacity-40"
        >
          {last ? finishLabel : "Continue"}
        </button>
      </div>

      {footer && <p className="mt-4 text-center text-[12.5px] text-muted">{footer}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- score ring */

/**
 * The result, as one number that draws itself in.
 *
 * Deliberately not always green. A ring that flatters everyone is worth
 * nothing to a student three weeks from a deadline, so the colour follows the
 * honest band and the label says where they stand rather than how they did.
 */
export function BigScore({ score, label, sub }: { score: number; label: string; sub?: string }) {
  const size = 132;
  const r = (size - 16) / 2;
  const len = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const stroke = pct >= 70 ? "var(--color-teal-500)" : pct >= 45 ? "var(--color-gold-600)" : "var(--color-danger-600)";

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0"
        role="img" aria-label={`${label}. Score ${Math.round(pct)} out of 100.`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
        <circle
          className="ring-draw"
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={len}
          style={{
            ["--ring-len" as string]: `${len}`,
            ["--ring-off" as string]: `${len - (len * pct) / 100}`,
          }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
          style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 600, fill: "var(--color-ink)" }}>
          {Math.round(pct)}
        </text>
      </svg>
      <div className="min-w-0">
        <h2 className="display text-[27px] leading-tight sm:text-[32px]">{label}</h2>
        {sub && <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{sub}</p>}
      </div>
    </div>
  );
}
