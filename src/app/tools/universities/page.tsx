import type { Metadata } from "next";
import { UniFinder } from "@/app/app/universities/finder";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  title: "University finder for Nepali students | STRIDE",
  description:
    "Find universities in Australia, New Zealand, the UK, Ireland, the USA and Canada matched to your grades, budget and IELTS score. Shows what you can reach and what you cannot, with the reason. Free, no account.",
};

export default function PublicUnis() {
  return (
    <>
      <CountVisit tool="universities" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="Where can you actually get in?"
        sub="Matched against your grades, your budget and your English score. Places out of reach are shown too, with the reason, a shortlist that flatters you costs a year."
      />
      <UniFinder initial={{ country: "AU", level: "masters", field: "", budgetNpr: 0, ielts: 0, percent: 0 }} />
    </div>
    </>
  );
}
