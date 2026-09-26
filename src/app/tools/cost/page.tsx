import type { Metadata } from "next";
import { CostCalculator } from "@/app/app/cost/calculator";
import { RATES_AS_OF } from "@/modules/cost/data";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  // One address per page, so the same content on www or on a
  // consultancy subdomain does not compete with it in search.
  alternates: { canonical: "/tools/cost" },
  title: "True cost of studying abroad from Nepal, in NPR | OfficeYak",
  description:
    "The real cost of studying abroad from Nepal in rupees: tuition, living, visa, insurance and flights, plus the bank balance each embassy asks to see.",
};

export default function PublicCost() {
  return (
    <>
      <CountVisit tool="cost" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="What studying abroad actually costs"
        sub="Not the tuition figure on the brochure. Everything, in rupees, and separately, the balance the embassy requires you to show, which is a published rule rather than an estimate."
      />
      <CostCalculator initial={{ country: "AU", level: "masters", savingsNpr: 0, sponsorIncomeNpr: 0 }} ratesAsOf={RATES_AS_OF} />
    </div>
    </>
  );
}
