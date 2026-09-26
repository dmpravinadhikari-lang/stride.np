import { requireScope } from "@/lib/auth/current";
import { getProfile } from "@/lib/profile";
import { CostCalculator } from "./calculator";
import { RATES_AS_OF } from "@/modules/cost/data";
import type { CountryCode } from "@/lib/countries";
import type { Level } from "@/modules/cost/data";

export const metadata = { title: "True Cost Calculator, Stride" };

export default async function CostPage() {
  const { user } = await requireScope();
  const profile = getProfile(user.id);

  const level = (["diploma", "bachelors", "masters"].includes(profile?.study_level ?? "")
    ? profile!.study_level : "masters") as Level;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">True Cost Calculator</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Not the tuition figure on the brochure. The whole thing, in rupees. What you pay before
          you fly, what the course costs end to end, and separately, the balance the embassy
          requires you to show.
        </p>
      </header>

      <CostCalculator
        initial={{
          country: (profile?.target_country ?? "AU") as CountryCode,
          level,
          savingsNpr: profile?.budget_npr ?? 0,
          sponsorIncomeNpr: profile?.sponsor_income_npr ?? 0,
        }}
        ratesAsOf={RATES_AS_OF}
      />
    </div>
  );
}
