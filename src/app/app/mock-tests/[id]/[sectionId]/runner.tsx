"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitSection, type ActionState } from "@/modules/mock-tests/actions";
import { Alert, Button, Chip, inputClass } from "@/components/ui";
import { ListeningPlayer } from "./listening-player";

const initial: ActionState = { ok: true };

type Q = { id: string; idx: number; type: string; prompt: string; options: string[]; saved: string };

const TFNG = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG = ["YES", "NO", "NOT GIVEN"];

function clock(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SectionRunner({
  attemptId, sectionId, kind, title, instructions, passage, audioScript, seconds, questions,
}: {
  attemptId: string; sectionId: string; kind: string; title: string;
  instructions: string | null; passage: string | null; audioScript: string | null;
  seconds: number; questions: Q[];
}) {
  const [state, action, pending] = useActionState(submitSection, initial);
  const [left, setLeft] = useState(seconds);
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(questions.map((q) => [q.id, q.saved])),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  // The clock runs down and submits for you, exactly like the real thing.
  useEffect(() => {
    if (pending) return;
    if (left <= 0) {
      if (!submitted.current) {
        submitted.current = true;
        formRef.current?.requestSubmit();
      }
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, pending]);

  const set = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));
  const answered = questions.filter((q) => (values[q.id] ?? "").trim().length > 0).length;
  const isEssay = kind === "writing" || kind === "speaking";
  const low = left <= 60;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="attempt_id" value={attemptId} />
      <input type="hidden" name="section_id" value={sectionId} />

      {/* --------------------------------------------------------- sticky bar */}
      <div className="sticky top-0 z-20 -mx-5 border-b border-line bg-canvas/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="h-tight text-[18px]">{title}</h1>
            <p className="text-[12.5px] text-muted">{answered} of {questions.length} answered</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`num rounded-full px-3 py-1.5 text-[15px] font-semibold tabular-nums ${
                low ? "bg-danger-100 text-danger-600" : "bg-wash text-ink"}`}
              role="timer" aria-live={low ? "assertive" : "off"}
            >
              {clock(Math.max(0, left))}
            </span>
            <Button type="submit" disabled={pending}>
              {pending ? "Marking…" : "Submit section"}
            </Button>
          </div>
        </div>
      </div>

      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      {instructions && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
          {instructions}
        </div>
      )}

      {audioScript && <ListeningPlayer script={audioScript} />}

      <div className={passage ? "grid gap-5 lg:grid-cols-2" : ""}>
        {passage && (
          <div className="scroll-soft max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-panel px-5 py-5 lg:sticky lg:top-24">
            {passage.split("\n\n").map((para, i) => (
              <p key={i} className={i === 0
                ? "h-tight text-[16px] tracking-wide"
                : "mt-3.5 text-[14.5px] leading-[1.75] text-ink-2"}>
                {para}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {questions.map((q) => {
            const choices = q.type === "tfng" ? TFNG : q.type === "ynng" ? YNNG : q.options;
            return (
              <div key={q.id} className="rounded-2xl border border-line bg-panel px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="num mt-0.5 shrink-0 text-[12px] font-semibold text-brand-600">
                    {q.idx}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink ${isEssay ? "font-medium" : ""}`}>
                      {q.prompt}
                    </p>

                    {isEssay ? (
                      <>
                        <textarea
                          name={`q_${q.id}`} rows={kind === "writing" ? 12 : 5}
                          value={values[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)}
                          className="mt-3 w-full resize-y rounded-xl border border-line-2 bg-white px-3.5 py-3 text-[14.5px] leading-[1.7] text-ink focus:border-brand-400 focus:outline-none"
                          placeholder={kind === "writing"
                            ? "Write your answer here."
                            : "Type what you would say out loud. Write it the way you would speak it, not the way you would write an essay."}
                        />
                        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted">
                          <span className="num">
                            {(values[q.id] ?? "").trim().split(/\s+/).filter(Boolean).length} words
                          </span>
                          {kind === "writing" && (
                            <Chip tone="grey">minimum {q.idx === 1 ? 150 : 250}</Chip>
                          )}
                        </div>
                      </>
                    ) : choices.length > 0 ? (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {choices.map((opt) => (
                          <label key={opt} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[14px] transition-colors ${
                            values[q.id] === opt ? "border-brand-400 bg-brand-50 text-ink" : "border-line hover:border-line-2"}`}>
                            <input
                              type="radio" name={`q_${q.id}`} value={opt}
                              checked={values[q.id] === opt}
                              onChange={() => set(q.id, opt)}
                              className="accent-brand-500"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        name={`q_${q.id}`} value={values[q.id] ?? ""}
                        onChange={(e) => set(q.id, e.target.value)}
                        className={`${inputClass} mt-3`}
                        placeholder="Your answer"
                        autoComplete="off"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-5 py-4">
        <p className="text-[13px] text-muted">
          {answered === questions.length
            ? "Everything answered."
            : `${questions.length - answered} unanswered. Unanswered questions score zero, guess rather than leave blank.`}
        </p>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Marking…" : "Submit section"}
        </Button>
      </div>
    </form>
  );
}
