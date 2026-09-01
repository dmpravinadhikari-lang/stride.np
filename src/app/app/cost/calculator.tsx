"use client";

import { useMemo, useState } from "react";
import { COST, FX_NPR, LEVEL_LABEL, type Level } from "@/modules/cost/data";
import { calculate, type Inputs } from "@/modules/cost/calculate";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { npr } from "@/lib/terms";
import { Alert, Card, Chip, Field, inputClass, Meter } from "@/components/ui";
import { NumberInput } from "@/components/NumberInput";

const exact = (n: number) => `NPR ${Math.round(n).toLocaleString("en-IN")}`;

export function CostCalculator({
  initial, ratesAsOf,
}: {
  initial: { country: CountryCode; level: Level; savingsNpr: number; sponsorIncomeNpr: number };
  ratesAsOf: string;
}) {
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [level, setLevel] = useState<Level>(initial.level);
  const [years, setYears] = useState<number>(COST[initial.country].years[initial.level]);
  const [tuition, setTuition] = useState<string>("");
  const [livingBand, setLivingBand] = useState<"low" | "typical" | "high">("typical");
  const [london, setLondon] = useState(false);
  const [savings, setSavings] = useState(String(initial.savingsNpr || ""));
  const [income, setIncome] = useState(String(initial.sponsorIncomeNpr || ""));
  const [partTime, setPartTime] = useState("");

  const c = COST[country];
  const num = (s: string) => Number(s.replace(/[^0-9]/g, "")) || 0;

  function switchCountry(next: CountryCode) {
    setCountry(next);
    setYears(COST[next].years[level]);
    setTuition("");
    if (next !== "UK") setLondon(false);
  }
  function switchLevel(next: Level) {
    setLevel(next);
    setYears(COST[country].years[next]);
  }

  const input: Inputs = {
    country, level, years,
    tuition: num(tuition),
    livingBand, londonOrEquivalent: london,
    savingsNpr: num(savings), sponsorIncomeNpr: num(income), partTime: num(partTime),
  };
  const r = useMemo(() => calculate(input), [country, level, years, tuition, livingBand, london, savings, income, partTime]);
  const range = c.tuition[level];
  const usingEstimate = num(tuition) === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------------ inputs */}
      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Your plan</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Country" name="country">
            <select id="country" className={inputClass} value={country} onChange={(e) => switchCountry(e.target.value as CountryCode)}>
              {COUNTRY_CODES.map((k) => <option key={k} value={k}>{COUNTRIES[k].flag} {COUNTRIES[k].name}</option>)}
            </select>
          </Field>
          <Field label="Level" name="level">
            <select id="level" className={inputClass} value={level} onChange={(e) => switchLevel(e.target.value as Level)}>
              {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </Field>
          <Field label="Course length (years)" name="years">
            <input id="years" type="number" min={0.5} max={6} step={0.5} className={inputClass}
              value={years} onChange={(e) => setYears(Number(e.target.value) || 1)} />
          </Field>

          <Field
            label={`Annual tuition (${c.currency})`} name="tuition"
            hint={usingEstimate
              ? `Using the typical ${c.currency} ${range.typical.toLocaleString()} — range is ${range.low.toLocaleString()} to ${range.high.toLocaleString()}. Put your offer letter figure in for a real number.`
              : `Your figure: ${c.currency} ${num(tuition).toLocaleString()}`}
          >
            <NumberInput id="tuition" number={num(tuition)} onNumber={(n) => setTuition(n ? String(n) : "")} placeholder={String(range.typical)} />
          </Field>

          <Field label="Living standard" name="livingBand" hint={`${c.currency} ${c.living[livingBand].toLocaleString()} a year`}>
            <select id="livingBand" className={inputClass} value={livingBand} onChange={(e) => setLivingBand(e.target.value as typeof livingBand)}>
              <option value="low">Frugal — shared room, cook at home</option>
              <option value="typical">Typical</option>
              <option value="high">Comfortable, or a big city</option>
            </select>
          </Field>

          <Field label="Expected part-time earnings a year" name="partTime" hint={`In ${c.currency}. Be conservative — visa hours are capped and the first months are usually empty.`}>
            <input id="partTime" inputMode="numeric" className={inputClass} value={partTime}
              onChange={(e) => setPartTime(e.target.value)} placeholder="0" />
          </Field>

          <Field label="Money the family already has (NPR)" name="savings" hint={num(savings) ? npr(num(savings)) : undefined}>
            <input id="savings" inputMode="numeric" className={inputClass} value={savings} onChange={(e) => setSavings(e.target.value)} placeholder="2500000" />
          </Field>
          <Field label="Sponsor's annual income (NPR)" name="income" hint={num(income) ? npr(num(income)) : undefined}>
            <input id="income" inputMode="numeric" className={inputClass} value={income} onChange={(e) => setIncome(e.target.value)} placeholder="4200000" />
          </Field>

          {country === "UK" && (
            <Field label="Studying in London?" name="london" hint="London has a higher maintenance requirement.">
              <select id="london" className={inputClass} value={london ? "1" : "0"} onChange={(e) => setLondon(e.target.value === "1")}>
                <option value="0">Outside London</option>
                <option value="1">In London</option>
              </select>
            </Field>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------- the two big numbers */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-brand-200 bg-brand-50/50 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-600">Before you fly</div>
          <div className="num mt-1.5 text-[34px] font-semibold leading-none text-ink">{npr(r.beforeYouGoTotal)}</div>
          <div className="num mt-1 text-[12.5px] text-muted">{exact(r.beforeYouGoTotal)}</div>
          <ul className="mt-4 flex flex-col divide-y divide-brand-200/60">
            {r.beforeYouGo.map((l) => (
              <li key={l.label} className="py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] text-ink-2">{l.label}</span>
                  <span className="num shrink-0 text-[13.5px] font-semibold text-ink">{exact(l.npr)}</span>
                </div>
                {l.note && <p className="mt-0.5 text-[12px] text-muted">{l.note}</p>}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">The whole course</div>
          <div className="num mt-1.5 text-[34px] font-semibold leading-none text-ink">{npr(r.wholeCourseTotal)}</div>
          <div className="num mt-1 text-[12.5px] text-muted">{exact(r.wholeCourseTotal)}</div>
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {r.wholeCourse.map((l) => (
              <li key={l.label} className="flex items-baseline justify-between gap-3 py-2">
                <span className="text-[13.5px] text-ink-2">{l.label}</span>
                <span className="num shrink-0 text-[13.5px] font-semibold text-ink">{exact(l.npr)}</span>
              </li>
            ))}
          </ul>
          {r.partTimeOffsetNpr > 0 && (
            <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-muted">
              Part-time work might cover {npr(r.partTimeOffsetNpr)} of that — but no visa officer
              will accept it as part of your funding.
            </p>
          )}
        </Card>
      </div>

      {/* -------------------------------------------------- the visa rule */}
      <Card className="overflow-hidden border-gold-600/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-600/25 bg-gold-100/60 px-5 py-3">
          <h2 className="h-tight text-[15px] text-gold-600">What you must SHOW — this one is a rule, not an estimate</h2>
          <Chip tone="gold">{COUNTRIES[country].visa}</Chip>
        </div>
        <div className="px-5 py-5">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="num text-[32px] font-semibold leading-none text-ink">{npr(r.visaFunds.npr)}</div>
              <div className="num mt-1 text-[12.5px] text-muted">
                {c.currency} {Math.round(r.visaFunds.foreign).toLocaleString()} · {exact(r.visaFunds.npr)}
              </div>
            </div>
            <p className="min-w-[240px] flex-1 text-[13.5px] leading-relaxed text-ink-2">{r.visaFunds.formula}</p>
          </div>
          <div className="mt-4 grid gap-2 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted sm:grid-cols-2">
            <p><span className="font-semibold text-ink-2">Source:</span> {r.visaFunds.source}</p>
            <p><span className="font-semibold text-ink-2">Holding period:</span> {r.visaFunds.holding}</p>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------- the reckoning */}
      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Can this be paid for?</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold text-ink">Covered by what you have</span>
              <span className="num text-muted">
                {r.wholeCourseTotal > 0 ? Math.min(100, Math.round(((r.wholeCourseTotal - r.gapNpr) / r.wholeCourseTotal) * 100)) : 0}%
              </span>
            </div>
            <div className="mt-2">
              <Meter
                value={r.wholeCourseTotal - r.gapNpr} max={r.wholeCourseTotal}
                tone={r.gapNpr === 0 ? "teal" : r.gapNpr > r.wholeCourseTotal * 0.5 ? "danger" : "gold"}
              />
            </div>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
              {r.gapNpr === 0
                ? "On these figures the course is covered."
                : <>Still to find: <strong className="font-semibold text-ink">{npr(r.gapNpr)}</strong>. That is the education loan, and the collateral behind it, that your file has to explain.</>}
            </p>
          </div>

          <div>
            <div className="text-[13px] font-semibold text-ink">Against your sponsor's income</div>
            <div className="num mt-2 text-[28px] font-semibold leading-none text-ink">
              {r.incomeYears === null ? "—" : `${r.incomeYears} years`}
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
              {r.incomeYears === null
                ? "Enter your sponsor's annual income to see how the course compares to it."
                : r.incomeYears > 5
                  ? "That is a lot of years of declared income. Expect the officer to ask exactly how it will be paid, and have the loan and collateral documents ready."
                  : "A ratio an officer will find plausible, provided the income is documented."}
            </p>
          </div>
        </div>
      </Card>

      <Alert tone="grey">
        <strong className="font-semibold text-ink">Where these numbers come from.</strong> The visa
        requirement above is the destination's published figure, quoted with its source. Everything
        else is an indicative estimate for planning — tuition especially varies enormously between
        institutions, so replace it with your offer letter figure as soon as you have one. Exchange
        rates are set at {ratesAsOf} ({Object.entries(FX_NPR).map(([k, v]) => `1 ${k} = ${v}`).join(", ")}) and
        move daily. Confirm every figure before you commit money.
      </Alert>
    </div>
  );
}
