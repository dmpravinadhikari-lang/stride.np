"use client";

import { useActionState, useRef } from "react";
import { endEarly, retryQuestion, submitAnswer, type ActionState } from "@/modules/ai-interview/actions";
import { Alert, Button, Card, Chip } from "@/components/ui";

const initial: ActionState = { ok: true };

export function AnswerBox({
  sessionId, question, intent, isFollowup, answered,
}: {
  sessionId: string; question: string | null; intent: string | null;
  isFollowup: boolean; answered: number;
}) {
  const [answerState, answerAction, answering] = useActionState(submitAnswer, initial);
  const [retryState, retryAction, retrying] = useActionState(retryQuestion, initial);
  const [endState, endAction, ending] = useActionState(endEarly, initial);
  const formRef = useRef<HTMLFormElement>(null);

  const busy = answering || retrying || ending;
  const error = [answerState, retryState, endState].find((s) => s.message && !s.ok);

  if (!question) {
    return (
      <Card className="p-6">
        <h2 className="h-tight text-[16px]">No question waiting</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          The interviewer didn't manage to ask the next question, usually the AI engine timed out.
          Nothing you've answered is lost.
        </p>
        {error?.message && <div className="mt-4"><Alert tone="danger">{error.message}</Alert></div>}
        <form action={retryAction} className="mt-4 flex gap-2">
          <input type="hidden" name="id" value={sessionId} />
          <Button type="submit" disabled={busy}>{retrying ? "Asking…" : "Ask the next question"}</Button>
        </form>
        {answered > 0 && (
          <form action={endAction} className="mt-2">
            <input type="hidden" name="id" value={sessionId} />
            <Button type="submit" variant="ghost" size="sm" disabled={busy}>
              {ending ? "Writing your report…" : "End here and get my report"}
            </Button>
          </form>
        )}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-brand-50/70 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num text-[11.5px] font-semibold text-brand-600">Question {answered + 1}</span>
          {isFollowup && <Chip tone="brand">Follow-up. You were vague</Chip>}
        </div>
        <p className="h-tight mt-2 text-[20px] leading-snug">{question}</p>
        {intent && <p className="mt-2 text-[12.5px] text-muted">Answer it out loud first, then type what you said.</p>}
      </div>

      <form ref={formRef} action={answerAction} className="flex flex-col">
        <input type="hidden" name="id" value={sessionId} />
        {error?.message && <div className="px-5 pt-4"><Alert tone="danger">{error.message}</Alert></div>}
        <textarea
          name="answer" rows={5} required autoFocus disabled={busy}
          className="w-full resize-y border-0 bg-white px-5 py-4 text-[15px] leading-[1.7] text-ink placeholder:text-muted/60 focus:outline-none disabled:bg-wash/50"
          placeholder="Say it the way you would say it to the officer. Not the way you'd write it."
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-wash/40 px-5 py-3">
          <Button type="submit" disabled={busy}>
            {answering ? "Assessing your answer…" : "Submit answer"}
          </Button>
          <button
            type="submit" formAction={endAction} disabled={busy || answered === 0}
            className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-ink disabled:opacity-50"
          >
            {ending ? "Writing your report…" : "End early and get my report"}
          </button>
        </div>
      </form>
    </Card>
  );
}
