"use client";

import { useMemo, useState } from "react";
import { checkEligibility, type EligibilityInput } from "@/modules/tools/eligibility";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { LEVEL_LABEL, type Level } from "@/modules/cost/data";
import { npr } from "@/lib/terms";
import { Card, Chip, Field, inputClass, LinkButton, type Tone } from "@/components/ui";
import { NumberInput } from "@/components/NumberInput";

const VERDICT: Record<string, { label: string; tone: Tone }> = {
  likely: { label: "Looks realistic", tone: "teal" },
  possible: { label: "Possible, with work", tone: "gold" },
  "not-yet": { label: "Not yet", tone: "danger" },
};
const MARK = { pass: "✓", warn: "!", fail: "✕" } as const;
const MARK_CLASS = { pass: "text-teal-700", warn: "text-gold-600", fail: "text-danger-600" } as const;

export function EligibilityTool() {
  const [i, setI] = useState<EligibilityInput>({
    country: "AU", level: "masters", percent: 0,
    englishTest: "ielts", englishScore: 0, studyGapYears: 0,
    fundsNpr: 0, sponsorIncomeNpr: 0, hasRefusal: false,
  });
  const set = <K extends keyof EligibilityInput>(k: K, v: EligibilityInput[K]) => setI((p) => ({ ...p, [k]: v }));
  const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

  const answered = i.percent > 0 || i.englishScore > 0 || i.fundsNpr > 0;
  const r = useMemo(() => checkEligibility(i), [i]);
  const v = VERDICT[r.verdict];

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Where do you want to go?" name="ec">
            <select id="ec" className={inputClass} value={i.country} onChange={(e) => set("country", e.target.value as CountryCode)}>
              {COUNTRY_CODES.map((k) => <option key={k} value={k}>{COUNTRIES[k].flag} {COUNTRIES[k].name}</option>)}
            </select>
          </Field>
          <Field label="What level?" name="el">
            <select id="el" className={inputClass} value={i.level} onChange={(e) => set("level", e.target.value as Level)}>
              {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </Field>
          <Field label="Last result (%)" name="ep" hint="A GPA of 3.4 out of 4 is roughly 73%.">
            <NumberInput id="ep" number={i.percent} onNumber={(n) => set("percent", n)} placeholder="65" />
          </Field>
          <Field label="English test" name="et">
            <select id="et" className={inputClass} value={i.englishTest} onChange={(e) => set("englishTest", e.target.value as EligibilityInput["englishTest"])}>
              <option value="ielts">IELTS</option>
              <option value="pte">PTE</option>
              <option value="toefl">TOEFL</option>
              <option value="duolingo">Duolingo</option>
              <option value="none">Not taken yet</option>
            </select>
          </Field>
          <Field label="Score" name="es" hint={i.englishTest === "none" ? "Leave blank." : "Overall score."}>
            <NumberInput id="es" decimal disabled={i.englishTest === "none"} number={i.englishScore} onNumber={(n) => set("englishScore", n)} placeholder="6.5" />
          </Field>
          <Field label="Study gap (years)" name="eg">
            <NumberInput id="eg" number={i.studyGapYears} onNumber={(n) => set("studyGapYears", n)} placeholder="0" />
          </Field>
          <Field label="Funds available (NPR)" name="ef" hint={i.fundsNpr ? npr(i.fundsNpr) : "Savings plus any loan you could raise."}>
            <NumberInput id="ef" number={i.fundsNpr} onNumber={(n) => set("fundsNpr", n)} placeholder="5000000" />
          </Field>
          <Field label="Sponsor's annual income (NPR)" name="ei" hint={i.sponsorIncomeNpr ? npr(i.sponsorIncomeNpr) : "As declared on the tax clearance."}>
            <NumberInput id="ei" number={i.sponsorIncomeNpr} onNumber={(n) => set("sponsorIncomeNpr", n)} placeholder="4200000" />
          </Field>
          <Field label="Any previous visa refusal?" name="er">
            <select id="er" className={inputClass} value={i.hasRefusal ? "1" : "0"} onChange={(e) => set("hasRefusal", e.target.value === "1")}>
              <option value="0">No</option>
              <option value="1">Yes, for any country</option>
            </select>
          </Field>
        </div>
      </Card>

      {answered && (
        <>
          <Card className="p-6">
            <Chip tone={v.tone}>{v.label}</Chip>
            <h2 className="h-tight mt-3 text-[24px]">{r.headline}</h2>
            <p className="mt-2 text-[15px] font-medium text-ink-2">{r.nextStep}</p>
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

          <Card className="border-brand-200 bg-brand-50/60 p-5">
            <h3 className="h-tight text-[16px]">Knowing you are eligible is the easy part</h3>
            <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
              Most applications that fail are not from ineligible students. They fail at the
              interview, on a statement that could have been written by anyone, or on a funding
              answer the student could not give. That is what an account gets you — and it is free
              to start.
            </p>
            <div className="mt-4"><LinkButton href="/signup" size="md">Practise the part that actually decides it</LinkButton></div>
          </Card>
        </>
      )}

      {!answered && (
        <Card className="px-6 py-10 text-center">
          <p className="text-[15px] text-muted">Fill in your result, your English score and your funds above. The answer appears here.</p>
        </Card>
      )}

      <p className="text-[12px] leading-relaxed text-muted">
        A first-pass check against typical requirements and each destination's published financial
        threshold, not a decision by any university or embassy. Individual courses set their own
        entry bars, and visa officers weigh the whole file.
      </p>
    </div>
  );
}
