"use client";

import { useMemo, useState } from "react";
import { COST, FX_NPR, LEVEL_LABEL, type Level } from "@/modules/cost/data";
import { calculate, type Inputs } from "@/modules/cost/calculate";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { npr } from "@/lib/terms";
import { Alert, Card, Chip, Meter } from "@/components/ui";
import { ChipGroup, Slider } from "@/components/quiz";

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
  const [tuition, setTuition] = useState<number>(COST[initial.country].tuition[initial.level].typical);
  /** Until the student drags it, the tuition figure is our estimate, not theirs. */
  const [tuitionSet, setTuitionSet] = useState(false);
  const [livingBand, setLivingBand] = useState<"low" | "typical" | "high">("typical");
  const [london, setLondon] = useState(false);
  const [savings, setSavings] = useState(initial.savingsNpr || 0);
  const [income, setIncome] = useState(initial.sponsorIncomeNpr || 0);
  const [partTime, setPartTime] = useState(0);

  const c = COST[country];

  function switchCountry(next: CountryCode) {
    setCountry(next);
    setYears(COST[next].years[level]);
    setTuition(COST[next].tuition[level].typical);
    setTuitionSet(false);
    setPartTime(0);
    if (next !== "UK") setLondon(false);
  }
  function switchLevel(next: Level) {
    setLevel(next);
    setYears(COST[country].years[next]);
    setTuition(COST[country].tuition[next].typical);
    setTuitionSet(false);
  }

  const input: Inputs = {
    country, level, years,
    tuition: tuitionSet ? tuition : 0,
    livingBand, londonOrEquivalent: london,
    savingsNpr: savings, sponsorIncomeNpr: income, partTime,
  };
  const r = useMemo(() => calculate(input), [country, level, years, tuition, tuitionSet, livingBand, london, savings, income, partTime]);
  const range = c.tuition[level];
  const usingEstimate = !tuitionSet;

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------------ inputs */}
      {/* Everything is a chip or a drag. Working out a cost means moving the
          same three or four figures around a dozen times to see what changes,
          and a number field makes every one of those a retype. */}
      <Card className="p-6">
        <h2 className="h-tight text-[16px]">Your plan</h2>

        <div className="mt-5 flex flex-col gap-6">
          <div>
            <p className="text-[13px] font-semibold text-ink">Where</p>
            <div className="mt-3">
              <ChipGroup
                options={COUNTRY_CODES.map((k) => ({ value: k, label: COUNTRIES[k].name, icon: COUNTRIES[k].flag }))}
                value={country}
                onChange={switchCountry}
              />
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">Level</p>
            <div className="mt-3">
              <ChipGroup
                options={(Object.keys(LEVEL_LABEL) as Level[]).map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
                value={level}
                onChange={switchLevel}
              />
            </div>
          </div>

          {country === "UK" && (
            <div>
              <p className="text-[13px] font-semibold text-ink">Studying in London?</p>
              <p className="mt-1 text-[12.5px] text-muted">London carries a higher maintenance requirement.</p>
              <div className="mt-3">
                <ChipGroup
                  options={[
                    { value: "out", label: "Outside London" },
                    { value: "in", label: "In London" },
                  ] as const}
                  value={london ? "in" : "out"}
                  onChange={(v) => setLondon(v === "in")}
                />
              </div>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold text-ink">Course length</p>
              <div className="mt-4">
                <Slider
                  min={0.5} max={6} step={0.5} value={years} onChange={setYears}
                  format={(n) => `${n} ${n === 1 ? "year" : "years"}`}
                />
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-ink">Annual tuition</p>
              <div className="mt-4">
                <Slider
                  min={Math.round(range.low * 0.6 / 500) * 500}
                  max={Math.round(range.high * 1.4 / 500) * 500}
                  step={500}
                  value={tuition}
                  onChange={(n) => { setTuition(n); setTuitionSet(true); }}
                  format={(n) => `${c.currency} ${Math.round(n).toLocaleString()}`}
                  note={usingEstimate
                    ? `Sitting on the typical figure. Drag it to the number on your offer letter for a real total.`
                    : `Your figure. Typical for this course is ${c.currency} ${range.typical.toLocaleString()}.`}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">How you plan to live</p>
            <div className="mt-3">
              <ChipGroup
                columns
                options={[
                  { value: "low", label: "Frugal", sub: `Shared room, cook at home — ${c.currency} ${c.living.low.toLocaleString()} a year` },
                  { value: "typical", label: "Typical", sub: `${c.currency} ${c.living.typical.toLocaleString()} a year` },
                  { value: "high", label: "Comfortable, or a big city", sub: `${c.currency} ${c.living.high.toLocaleString()} a year` },
                ] as const}
                value={livingBand}
                onChange={setLivingBand}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold text-ink">Part-time earnings a year</p>
              <div className="mt-4">
                <Slider
                  min={0} max={Math.round(c.living.typical * 1.2 / 500) * 500} step={500}
                  value={partTime} onChange={setPartTime}
                  format={(n) => (n === 0 ? "None assumed" : `${c.currency} ${Math.round(n).toLocaleString()}`)}
                  note="Be conservative. Visa hours are capped and the first months are usually empty."
                />
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-ink">What the family already has</p>
              <div className="mt-4">
                <Slider
                  min={0} max={20_000_000} step={100_000}
                  value={savings} onChange={setSavings}
                  format={(n) => (n === 0 ? "Nothing yet" : `NPR ${(n / 100000).toFixed(0)} lakh`)}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">Sponsor&rsquo;s yearly income</p>
            <p className="mt-1 text-[12.5px] text-muted">As declared on the tax clearance. Leave at nothing to skip.</p>
            <div className="mt-4">
              <Slider
                min={0} max={10_000_000} step={100_000}
                value={income} onChange={setIncome}
                format={(n) => (n === 0 ? "Rather not say" : `NPR ${(n / 100000).toFixed(0)} lakh`)}
              />
            </div>
          </div>
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
