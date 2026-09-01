import Link from "next/link";
import { notFound } from "next/navigation";
import { requireScope } from "@/lib/auth/current";
import { getSession, listTurns, openTurn, reportOf } from "@/modules/ai-interview/data";
import { removeInterview } from "@/modules/ai-interview/actions";
import { INTERVIEW_KINDS, country } from "@/lib/countries";
import { Chip, Meter } from "@/components/ui";
import { AnswerBox } from "./answer-box";
import { Transcript } from "./transcript";
import { ReportPanel } from "./report-panel";

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scope } = await requireScope();
  const session = getSession(scope, id);
  if (!session) notFound();

  const turns = listTurns(scope, id);
  const pending = openTurn(scope, id);
  const answered = turns.filter((t) => t.answer).length;
  const report = reportOf(session);
  const kind = INTERVIEW_KINDS[session.kind as keyof typeof INTERVIEW_KINDS];
  const c = country(session.country);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/interview" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← All interviews</Link>
          <h1 className="display mt-1.5 text-[26px]">{kind?.label ?? session.kind}</h1>
          <p className="mt-1.5 text-[14px] text-ink-2">{c.flag} {c.name} · {c.visa}</p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone={session.status === "complete" ? "teal" : "gold"}>
            {session.status === "complete" ? "Complete" : `${answered} of ${session.question_budget}`}
          </Chip>
          <form action={removeInterview}>
            <input type="hidden" name="id" value={session.id} />
            <button type="submit" className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-danger-600">
              Delete
            </button>
          </form>
        </div>
      </header>

      {session.status !== "complete" && (
        <div className="rounded-2xl border border-line bg-panel px-5 py-4">
          <div className="flex items-baseline justify-between text-[12.5px]">
            <span className="font-semibold text-ink">Progress</span>
            <span className="num text-muted">{answered} / {session.question_budget}</span>
          </div>
          <div className="mt-2"><Meter value={answered} max={session.question_budget} /></div>
        </div>
      )}

      <Transcript turns={turns.map((t) => ({
        idx: t.idx, question: t.question, intent: t.intent, answer: t.answer,
        score: t.score, isFollowup: t.is_followup === 1, evaluation: t.evaluation,
      }))} />

      {session.status === "complete"
        ? report && <ReportPanel report={report} />
        : <AnswerBox
            sessionId={session.id}
            question={pending?.question ?? null}
            intent={pending?.intent ?? null}
            isFollowup={pending?.is_followup === 1}
            answered={answered}
          />}
    </div>
  );
}
