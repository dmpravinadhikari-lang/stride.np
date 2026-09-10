"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireScope } from "@/lib/auth/current";
import { runAiJson } from "@/lib/ai/run";
import { creditsFor } from "@/lib/modules/registry";
import { OutOfCreditsError } from "@/lib/usage";
import { getProfile, profileBrief } from "@/lib/profile";
import {
  addQuestion, answeredCount, completeSession, createSession, deleteSession,
  getSession, listTurns, openTurn, recordAnswer, unansweredSession,
} from "@/modules/ai-interview/data";
import { evaluateSystem, questionSystem, reportSystem, transcriptFor } from "@/modules/ai-interview/prompts";
import {
  EMPTY_EVAL, EMPTY_REPORT,
  type AnswerEvaluation, type InterviewReport, type NextQuestion,
} from "@/modules/ai-interview/types";

export type ActionState = { ok: boolean; message?: string };
const MODULE = "ai-interview";

function explain(error: unknown): string {
  if (error instanceof OutOfCreditsError) return error.message;
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("Could not run") || msg.includes("Claude CLI failed")) {
    return `The AI engine did not respond. ${msg}`;
  }
  return `Something went wrong: ${msg}`;
}

/** Asks the model for the next question and stores it. */
async function askNext(
  scope: Awaited<ReturnType<typeof requireScope>>["scope"],
  session: { id: string; kind: string; country: string },
  studentName: string,
) {
  const turns = listTurns(scope, session.id);
  const profile = getProfile(scope.userId);
  const last = turns.filter((t) => t.answer).at(-1);

  const next = await runAiJson<NextQuestion>(
    scope,
    {
      module: MODULE, action: "interview.next_question", tier: "smart", maxTokens: 500,
      system: questionSystem(session.kind, session.country),
      prompt:
        `STUDENT FILE\n${profileBrief(profile, studentName)}\n\n` +
        `INTERVIEW SO FAR\n${transcriptFor(turns)}\n\n` +
        (last?.evaluation
          ? `YOUR ASSESSMENT OF THE LAST ANSWER\nScore ${last.evaluation.score}/10. ${last.evaluation.verdict}\nWeak points: ${last.evaluation.weaknesses.join("; ") || "none"}\n\n`
          : "") +
        `Ask the next question. If the last answer was weak on a point that matters, follow up on it instead of moving on.`,
    },
    creditsFor(MODULE, "question"),
    { question: "", intent: "", isFollowup: false },
  );

  if (!next.question) throw new Error("The AI engine returned no question.");
  addQuestion(scope, session.id, next);
}

export async function startInterview(formData: FormData) {
  const { user, scope } = await requireScope();
  const kind = String(formData.get("kind") || "us_f1");
  const countryCode = String(formData.get("country") || "US");
  const budget = Math.min(20, Math.max(4, Number(formData.get("budget") || 8)));

  // Reuse an identical interview the student started but never answered,
  // rather than creating a second empty one.
  const existing = unansweredSession(scope, kind, countryCode);
  if (existing) redirect(`/app/interview/${existing.id}`);

  const id = createSession(scope, { kind, country: countryCode, budget });
  try {
    await askNext(scope, { id, kind, country: countryCode }, user.fullName);
  } catch {
    // The session exists; the interview page shows the retry control.
  }
  revalidatePath("/app/interview");
  redirect(`/app/interview/${id}`);
}

export async function removeInterview(formData: FormData) {
  const { scope } = await requireScope();
  deleteSession(scope, String(formData.get("id")));
  revalidatePath("/app/interview");
  redirect("/app/interview");
}

export async function retryQuestion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, scope } = await requireScope();
  const id = String(formData.get("id"));
  const session = getSession(scope, id);
  if (!session) return { ok: false, message: "That interview no longer exists." };
  try {
    await askNext(scope, session, user.fullName);
    revalidatePath(`/app/interview/${id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}

export async function submitAnswer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, scope } = await requireScope();
  const id = String(formData.get("id"));
  const answer = String(formData.get("answer") || "").trim();
  if (answer.length < 2) return { ok: false, message: "Say something, even a poor answer is worth assessing." };

  const session = getSession(scope, id);
  if (!session) return { ok: false, message: "That interview no longer exists." };
  if (session.status === "complete") return { ok: false, message: "This interview is already finished." };

  const turn = openTurn(scope, id);
  if (!turn) return { ok: false, message: "There is no question waiting for an answer." };

  const profile = getProfile(scope.userId);
  const priorTurns = listTurns(scope, id);

  try {
    const evaluation = await runAiJson<AnswerEvaluation>(
      scope,
      {
        module: MODULE, action: "interview.evaluate_answer", tier: "smart", maxTokens: 1200,
        system: evaluateSystem(session.kind, session.country),
        prompt:
          `STUDENT FILE\n${profileBrief(profile, user.fullName)}\n\n` +
          `EARLIER IN THIS INTERVIEW\n${transcriptFor(priorTurns)}\n\n` +
          `QUESTION ASKED\n${turn.question}\n(What it was testing: ${turn.intent ?? "unstated"})\n\n` +
          `THE STUDENT ANSWERED\n${answer}`,
      },
      creditsFor(MODULE, "evaluate"),
      EMPTY_EVAL,
    );
    recordAnswer(scope, turn.id, answer, evaluation);

    const answered = answeredCount(scope, id);
    if (answered >= session.question_budget) {
      const turns = listTurns(scope, id);
      const report = await runAiJson<InterviewReport>(
        scope,
        {
          module: MODULE, action: "interview.report", tier: "smart", maxTokens: 2000,
          system: reportSystem(session.kind, session.country),
          prompt:
            `STUDENT FILE\n${profileBrief(profile, user.fullName)}\n\n` +
            `FULL TRANSCRIPT\n${transcriptFor(turns)}\n\n` +
            `PER-ANSWER SCORES\n${turns.filter((t) => t.score !== null).map((t, i) => `Q${i + 1}: ${t.score}/10`).join(", ")}`,
        },
        creditsFor(MODULE, "report"),
        EMPTY_REPORT,
      );
      completeSession(scope, id, report);
    } else {
      await askNext(scope, session, user.fullName);
    }

    revalidatePath(`/app/interview/${id}`);
    return { ok: true };
  } catch (error) {
    revalidatePath(`/app/interview/${id}`);
    return { ok: false, message: explain(error) };
  }
}

export async function endEarly(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, scope } = await requireScope();
  const id = String(formData.get("id"));
  const session = getSession(scope, id);
  if (!session) return { ok: false, message: "That interview no longer exists." };
  const turns = listTurns(scope, id);
  if (!turns.some((t) => t.answer)) return { ok: false, message: "Answer at least one question first." };

  try {
    const report = await runAiJson<InterviewReport>(
      scope,
      {
        module: MODULE, action: "interview.report", tier: "smart", maxTokens: 2000,
        system: reportSystem(session.kind, session.country),
        prompt:
          `STUDENT FILE\n${profileBrief(getProfile(scope.userId), user.fullName)}\n\n` +
          `TRANSCRIPT (the student ended this interview early)\n${transcriptFor(turns)}`,
      },
      creditsFor(MODULE, "report"),
      EMPTY_REPORT,
    );
    completeSession(scope, id, report);
    revalidatePath(`/app/interview/${id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}
