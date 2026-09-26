import type { Metadata } from "next";
import { ChecklistPlanner } from "./planner";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  // One address per page, so the same content on www or on a
  // consultancy subdomain does not compete with it in search.
  alternates: { canonical: "/tools/checklist" },
  title: "Study abroad application checklist and timeline from Nepal | OfficeYak",
  description:
    "A dated, step-by-step application plan for Nepali students, IELTS, applications, education loan, bank balance, NOC, visa and departure, worked backwards from your intake month. Free, no account needed.",
};

export default function PublicChecklist() {
  return (
    <>
      <CountVisit tool="checklist" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="Everything you have to do, and when"
        sub="Tell us the country and the month your course starts. You get the whole process with real dates on it, including the ones people find out about too late, like the 28-day bank balance rule and how long an NOC actually takes."
      />
      <ChecklistPlanner />
    </div>
    </>
  );
}
