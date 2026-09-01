import type { Metadata } from "next";
import { CostCalculator } from "@/app/app/cost/calculator";
import { RATES_AS_OF } from "@/modules/cost/data";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  title: "True cost of studying abroad from Nepal, in NPR | STRIDE",
  description:
    "Work out the real cost of studying in Australia, New Zealand, the UK, Ireland, the USA or Canada from Nepal — tuition, living, visa, insurance and flights in rupees, plus the bank balance each embassy requires you to show. Free, no account.",
};

export default function PublicCost() {
  return (
    <>
      <CountVisit tool="cost" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="What studying abroad actually costs"
        sub="Not the tuition figure on the brochure. Everything, in rupees — and separately, the balance the embassy requires you to show, which is a published rule rather than an estimate."
      />
      <CostCalculator initial={{ country: "AU", level: "masters", savingsNpr: 0, sponsorIncomeNpr: 0 }} ratesAsOf={RATES_AS_OF} />
    </div>
    </>
  );
}
