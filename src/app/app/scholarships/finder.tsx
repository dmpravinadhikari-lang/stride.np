"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { COMPETITIVENESS, SCHOLARSHIPS } from "@/modules/finder/scholarships";
import { npr } from "@/lib/terms";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { LEVEL_LABEL, type Level } from "@/modules/cost/data";
import { Alert, Card, Chip, Empty, Field, inputClass, type Tone } from "@/components/ui";

const COVER: Record<string, { label: string; tone: Tone }> = {
  full: { label: "Full ride", tone: "teal" },
  partial: { label: "Partial", tone: "brand" },
  "fee-waiver": { label: "Fee reduction", tone: "grey" },
};

export function ScholarshipFinder({
  initialCountry, initialLevel, hasWorkExperience,
}: { initialCountry: string; initialLevel: Level; hasWorkExperience: boolean }) {
  const [country, setCountry] = useState(initialCountry);
  const [level, setLevel] = useState<Level>(initialLevel);
  const [coverOnly, setCoverOnly] = useState("");

  const results = useMemo(
    () => SCHOLARSHIPS
      .filter((s) => !country || s.countries.includes(country as CountryCode))
      .filter((s) => s.levels.includes(level))
      .filter((s) => !coverOnly || s.cover === coverOnly)
      .sort((a, b) => (a.cover === "full" ? -1 : 1) - (b.cover === "full" ? -1 : 1)),
    [country, level, coverOnly],
  );

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Country" name="sc">
            <select id="sc" className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All destinations</option>
              {COUNTRY_CODES.map((k) => <option key={k} value={k}>{COUNTRIES[k].flag} {COUNTRIES[k].name}</option>)}
            </select>
          </Field>
          <Field label="Level" name="sl">
            <select id="sl" className={inputClass} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
              {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </Field>
          <Field label="How much it covers" name="sv">
            <select id="sv" className={inputClass} value={coverOnly} onChange={(e) => setCoverOnly(e.target.value)}>
              <option value="">Anything</option>
              <option value="full">Full ride only</option>
              <option value="partial">Partial</option>
              <option value="fee-waiver">Fee reductions</option>
            </select>
          </Field>
        </div>
      </Card>

      {!hasWorkExperience && results.some((s) => s.eligibility.some((e) => e.toLowerCase().includes("work experience"))) && (
        <Alert tone="gold" title="Several of these need work experience">
          Australia Awards, Chevening, Manaaki and Fulbright all expect around two years of relevant
          work before they will consider you. Your profile does not record any. If you have some,
          add it — it changes what you are eligible for more than your grades do.
        </Alert>
      )}

      <h2 className="h-tight text-[17px]">{results.length} you could apply for</h2>

      {results.length === 0 ? (
        <Empty icon="💰" title="Nothing matches those filters">
          Try a different level or clear the country filter. Most full scholarships are for masters
          study, not diplomas.
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((s) => {
            const cov = COVER[s.cover];
            return (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="h-tight text-[17px]">{s.name}</h3>
                      <Chip tone={cov.tone}>{cov.label}</Chip>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">
                      {s.funder}
                      {s.countries.length < 6 && ` · ${s.countries.map((k) => COUNTRIES[k].flag).join(" ")}`}
                    </p>
                  </div>
                  <Chip tone="grey">{s.window}</Chip>
                </div>

                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="num text-[22px] font-semibold text-ink">
                    {s.valueNprLow === s.valueNprHigh
                      ? npr(s.valueNprLow)
                      : `${npr(s.valueNprLow)} – ${npr(s.valueNprHigh)}`}
                  </span>
                  <span className="text-[12.5px] text-muted">estimated worth to you</span>
                </div>
                <p className="mt-1.5 text-[14px] text-ink-2">{s.value}</p>
                <p className="mt-1 text-[12.5px] text-muted">{COMPETITIVENESS[s.competitiveness].label}</p>

                <div className="mt-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">What they ask for</h4>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {s.eligibility.map((e, i) => (
                      <li key={i} className="text-[13.5px] leading-relaxed text-ink-2">• {e}</li>
                    ))}
                  </ul>
                </div>

                {s.nepalNote && (
                  <p className="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-[13px] leading-relaxed text-ink-2">
                    <strong className="font-semibold text-brand-700">For Nepal:</strong> {s.nepalNote}
                  </p>
                )}

                <Link href={`/tools/scholarships/${s.id}`}
                  className="mt-4 inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-[13px] font-semibold text-white hover:bg-brand-600 sm:min-h-0 sm:px-4 sm:py-2">
                  How to win it →
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <Alert tone="grey">
        <strong className="font-semibold text-ink">Deadlines move every year.</strong> Application
        windows here are the usual months, not dates — always confirm on the official page before
        you plan around one. Scheme names and what they cover are stable; the calendar is not.
      </Alert>
    </div>
  );
}
