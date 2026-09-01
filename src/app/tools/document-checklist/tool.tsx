"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, requiredFor } from "@/modules/documents/kinds";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { STAGE_IDS, stageOf } from "@/modules/pipeline/stages";
import { Card, Chip, Field, inputClass, LinkButton } from "@/components/ui";

/** The stages a student would recognise, without the consultancy's own labels. */
const STAGES = STAGE_IDS.filter((s) => !["departed", "lost"].includes(s));

export function DocChecklist() {
  const [country, setCountry] = useState<CountryCode>("AU");
  const [stage, setStage] = useState<string>("applying");
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  const kinds = useMemo(() => requiredFor(country, stage), [country, stage]);
  const done = kinds.filter((k) => ticked[k.id]).length;

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where are you going?" name="dc">
            <select id="dc" className={inputClass} value={country} onChange={(e) => setCountry(e.target.value as CountryCode)}>
              {COUNTRY_CODES.map((k) => <option key={k} value={k}>{COUNTRIES[k].flag} {COUNTRIES[k].name}</option>)}
            </select>
          </Field>
          <Field label="How far along are you?" name="ds" hint="Later stages add documents; earlier ones keep the list short.">
            <select id="ds" className={inputClass} value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => <option key={s} value={s}>{stageOf(s).label}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-[13px]">
          <span className="text-muted">
            {kinds.length} documents for {COUNTRIES[country].name} at this stage
          </span>
          <span className="num font-semibold text-ink">{done} / {kinds.length} ticked</span>
        </div>
      </Card>

      {CATEGORIES.map((category) => {
        const group = kinds.filter((k) => k.category === category);
        if (!group.length) return null;
        return (
          <Card key={category} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-wash/60 px-5 py-3">
              <h2 className="h-tight text-[15px]">{category}</h2>
              <span className="num text-[12px] text-muted">{group.filter((k) => ticked[k.id]).length} / {group.length}</span>
            </div>
            <ul className="divide-y divide-line">
              {group.map((k) => (
                <li key={k.id} className="px-5 py-3.5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox" checked={Boolean(ticked[k.id])}
                      onChange={(e) => setTicked((p) => ({ ...p, [k.id]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`text-[14.5px] font-semibold ${ticked[k.id] ? "text-muted line-through" : "text-ink"}`}>
                          {k.label}
                        </span>
                        {k.sensitive && <Chip tone="grey">Sensitive</Chip>}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{k.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      <Card className="border-brand-200 bg-tint-lilac/50 p-5">
        <h3 className="h-tight text-[16px]">Want this checked against what you have actually uploaded?</h3>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Through your consultancy you can store the documents themselves and have STRIDE flag what
          is missing and what contradicts your own profile — an English score you claim but have not
          uploaded, a sponsor income no tax clearance supports. Your counsellor sees the same list
          and verifies each one.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href="/signup" size="md">I run a consultancy</LinkButton>
          <LinkButton href="/tools/checklist" size="md" variant="secondary">See the full timeline</LinkButton>
        </div>
      </Card>

      <p className="text-[12px] leading-relaxed text-muted">
        Requirements vary by institution and change with immigration policy. Treat this as the
        working list and confirm anything unusual with your consultancy or the destination's own site.
      </p>
    </div>
  );
}
