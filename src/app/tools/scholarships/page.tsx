import type { Metadata } from "next";
import { ScholarshipFinder } from "@/app/app/scholarships/finder";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  title: "Scholarships for Nepali students studying abroad | STRIDE",
  description:
    "Scholarships open to Nepali students — Chevening, Australia Awards, Fulbright, Manaaki, Commonwealth, GREAT and institutional awards. What each one covers, what it demands, and when it closes. Free, no account.",
};

export default function PublicScholarships() {
  return (
    <>
      <CountVisit tool="scholarships" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="Funding a Nepali student can actually get"
        sub="Most of the big scholarships close eight to twelve months before the intake, and most want work experience. Better to know that now than in June."
      />
      <ScholarshipFinder initialCountry="" initialLevel="masters" hasWorkExperience />
    </div>
    </>
  );
}
