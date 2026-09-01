"use client";

import { useMemo, useState } from "react";
import { UNIVERSITIES, ALL_FIELDS } from "@/modules/finder/universities";
import { matchUniversities, VERDICT, type Criteria } from "@/modules/finder/match";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";
import { FX_NPR, LEVEL_LABEL, type Level } from "@/modules/cost/data";
import { npr } from "@/lib/terms";
import { Alert, Card, Chip, Empty, Field, inputClass, type Tone } from "@/components/ui";
import { NumberInput } from "@/components/NumberInput";

const CUR: Record<string, keyof typeof FX_NPR> = { AU: "AUD", NZ: "NZD", UK: "GBP", IE: "EUR", US: "USD", CA: "CAD" };

export function UniFinder({ initial }: { initial: Criteria }) {
  const [c, setC] = useState<Criteria>(initial);
  const set = <K extends keyof Criteria>(k: K, v: Criteria[K]) => setC((p) => ({ ...p, [k]: v }));
  const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

  const matches = useMemo(() => matchUniversities(UNIVERSITIES, c), [c]);
  const shortlist = matches.filter((m) => m.verdict !== "out");
  const outOfReach = matches.filter((m) => m.verdict === "out");

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="h-tight text-[16px]">What you're looking for</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Country" name="uc">
            <select id="uc" className={inputClass} value={c.country} onChange={(e) => set("country", e.target.value)}>
              <option value="">Anywhere in the catalogue</option>
              {COUNTRY_CODES.map((k) => <option key={k} value={k}>{COUNTRIES[k].flag} {COUNTRIES[k].name}</option>)}
            </select>
          </Field>
          <Field label="Level" name="ul">
            <select id="ul" className={inputClass} value={c.level} onChange={(e) => set("level", e.target.value as Level)}>
              {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </Field>
          <Field label="Field" name="uf">
            <select id="uf" className={inputClass} value={c.field} onChange={(e) => set("field", e.target.value)}>
              <option value="">Any field</option>
              {ALL_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Tuition you can carry per year (NPR)" name="ub" hint={c.budgetNpr ? npr(c.budgetNpr) : "Leave blank to ignore cost"}>
            <NumberInput id="ub" number={c.budgetNpr} onNumber={(n) => set("budgetNpr", n)} placeholder="3000000" />
          </Field>
          <Field label="IELTS overall" name="ui" hint="Or your best mock band.">
            <NumberInput id="ui" decimal number={c.ielts} onNumber={(n) => set("ielts", n)} placeholder="6.5" />
          </Field>
          <Field label="Academic result (%)" name="up" hint="A GPA out of 4 is converted for you on the profile.">
            <NumberInput id="up" number={c.percent} onNumber={(n) => set("percent", n)} placeholder="65" />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="h-tight text-[17px]">{shortlist.length} worth applying to</h2>
        {outOfReach.length > 0 && <span className="text-[13px] text-muted">· {outOfReach.length} not realistic yet</span>}
      </div>

      {matches.length === 0 && (
        <Empty icon="🎓" title="Nothing in the catalogue matches">
          Widen the country or the field. This is a starter catalogue — your consultancy adds the
          institutions it actually has agreements with.
        </Empty>
      )}

      <div className="flex flex-col gap-3">
        {[...shortlist, ...outOfReach].map((m) => {
          const v = VERDICT[m.verdict];
          const cur = CUR[m.uni.country];
          return (
            <Card key={m.uni.id} className={m.verdict === "out" ? "p-5 opacity-70" : "p-5"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="h-tight text-[17px]">{m.uni.name}</h3>
                    <Chip tone={v.tone as Tone}>{v.label}</Chip>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">
                    {COUNTRIES[m.uni.country as keyof typeof COUNTRIES].flag} {m.uni.city} · {m.uni.fields.join(", ")} · intakes {m.uni.intakes.join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <div className="num text-[15px] font-semibold text-ink">
                    {cur} {m.uni.tuitionLow.toLocaleString()}–{m.uni.tuitionHigh.toLocaleString()}
                  </div>
                  <div className="num text-[12px] text-muted">
                    {npr(m.uni.tuitionLow * FX_NPR[cur])} a year and up
                  </div>
                </div>
              </div>

              {m.blockers.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {m.blockers.map((b, i) => (
                    <li key={i} className="text-[13px] font-medium text-danger-600">✕ {b}</li>
                  ))}
                </ul>
              )}
              {m.reasons.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {m.reasons.map((rz, i) => (
                    <li key={i} className="text-[13px] text-ink-2">✓ {rz}</li>
                  ))}
                </ul>
              )}

              <a href={m.uni.site} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-brand-600 hover:underline">
                Check the real fees on their site →
              </a>
            </Card>
          );
        })}
      </div>

      <Alert tone="grey">
        <strong className="font-semibold text-ink">A starter catalogue, not a database.</strong>{" "}
        {UNIVERSITIES.length} institutions across six countries, with indicative fees and entry
        requirements that change every intake. Treat this as a shortlisting tool and confirm every
        figure on the university's own page before applying. Your consultancy extends the list with
        its own partner institutions.
      </Alert>
    </div>
  );
}
