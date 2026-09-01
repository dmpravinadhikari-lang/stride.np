import { notFound, redirect } from "next/navigation";
import { requireScope } from "@/lib/auth/current";
import {
  answersFor, attemptSection, getAttempt, getSection, optionsOf, questionsOf,
} from "@/modules/mock-tests/data";
import { SectionRunner } from "./runner";

export default async function SectionPage({
  params,
}: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id, sectionId } = await params;
  const { scope } = await requireScope();

  const attempt = getAttempt(scope, id);
  const section = getSection(sectionId);
  const row = attempt && attemptSection(scope, id, sectionId);
  if (!attempt || !section || !row) notFound();
  if (row.status === "done") redirect(`/app/mock-tests/${id}`);

  const questions = questionsOf(sectionId);
  const saved = new Map(answersFor(scope, id, sectionId).map((a) => [a.question_id, a.response ?? ""]));

  return (
    <SectionRunner
      attemptId={id}
      sectionId={sectionId}
      kind={section.kind}
      title={section.title}
      instructions={section.instructions}
      passage={section.passage}
      audioScript={section.audio_script}
      seconds={section.seconds}
      questions={questions.map((q) => ({
        id: q.id, idx: q.idx, type: q.type, prompt: q.prompt,
        options: optionsOf(q), saved: saved.get(q.id) ?? "",
      }))}
    />
  );
}
