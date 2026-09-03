"use client";

import { useState } from "react";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { COST, FX_NPR, LEVEL_LABEL, type Level } from "@/modules/cost/data";
import { AFTER_STUDY } from "@/modules/tools/compare";
import { npr } from "@/lib/terms";
import {Card, LinkButton } from "@/components/ui";
import { ChipGroup } from "@/components/quiz";

function Column({ code, level }: { code: CountryCode; level: Level }) {
  const c = COUNTRIES[code];
  const k = COST[code];
  const a = AFTER_STUDY[code];
  const rate = FX_NPR[k.currency];
  const tuition = k.tuition[level];
  const years = k.years[level];
  const total = (tuition.typical + k.living.typical) * years * rate;
  const mustShow = (k.visaFunds.living + tuition.typical) * rate;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5 border-b border-line pb-3">
        <span className="text-2xl" aria-hidden>{c.flag}</span>
        <h3 className="h-tight text-[19px]">{c.name}</h3>
      </div>
      <dl className="mt-3 flex flex-col gap-3.5 text-[13.5px]">
        {([
          ["Visa", c.visa],
          ["Typical course length", `${years} year${years === 1 ? "" : "s"}`],
          ["Tuition a year", `${k.currency} ${tuition.typical.toLocaleString()} · ${npr(tuition.typical * rate)}`],
          ["Living a year", `${k.currency} ${k.living.typical.toLocaleString()} · ${npr(k.living.typical * rate)}`],
          ["Whole course, roughly", npr(total)],
          ["Must show in the bank", npr(mustShow)],
          ["Health cover", `${k.healthCoverName} · ${npr(k.healthCoverPerYear * rate)} a year`],
          ["Work while studying", a.workDuringStudy],
          ["After you graduate", a.postStudyWork],
          ["Bringing family", a.dependants],
        ] as Array<[string, string]>).map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.11em] text-muted">{label}</dt>
            <dd className="mt-0.5 leading-relaxed text-ink-2">{value}</dd>
          </div>
        ))}
        <div className="rounded-xl border border-gold-600/25 bg-gold-100/50 px-3.5 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.11em] text-gold-600">Watch out</dt>
          <dd className="mt-0.5 leading-relaxed text-ink-2">{a.watchOut}</dd>
        </div>
      </dl>
    </div>
  );
}

export function CompareTool() {
  const [left, setLeft] = useState<CountryCode>("AU");
  const [right, setRight] = useState<CountryCode>("UK");
  const [level, setLevel] = useState<Level>("masters");

  return (
    <div className="flex flex-col gap-5">
      {/* Two rows of flags rather than two dropdowns: a counsellor turning the
          screen around wants the swap to be one tap, not a menu. */}
      <Card className="p-6">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[13px] font-semibold text-ink">Compare</p>
            <div className="mt-3">
              <ChipGroup
                options={COUNTRY_CODES.map((k) => ({ value: k, label: COUNTRIES[k].name, icon: COUNTRIES[k].flag }))}
                value={left}
                onChange={setLeft}
              />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink">With</p>
            <div className="mt-3">
              <ChipGroup
                options={COUNTRY_CODES.map((k) => ({ value: k, label: COUNTRIES[k].name, icon: COUNTRIES[k].flag }))}
                value={right}
                onChange={setRight}
              />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink">At what level</p>
            <div className="mt-3">
              <ChipGroup
                options={(Object.keys(LEVEL_LABEL) as Level[]).map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
                value={level}
                onChange={setLevel}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="grid gap-8 md:grid-cols-2">
          <Column code={left} level={level} />
          <Column code={right} level={level} />
        </div>
      </Card>

      <Card className="border-brand-200 bg-brand-50/60 p-5">
        <h3 className="h-tight text-[16px]">Cost is rarely the thing that decides it</h3>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Work rights, whether a partner can come, and whether the course qualifies for the
          post-study visa matter more to most families than a few lakh of tuition. Check those
          before anyone falls in love with a city.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href="/tools/cost" size="md" variant="secondary">Cost it out properly</LinkButton>
          <LinkButton href="/tools/eligibility" size="md">Check if you qualify</LinkButton>
        </div>
      </Card>

      <p className="text-[12px] leading-relaxed text-muted">
        Visa and work rules change at short notice, and several of these have. Confirm anything you
        are about to act on with the destination's own immigration site.
      </p>
    </div>
  );
}
