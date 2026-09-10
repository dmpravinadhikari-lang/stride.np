"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireScope, requireRole } from "@/lib/auth/current";
import { runAiJson } from "@/lib/ai/run";
import { creditsFor } from "@/lib/modules/registry";
import { OutOfCreditsError } from "@/lib/usage";
import {
  answersOf, attemptSection, attemptSections, completeAttempt, completeSection,
  deleteAttempt, getAttempt, getPaper, getSection, markSectionStarted, questionsOf,
  recordBankReview, saveAnswer, setPaperStatus, startAttempt,
  type SectionKind,
} from "@/modules/mock-tests/data";
import { bandFromRaw, overallBand, roundBand } from "@/modules/mock-tests/bands";
import { isCorrect } from "@/modules/mock-tests/marking";
import { reportSystem, speakingSystem, writingSystem } from "@/modules/mock-tests/prompts";
import {
  EMPTY_REPORT, EMPTY_SPEAKING, EMPTY_WRITING,
  type AttemptReport, type SpeakingScore, type WritingScore,
} from "@/modules/mock-tests/types";

export type ActionState = { ok: boolean; message?: string };
const MODULE = "mock-tests";

function explain(error: unknown): string {
  if (error instanceof OutOfCreditsError) return error.message;
  const msg = error instanceof Error ? error.message : String(error);
  return `Scoring failed: ${msg}`;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export async function startMock(formData: FormData) {
  const { scope } = await requireScope();
  const paperId = String(formData.get("paper_id"));
  const kind = String(formData.get("only_kind") || "");
  const paper = getPaper(paperId);
  if (!paper || paper.status !== "published") redirect("/app/mock-tests");

  const id = startAttempt(
    scope, paperId,
    kind ? "sectional" : "full",
    kind ? (kind as SectionKind) : undefined,
  );
  revalidatePath("/app/mock-tests");
  redirect(`/app/mock-tests/${id}`);
}

export async function removeMockAttempt(formData: FormData) {
  const { scope } = await requireScope();
  deleteAttempt(scope, String(formData.get("id")));
  revalidatePath("/app/mock-tests");
  redirect("/app/mock-tests");
}

export async function beginSection(formData: FormData) {
  const { scope } = await requireScope();
  const attemptId = String(formData.get("attempt_id"));
  const sectionId = String(formData.get("section_id"));
  const row = attemptSection(scope, attemptId, sectionId);
  if (row) markSectionStarted(scope, row.id);
  revalidatePath(`/app/mock-tests/${attemptId}`);
  redirect(`/app/mock-tests/${attemptId}/${sectionId}`);
}

/**
 * Saves a section's answers, marks it, and, if that was the last section, 
 * writes the overall report.
 */
export async function submitSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, scope } = await requireScope();
  const attemptId = String(formData.get("attempt_id"));
  const sectionId = String(formData.get("section_id"));

  const attempt = getAttempt(scope, attemptId);
  const section = getSection(sectionId);
  const row = attempt && attemptSection(scope, attemptId, sectionId);
  if (!attempt || !section || !row) return { ok: false, message: "That test no longer exists." };
  if (row.status === "done") return { ok: false, message: "This section has already been submitted." };

  const questions = questionsOf(sectionId);
  const autoMarked = section.kind === "listening" || section.kind === "reading";

  // Store every response first, so nothing is lost even if scoring then fails.
  let raw = 0;
  for (const q of questions) {
    const response = String(formData.get(`q_${q.id}`) ?? "").trim();
    const correct = autoMarked ? (isCorrect(response, answersOf(q)) ? 1 : 0) : null;
    if (correct === 1) raw += q.marks;
    saveAnswer(scope, attemptId, sectionId, q.id, response, correct);
  }

  try {
    if (autoMarked) {
      const max = questions.reduce((sum, q) => sum + q.marks, 0);
      completeSection(scope, row.id, {
        raw, max, band: bandFromRaw(section.kind as "reading" | "listening", raw, max),
      });
    } else if (section.kind === "writing") {
      const scores: WritingScore[] = [];
      for (const [i, q] of questions.entries()) {
        const response = String(formData.get(`q_${q.id}`) ?? "").trim();
        const label = i === 0 ? "Task 1" : "Task 2";
        if (words(response) < 20) {
          scores.push({
            ...EMPTY_WRITING, band: 1,
            summary: `${label} was left blank or barely started. In the real test this alone would put your Writing band below 5.`,
            fixFirst: [`Attempt ${label} in full, an unanswered task cannot be marked up.`],
          });
          continue;
        }
        scores.push(await runAiJson<WritingScore>(
          scope,
          {
            module: MODULE, action: "mock.score_writing", tier: "smart", maxTokens: 2500,
            system: writingSystem(label),
            prompt: `${label.toUpperCase()} PROMPT\n${q.prompt}\n\nCANDIDATE'S SCRIPT (${words(response)} words)\n${response}`,
          },
          creditsFor(MODULE, "writing_task"),
          EMPTY_WRITING,
        ));
      }
      // Task 2 carries twice the weight of Task 1.
      const band = scores.length === 2
        ? roundBand((scores[0].band + scores[1].band * 2) / 3)
        : roundBand(scores[0]?.band ?? 0);
      completeSection(scope, row.id, { band, feedback: scores });
    } else {
      const transcript = questions
        .map((q, i) => `Q${i + 1}: ${q.prompt}\nA${i + 1}: ${String(formData.get(`q_${q.id}`) ?? "").trim() || "(no answer)"}`)
        .join("\n\n");
      const score = await runAiJson<SpeakingScore>(
        scope,
        {
          module: MODULE, action: "mock.score_speaking", tier: "smart", maxTokens: 2500,
          system: speakingSystem(),
          prompt: `IELTS SPEAKING, TEXT MODE\n\n${transcript}`,
        },
        creditsFor(MODULE, "speaking"),
        EMPTY_SPEAKING,
      );
      completeSection(scope, row.id, { band: score.band, feedback: score });
    }
  } catch (error) {
    return { ok: false, message: explain(error) };
  }

  // Last section? Write the overall report.
  const all = attemptSections(scope, attemptId);
  if (all.every((s) => s.status === "done")) {
    const bands = all.map((s) => s.band);
    const overall = overallBand(bands);

    // A one-section practice gets no whole-test report. Writing one would mean
    // commenting on three skills the student did not sit, which is worse than
    // saying nothing.
    if (attempt.mode === "sectional") {
      completeAttempt(scope, attemptId, overall, EMPTY_REPORT);
      revalidatePath(`/app/mock-tests/${attemptId}`);
      redirect(`/app/mock-tests/${attemptId}`);
    }

    let report: AttemptReport = EMPTY_REPORT;
    try {
      report = await runAiJson<AttemptReport>(
        scope,
        {
          module: MODULE, action: "mock.report", tier: "smart", maxTokens: 1800,
          system: reportSystem(),
          prompt:
            `CANDIDATE: ${user.fullName}\nOVERALL: ${overall ?? "n/a"}\n` +
            all.map((s) => `${s.kind}: band ${s.band ?? "n/a"}${s.max_score ? ` (${s.raw_score}/${s.max_score})` : ""}`).join("\n"),
        },
        0, // the per-section scoring already charged for this attempt
        EMPTY_REPORT,
      );
    } catch {
      // A missing summary must not lose the bands the student earned.
    }
    completeAttempt(scope, attemptId, overall, report);
  }

  revalidatePath(`/app/mock-tests/${attemptId}`);
  redirect(`/app/mock-tests/${attemptId}`);
}

// ------------------------------------------------------- trainer corrections
export async function reviewQuestion(formData: FormData) {
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const paperId = String(formData.get("paper_id"));
  const questionId = String(formData.get("question_id")) || null;
  const verdict = String(formData.get("verdict")) as "approve" | "fix" | "reject";
  recordBankReview(paperId, questionId, user.id, verdict, String(formData.get("note") || ""));
  revalidatePath(`/app/mock-tests/bank/${paperId}`);
}

export async function setStatus(formData: FormData) {
  await requireRole("super_admin");
  const paperId = String(formData.get("paper_id"));
  setPaperStatus(paperId, String(formData.get("status")));
  revalidatePath(`/app/mock-tests/bank/${paperId}`);
  revalidatePath("/app/mock-tests");
}
