"use client";

import { useMemo, useState } from "react";
import { calcLoan, serviceability, RATE_NOTE, TYPICAL_RATE, type LoanInput } from "@/modules/tools/loan";
import { npr } from "@/lib/terms";
import { Alert, Card, Chip, LinkButton, Meter, type Tone } from "@/components/ui";
import { ChipGroup, Slider } from "@/components/quiz";

const exact = (n: number) => `NPR ${Math.round(n).toLocaleString("en-IN")}`;
const TONE: Record<string, Tone> = { comfortable: "teal", tight: "gold", unlikely: "danger", unknown: "grey" };

export function LoanTool() {
  const [i, setI] = useState<LoanInput>({
    amountNpr: 4000000, annualRatePct: TYPICAL_RATE, termYears: 10,
    moratoriumMonths: 30, duringStudy: "capitalise",
  });
  const [income, setIncome] = useState(0);
  const set = <K extends keyof LoanInput>(k: K, v: LoanInput[K]) => setI((p) => ({ ...p, [k]: v }));

  const r = useMemo(() => calcLoan(i), [i]);
  const s = serviceability(r.emi, income);
  const other = calcLoan({ ...i, duringStudy: i.duringStudy === "capitalise" ? "service-interest" : "capitalise" });
  const difference = Math.abs(r.totalRepaid - other.totalRepaid);

  return (
    <div className="flex flex-col gap-5">
      {/* Every figure here is dragged, not typed. A family working out whether
          they can afford this moves the amount and the term back and forth a
          dozen times — which a slider invites and a number field punishes. */}
      <Card className="p-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold text-ink">How much are you borrowing?</p>
            <div className="mt-4">
              <Slider
                min={500_000} max={15_000_000} step={100_000}
                value={i.amountNpr}
                onChange={(n) => set("amountNpr", n)}
                format={(n) => `NPR ${(n / 100000).toFixed(0)} lakh`}
              />
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">Interest rate</p>
            <div className="mt-4">
              <Slider
                min={6} max={18} step={0.25}
                value={i.annualRatePct}
                onChange={(n) => set("annualRatePct", n)}
                format={(n) => `${n.toFixed(2)}% a year`}
                note="Ask your bank for the actual figure in writing — quoted rates move."
              />
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">Repayment period</p>
            <div className="mt-4">
              <Slider
                min={3} max={20} step={1}
                value={i.termYears}
                onChange={(n) => set("termYears", n)}
                format={(n) => `${Math.round(n)} years`}
                note="Counted from the end of the moratorium, not from today."
              />
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">Moratorium</p>
            <div className="mt-4">
              <Slider
                min={0} max={60} step={3}
                value={i.moratoriumMonths}
                onChange={(n) => set("moratoriumMonths", n)}
                format={(n) => (n === 0 ? "None" : `${Math.round(n)} months`)}
                note="Course length plus the grace period before repayment starts."
              />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <p className="text-[13px] font-semibold text-ink">During your course</p>
          <p className="mt-1 text-[12.5px] text-muted">This is the choice that matters most.</p>
          <div className="mt-3.5">
            <ChipGroup
              columns
              options={[
                { value: "capitalise", label: "Pay nothing", sub: "Interest is added to the loan" },
                { value: "service-interest", label: "Pay the interest monthly", sub: "The balance stays where it is" },
              ] as const}
              value={i.duringStudy}
              onChange={(v) => set("duringStudy", v)}
            />
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <p className="text-[13px] font-semibold text-ink">Your sponsor&rsquo;s yearly income</p>
          <p className="mt-1 text-[12.5px] text-muted">
            Optional. It checks whether the repayment is plausible against what the family earns.
          </p>
          <div className="mt-4">
            <Slider
              min={0} max={8_000_000} step={100_000}
              value={income}
              onChange={setIncome}
              format={(n) => (n === 0 ? "Rather not say" : `NPR ${(n / 100000).toFixed(0)} lakh`)}
            />
          </div>
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
          An officer will ask what this loan is for, what secures it, and how it gets repaid. A
          student who cannot answer that in their own words loses the application however good the
          numbers are.
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
