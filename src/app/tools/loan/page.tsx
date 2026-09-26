import type { Metadata } from "next";
import { LoanTool } from "./tool";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  title: "Education loan EMI calculator for Nepal | OfficeYak",
  description:
    "Work out the monthly EMI and total repayment on a Nepali education loan for studying abroad, including the interest that builds up during your course. Free, in NPR, no account needed.",
};

export default function LoanPage() {
  return (
    <>
      <CountVisit tool="loan" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="What the loan actually costs to pay back"
        sub="Generic EMI calculators get student loans wrong because they ignore the moratorium. The years you are studying, when you are not repaying principal but interest is still running. That single choice changes the total by lakhs."
      />
      <LoanTool />
    </div>
    </>
  );
}
