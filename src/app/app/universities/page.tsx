import { requireScope } from "@/lib/auth/current";
import { firstNumber, getProfile, toPercent } from "@/lib/profile";
import { UniFinder } from "./finder";
import type { Level } from "@/modules/cost/data";

export const metadata = { title: "University Finder, STRIDE" };

export default async function UniversitiesPage() {
  const { user } = await requireScope();
  const p = getProfile(user.id);
  const level = (["diploma", "bachelors", "masters"].includes(p?.study_level ?? "")
    ? p!.study_level : "masters") as Level;

  const percent = toPercent(p?.last_gpa);
  const ieltsRaw = firstNumber(p?.english_score);
  const ielts = ieltsRaw > 0 && ieltsRaw <= 9 ? ieltsRaw : 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">University Finder</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Matched against your actual grades, budget and English score. Places you cannot reach yet
          are shown too, with the reason. That is more useful than a shortlist that flatters you.
        </p>
      </header>

      <UniFinder
        initial={{
          country: p?.target_country ?? "AU",
          level,
          field: "",
          budgetNpr: p?.budget_npr ? Math.round(p.budget_npr / 2) : 0,
          ielts: ielts > 0 && ielts <= 9 ? ielts : 0,
          percent,
        }}
      />
    </div>
  );
}
