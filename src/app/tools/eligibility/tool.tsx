"use client";

import { useMemo, useState } from "react";
import { checkEligibility, type EligibilityInput } from "@/modules/tools/eligibility";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { LEVEL_LABEL, type Level } from "@/modules/cost/data";
import { Card, Chip, LinkButton, type Tone } from "@/components/ui";
import { BigScore, ChipGroup, Slider, Wizard, type Step } from "@/components/quiz";

/**
 * The eligibility check, asked one question at a time.
 *
 * It used to be nine inputs in a grid, four of which wanted a number typed in, 
 * including a sponsor's annual income, which almost nobody knows to the rupee
 * and which most people abandoned the form rather than guess at. Every one of
 * those is now a chip or a slider that opens on a plausible value, so the
 * student is editing an answer rather than producing one from nothing.
 *
 * The score is derived from the same findings shown underneath it, so the ring
 * and the list can never disagree. It is not graded generously: an unanswered
 * English test is a fail, because it is one.
 */

const VERDICT: Record<string, { label: string; tone: Tone }> = {
  likely: { label: "Looks realistic", tone: "teal" },
  possible: { label: "Possible, with work", tone: "gold" },
  "not-yet": { label: "Not yet", tone: "danger" },
};
const MARK = { pass: "✓", warn: "!", fail: "✕" } as const;
const MARK_CLASS = { pass: "text-teal-700", warn: "text-gold-600", fail: "text-danger-600" } as const;

const TESTS = [
  { value: "ielts", label: "IELTS", min: 4, max: 9, step: 0.5, start: 6.5 },
  { value: "pte", label: "PTE", min: 20, max: 90, step: 1, start: 58 },
  { value: "toefl", label: "TOEFL", min: 30, max: 120, step: 1, start: 80 },
  { value: "duolingo", label: "Duolingo", min: 50, max: 160, step: 5, start: 105 },
] as const;

const GAPS = [
  { value: "0", label: "No gap" },
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years or more" },
] as const;

const lakh = (n: number) => `NPR ${(n / 100000).toFixed(0)} lakh`;

/** Pass counts full, a warning counts half, a fail counts nothing. */
function scoreOf(findings: { severity: "pass" | "warn" | "fail" }[]): number {
  if (findings.length === 0) return 0;
  const earned = findings.reduce((n, f) => n + (f.severity === "pass" ? 1 : f.severity === "warn" ? 0.5 : 0), 0);
  return Math.round((earned / findings.length) * 100);
}

type Answers = EligibilityInput & { marksMode: "percent" | "gpa" };

export function EligibilityTool() {
  const [a, setA] = useState<Answers>({
    country: "" as CountryCode, level: "" as Level, percent: 60,
    englishTest: "" as EligibilityInput["englishTest"], englishScore: 0, studyGapYears: -1,
    fundsNpr: 0, sponsorIncomeNpr: 0, hasRefusal: false,
    marksMode: "percent",
  });
  const [done, setDone] = useState(false);
  const [refusalAnswered, setRefusalAnswered] = useState(false);

  // The wizard opens with no destination and no level chosen, and the check
  // indexes its cost tables by both. So it cannot run until they exist. It
  // used to run on every render and threw on the very first paint.
  const r = useMemo(() => (a.country && a.level ? checkEligibility(a) : null), [a]);

  const steps: Step<Answers>[] = [
    {
      id: "country",
      title: "Where are you thinking of going?",
      hint: "You can change this afterwards and see how the answer moves.",
      done: (x) => !!x.country,
      render: (x, set) => (
        <ChipGroup
          options={COUNTRY_CODES.map((k) => ({ value: k, label: COUNTRIES[k].name, icon: COUNTRIES[k].flag }))}
          value={x.country}
          onChange={(country) => set({ country })}
        />
      ),
    },
    {
      id: "level",
      title: "What do you want to study?",
      done: (x) => !!x.level,
      render: (x, set) => (
        <ChipGroup
          options={(Object.keys(LEVEL_LABEL) as Level[]).map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
          value={x.level}
          onChange={(level) => set({ level })}
        />
      ),
    },
    {
      id: "marks",
      title: "How did you do last time?",
      hint: "Drag to your result, percentage or GPA, whichever you have.",
      done: (x) => x.studyGapYears >= 0,
      render: (x, set) => (
        <div>
          <ChipGroup
            options={[
              { value: "percent", label: "Percentage" },
              { value: "gpa", label: "GPA (out of 4)" },
            ] as const}
            value={x.marksMode}
            onChange={(marksMode) => set({ marksMode })}
          />
          <div className="mt-6">
            <Slider
              min={x.marksMode === "percent" ? 30 : 1.5}
              max={x.marksMode === "percent" ? 100 : 4}
              step={x.marksMode === "percent" ? 1 : 0.05}
              value={x.marksMode === "percent" ? x.percent : Number(((x.percent / 100) * 4).toFixed(2))}
              onChange={(n) => set({ percent: x.marksMode === "percent" ? n : Math.round((n / 4) * 100) })}
              format={(n) => (x.marksMode === "percent" ? `${Math.round(n)}%` : `GPA ${n.toFixed(2)}`)}
            />
          </div>

          {/* Graded rather than a yes/no: one year out and four years out are
              entirely different files to an officer. */}
          <div className="mt-8 border-t border-line pt-6">
            <p className="text-[14px] font-semibold text-ink">How long have you been out of study?</p>
            <div className="mt-3.5">
              <ChipGroup
                options={GAPS}
                value={x.studyGapYears >= 0 ? (String(Math.min(x.studyGapYears, 3)) as "0" | "1" | "2" | "3") : ""}
                onChange={(g) => set({ studyGapYears: Number(g) })}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "english",
      title: "Have you taken an English test?",
      done: (x) => x.englishTest === "none" || (!!x.englishTest && x.englishScore > 0),
      render: (x, set) => (
        <div>
          <ChipGroup
            options={[...TESTS.map((t) => ({ value: t.value, label: t.label })), { value: "none", label: "Not yet" }] as const}
            value={x.englishTest}
            onChange={(t) => {
              const spec = TESTS.find((s) => s.value === t);
              set({ englishTest: t as EligibilityInput["englishTest"], englishScore: spec ? spec.start : 0 });
            }}
          />
          {x.englishTest && x.englishTest !== "none" && (() => {
            const t = TESTS.find((s) => s.value === x.englishTest)!;
            return (
              <div className="mt-7">
                <Slider
                  min={t.min} max={t.max} step={t.step}
                  value={x.englishScore || t.start}
                  onChange={(englishScore) => set({ englishScore })}
                  format={(n) => (t.step < 1 ? n.toFixed(1) : String(Math.round(n)))}
                  note="Your overall score. Individual band minimums matter too. Many courses want no band below 6."
                />
              </div>
            );
          })()}
        </div>
      ),
    },
    {
      id: "money",
      title: "What can your family put behind this?",
      hint: "Savings plus any loan you could raise. An estimate is fine. This is the part that decides most files.",
      done: (x) => x.fundsNpr > 0,
      onEnter: (x, set) => { if (x.fundsNpr === 0) set({ fundsNpr: 4_000_000 }); },
      render: (x, set) => (
        <div>
          <Slider
            min={500_000} max={12_000_000} step={100_000}
            value={x.fundsNpr}
            onChange={(fundsNpr) => set({ fundsNpr })}
            format={lakh}
          />
          <div className="mt-8 border-t border-line pt-6">
            <p className="text-[14px] font-semibold text-ink">Your sponsor&rsquo;s yearly income</p>
            <p className="mt-1 text-[13px] text-muted">
              Roughly, as declared on the tax clearance. Officers look at this ratio as hard as the
              total. Leave it at nothing to skip.
            </p>
            <div className="mt-5">
              <Slider
                min={0} max={8_000_000} step={100_000}
                value={x.sponsorIncomeNpr}
                onChange={(sponsorIncomeNpr) => set({ sponsorIncomeNpr })}
                format={(n) => (n === 0 ? "Rather not say" : lakh(n))}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "refusal",
      title: "One last thing.",
      hint: "Common, and not fatal. It changes the plan, which is why we ask.",
      done: () => refusalAnswered,
      render: (x, set) => (
        <div>
          <p className="text-[14px] font-semibold text-ink">Have you ever been refused a student visa?</p>
          <div className="mt-3.5">
            <ChipGroup
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes, for any country" },
              ] as const}
              value={refusalAnswered ? (x.hasRefusal ? "yes" : "no") : ""}
              onChange={(val) => { setRefusalAnswered(true); set({ hasRefusal: val === "yes" }); }}
            />
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-muted">
            An undeclared refusal is always found. What matters is whether the reason behind it has
            actually been fixed.
          </p>
        </div>
      ),
    },
  ];

  if (!done || !r) {
    return (
      <div className="mx-auto max-w-2xl">
        <Wizard
          steps={steps}
          answers={a}
          setAnswers={setA}
          onFinish={() => setDone(true)}
          finishLabel="See my answer"
          footer="Six questions, nothing to type, no sign-up."
        />
      </div>
    );
  }

  const score = scoreOf(r.findings);
  const v = VERDICT[r.verdict];

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6 sm:p-8">
        <Chip tone={v.tone}>{v.label}</Chip>
        <div className="mt-5">
          <BigScore score={score} label={r.headline} sub={r.nextStep} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">Point by point</h2>
        </div>
        <ul className="divide-y divide-line">
          {r.findings.map((f, n) => (
            <li key={n} className="flex gap-3 px-5 py-4">
              <span className={`num mt-0.5 shrink-0 text-[15px] font-bold ${MARK_CLASS[f.severity]}`} aria-hidden>
                {MARK[f.severity]}
              </span>
              <div>
                <div className="text-[14.5px] font-semibold text-ink">{f.title}</div>
                <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Changing the destination is the single most useful thing to do next,
          and it is one tap. So it lives on the result rather than behind a
          restart. */}
      <Card className="p-5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Try another destination</p>
        <div className="mt-3.5">
          <ChipGroup
            options={COUNTRY_CODES.map((k) => ({ value: k, label: COUNTRIES[k].name, icon: COUNTRIES[k].flag }))}
            value={a.country}
            onChange={(country) => setA((p) => ({ ...p, country }))}
          />
        </div>
      </Card>

      <Card className="border-brand-200 bg-brand-50/60 p-5">
        <h3 className="h-tight text-[16px]">Knowing you are eligible is the easy part</h3>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Most applications that fail are not from ineligible students. They fail at the interview,
          on an anonymous statement, or on a funding answer nobody rehearsed.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <LinkButton href="/signup" size="md">Practise the part that decides it</LinkButton>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="text-[13.5px] font-semibold text-brand-600 hover:underline"
          >
            Change my answers
          </button>
        </div>
      </Card>

      <p className="text-[12px] leading-relaxed text-muted">
        A first-pass check against typical requirements and published financial thresholds, not a
        decision by any university or embassy. Courses set their own bars.
      </p>
    </div>
  );
}
