import type { Metadata } from "next";
import { CompareTool } from "./tool";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  title: "Australia vs UK vs Canada, compare study destinations from Nepal | OfficeYak",
  description:
    "Compare Australia, New Zealand, the UK, Ireland, the USA and Canada side by side on tuition, living costs, visa type, the funds you must show and post-study work rights, all in NPR, for students applying from Nepal.",
};

export default function ComparePage() {
  return (
    <>
      <CountVisit tool="compare" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="Two countries, side by side"
        sub="Cost, visa, what you must show in the bank, and what happens after you graduate. The comparison most students make on hearsay."
      />
      <CompareTool />
    </div>
    </>
  );
}
