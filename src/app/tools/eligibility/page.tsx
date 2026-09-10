import type { Metadata } from "next";
import { EligibilityTool } from "./tool";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  title: "Am I eligible to study abroad? Free check for Nepali students | STRIDE",
  description:
    "Check whether you qualify to study in Australia, New Zealand, the UK, Ireland, the USA or Canada from Nepal. Grades, IELTS or PTE score, study gap and funds assessed against what each destination actually requires. Free, honest, no account.",
};

export default function EligibilityPage() {
  return (
    <>
      <CountVisit tool="eligibility" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="Can you actually get in, and get the visa?"
        sub="Two different questions, and most students only think about the first. This checks both against what each destination really requires, and tells you plainly if the answer is no."
      />
      <EligibilityTool />
    </div>
    </>
  );
}
