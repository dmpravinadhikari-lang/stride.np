import type { Metadata } from "next";
import { DocChecklist } from "./tool";
import { ToolIntro } from "../intro";
import { CountVisit } from "@/components/CountVisit";

export const metadata: Metadata = {
  title: "Document checklist for studying abroad from Nepal | OfficeYak",
  description:
    "Every document a Nepali student needs for Australia, New Zealand, the UK, Ireland, the USA or Canada, identity, academic, English, financial, institutional and medical, with what each one is for. Free, no account.",
};

export default function DocumentChecklistPage() {
  return (
    <>
      <CountVisit tool="document-checklist" />
          <div className="flex flex-col gap-6">
      <ToolIntro
        title="Every paper you will be asked for"
        sub="Filtered by where you are going and how far along you are, because a list of everything is a list nobody reads. The ones that take weeks to obtain are marked."
      />
      <DocChecklist />
    </div>
    </>
  );
}
