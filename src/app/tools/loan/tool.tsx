"use client";

import { useMemo, useState } from "react";
import { calcLoan, serviceability, RATE_NOTE, TYPICAL_RATE, type LoanInput } from "@/modules/tools/loan";
import { npr } from "@/lib/terms";
import { Alert, Card, Chip, Field, inputClass, LinkButton, Meter, type Tone } from "@/components/ui";
import { NumberInput } from "@/components/NumberInput";

const exact = (n: number) => `NPR ${Math.round(n).toLocaleString("en-IN")}`;
const TONE: Record<string, Tone> = { comfortable: "teal", tight: "gold", unlikely: "danger", unknown: "grey" };

export function LoanTool() {
  const [i, setI] = useState<LoanInput>({
    amountNpr: 4000000, annualRatePct: TYPICAL_RATE, termYears: 10,
    moratoriumMonths: 30, duringStudy: "capitalise",
  });
  const [income, setIncome] = useState("");
  const set = <K extends keyof LoanInput>(k: K, v: LoanInput[K]) => setI((p) => ({ ...p, [k]: v }));
  const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

  const r = useMemo(() => calcLoan(i), [i]);
  const s = serviceability(r.emi, num(income));
  const other = calcLoan({ ...i, duringStudy: i.duringStudy === "capitalise" ? "service-interest" : "capitalise" });
  const difference = Math.abs(r.totalRepaid - other.totalRepaid);

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Loan amount (NPR)" name="la" hint={npr(i.amountNpr)}>
            <NumberInput id="la" number={i.amountNpr} onNumber={(n) => set("amountNpr", n)} placeholder="4000000" />
          </Field>
          <Field label="Interest rate (% a year)" name="lr" hint="Ask your bank for the actual figure in writing.">
            <NumberInput id="lr" decimal number={i.annualRatePct} onNumber={(n) => set("annualRatePct", n)} placeholder="11" />
          </Field>
          <Field label="Repayment period (years)" name="lt" hint="After the moratorium ends.">
            <NumberInput id="lt" number={i.termYears} onNumber={(n) => set("termYears", n)} placeholder="10" />
          </Field>
          <Field label="Moratorium (months)" name="lm" hint="Course length plus the grace period before repayment starts.">
            <NumberInput id="lm" number={i.moratoriumMonths} onNumber={(n) => set("moratoriumMonths", n)} placeholder="30" />
          </Field>
          <Field label="During your course" name="ld" hint="This is the choice that matters most.">
            <select id="ld" className={inputClass} value={i.duringStudy} onChange={(e) => set("duringStudy", e.target.value as LoanInput["duringStudy"])}>
              <option value="capitalise">Pay nothing — interest is added to the loan</option>
              <option value="service-interest">Pay the interest monthly</option>
            </select>
          </Field>
          <Field label="Sponsor's annual income (NPR)" name="li" hint="Optional — checks whether the repayment is plausible.">
            <input id="li" inputMode="numeric" className={inputClass} value={income} onChange={(e) => setIncome(e.target.value)} placeholder="4200000" />
          </Field>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-brand-200 bg-brand-50/50 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-600">Monthly EMI</div>
          <div className="num mt-1.5 text-[30px] font-semibold leading-none text-ink">{exact(r.emi)}</div>
          <div className="mt-1 text-[12.5px] text-muted">for {i.termYears} years, once repayment starts</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">Total interest</div>
          <div className="num mt-1.5 text-[30px] font-semibold leading-none text-ink">{npr(r.totalInterest)}</div>
          <div className="num mt-1 text-[12.5px] text-muted">{exact(r.totalInterest)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">Total repaid</div>
          <div className="num mt-1.5 text-[30px] font-semibold leading-none text-ink">{npr(r.totalRepaid)}</div>
          <div className="mt-1 text-[12.5px] text-muted">{r.multiple}× what you borrowed</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">While you are still studying</h2>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-2">
          <div className="bg-panel px-5 py-4">
            <div className="text-[13px] text-muted">Interest over the {i.moratoriumMonths}-month moratorium</div>
            <div className="num mt-1 text-[22px] font-semibold text-ink">{exact(r.interestDuringMoratorium)}</div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
              {i.duringStudy === "capitalise"
                ? "Added to your loan, and then charged interest itself for the whole repayment period."
                : `Paid by your family at ${exact(r.monthlyDuringStudy)} a month while you study.`}
            </p>
          </div>
          <div className="bg-panel px-5 py-4">
            <div className="text-[13px] text-muted">Owed when repayment starts</div>
            <div className="num mt-1 text-[22px] font-semibold text-ink">{exact(r.principalAtRepayment)}</div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
              {i.duringStudy === "capitalise"
                ? "More than you borrowed, because the interest joined the principal."
                : "The same as you borrowed, because the interest was paid as it arose."}
            </p>
          </div>
        </div>
        {difference > 1000 && (
          <div className="border-t border-line px-5 py-4">
            <Alert tone={i.duringStudy === "capitalise" ? "gold" : "teal"}>
              {i.duringStudy === "capitalise"
                ? <>Paying the interest monthly during the course instead would save about{" "}
                    <strong className="font-semibold text-ink">{npr(difference)}</strong> over the life of the
                    loan — it would cost roughly {exact(other.monthlyDuringStudy)} a month while you study. Worth
                    asking your family whether that is manageable.</>
                : <>Servicing the interest during the course is saving you about{" "}
                    <strong className="font-semibold text-ink">{npr(difference)}</strong> against letting it
                    capitalise. Keep doing it if the family can.</>}
            </Alert>
          </div>
        )}
      </Card>

      {s.ratio !== null && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="h-tight text-[16px]">Can the family carry this repayment?</h2>
            <Chip tone={TONE[s.verdict]}>{Math.round(s.ratio * 100)}% of monthly income</Chip>
          </div>
          <div className="mt-3"><Meter value={Math.min(100, s.ratio * 100)} tone={TONE[s.verdict]} /></div>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">{s.note}</p>
        </Card>
      )}

      <Card className="border-brand-200 bg-brand-50/60 p-5">
        <h3 className="h-tight text-[16px]">The loan is only half the question</h3>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          A visa officer will ask you what this loan is for, what secures it, and how it will be
          repaid — and a student who cannot answer that in their own words loses the application
          regardless of how good the numbers are. Practising those answers is free to start.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href="/tools/cost" size="md" variant="secondary">Work out the total cost first</LinkButton>
          <LinkButton href="/signup" size="md">Practise the funding questions</LinkButton>
        </div>
      </Card>

      <p className="text-[12px] leading-relaxed text-muted">{RATE_NOTE} This calculator is for planning only — the bank's own sanction letter is the figure that counts.</p>
    </div>
  );
}
