import { requireScope } from "@/lib/auth/current";
import { getProfile } from "@/lib/profile";
import { ScholarshipFinder } from "./finder";
import type { Level } from "@/modules/cost/data";

export const metadata = { title: "Scholarship Finder, OfficeYak" };

export default async function ScholarshipsPage() {
  const { user } = await requireScope();
  const p = getProfile(user.id);
  const level = (["diploma", "bachelors", "masters"].includes(p?.study_level ?? "")
    ? p!.study_level : "masters") as Level;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Scholarship Finder</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          The funding a Nepali student can realistically apply for, and what each one actually
          demands. Most of the big ones want work experience and a commitment to come home.
        </p>
      </header>

      <ScholarshipFinder
        initialCountry={p?.target_country ?? ""}
        initialLevel={level}
        hasWorkExperience={Boolean(p?.work_experience)}
      />
    </div>
  );
}
