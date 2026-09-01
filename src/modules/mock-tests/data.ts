import { all, now, one, readJson, run, scalar, uid, writeJson } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";

export type Paper = {
  id: string; exam: string; variant: string; title: string; blurb: string | null;
  status: string; origin: string; created_at: string; published_at: string | null;
};
export type Section = {
  id: string; paper_id: string; kind: SectionKind; idx: number; title: string;
  instructions: string | null; passage: string | null; audio_script: string | null;
  image_note: string | null; seconds: number;
};
export type Question = {
  id: string; paper_id: string; section_id: string; idx: number; type: string;
  prompt: string; options: string; answer: string; marks: number;
  guidance: string | null; flagged: number;
};
export type Attempt = {
  id: string; tenant_id: string; user_id: string; paper_id: string; mode: string;
  only_kind: string | null; status: string; overall_band: number | null;
  report: string | null; started_at: string; completed_at: string | null;
};
export type AttemptSection = {
  id: string; attempt_id: string; section_id: string; kind: SectionKind; idx: number;
  status: string; raw_score: number | null; max_score: number | null;
  band: number | null; feedback: string | null; started_at: string | null; completed_at: string | null;
};

export type SectionKind = "listening" | "reading" | "writing" | "speaking";
export const SECTION_ORDER: SectionKind[] = ["listening", "reading", "writing", "speaking"];
export const SECTION_LABEL: Record<SectionKind, string> = {
  listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking",
};
export const AUTO_MARKED: SectionKind[] = ["listening", "reading"];

export const optionsOf = (q: Question) => readJson<string[]>(q.options, []);
export const answersOf = (q: Question) => readJson<string[]>(q.answer, []);

// ------------------------------------------------------------------ the bank
export const publishedPapers = () =>
  all<Paper>("SELECT * FROM test_papers WHERE status = 'published' ORDER BY created_at");

export const allPapers = () =>
  all<Paper>("SELECT * FROM test_papers ORDER BY status, created_at");

export const getPaper = (id: string) =>
  one<Paper>("SELECT * FROM test_papers WHERE id = ?", id);

export const sectionsOf = (paperId: string) =>
  all<Section>("SELECT * FROM test_sections WHERE paper_id = ? ORDER BY idx", paperId);

export const getSection = (id: string) =>
  one<Section>("SELECT * FROM test_sections WHERE id = ?", id);

export const questionsOf = (sectionId: string) =>
  all<Question>("SELECT * FROM test_questions WHERE section_id = ? ORDER BY idx", sectionId);

export const paperQuestionCount = (paperId: string) =>
  scalar("SELECT COUNT(*) FROM test_questions WHERE paper_id = ?", paperId);

// -------------------------------------------------------------- the attempts
export function startAttempt(
  scope: Scope, paperId: string, mode: "full" | "sectional", onlyKind?: SectionKind,
): string {
  const id = uid();
  run(
    `INSERT INTO test_attempts (id, tenant_id, user_id, paper_id, mode, only_kind, status, started_at)
     VALUES (?,?,?,?,?,?, 'in_progress', ?)`,
    id, scope.tenantId, scope.userId, paperId, mode, onlyKind ?? null, now(),
  );
  const wanted = sectionsOf(paperId).filter((s) => (onlyKind ? s.kind === onlyKind : true));
  for (const section of wanted) {
    run(
      `INSERT INTO attempt_sections (id, attempt_id, tenant_id, section_id, kind, idx, status)
       VALUES (?,?,?,?,?,?, 'pending')`,
      uid(), id, scope.tenantId, section.id, section.kind, section.idx,
    );
  }
  return id;
}

export const getAttempt = (scope: Scope, id: string) =>
  one<Attempt>(
    "SELECT * FROM test_attempts WHERE id = ? AND tenant_id = ? AND user_id = ?",
    id, scope.tenantId, scope.userId,
  );

export const attemptSections = (scope: Scope, attemptId: string) =>
  all<AttemptSection>(
    "SELECT * FROM attempt_sections WHERE attempt_id = ? AND tenant_id = ? ORDER BY idx",
    attemptId, scope.tenantId,
  );

export const attemptSection = (scope: Scope, attemptId: string, sectionId: string) =>
  one<AttemptSection>(
    "SELECT * FROM attempt_sections WHERE attempt_id = ? AND section_id = ? AND tenant_id = ?",
    attemptId, sectionId, scope.tenantId,
  );

export const nextPendingSection = (scope: Scope, attemptId: string) =>
  one<AttemptSection>(
    `SELECT * FROM attempt_sections WHERE attempt_id = ? AND tenant_id = ?
       AND status <> 'done' ORDER BY idx LIMIT 1`,
    attemptId, scope.tenantId,
  );

export function markSectionStarted(scope: Scope, id: string) {
  run(
    "UPDATE attempt_sections SET status = 'in_progress', started_at = COALESCE(started_at, ?) WHERE id = ? AND tenant_id = ?",
    now(), id, scope.tenantId,
  );
}

export function saveAnswer(
  scope: Scope, attemptId: string, sectionId: string, questionId: string,
  response: string, correct: number | null,
) {
  const existing = one<{ id: string }>(
    "SELECT id FROM attempt_answers WHERE attempt_id = ? AND question_id = ?", attemptId, questionId,
  );
  if (existing) {
    run("UPDATE attempt_answers SET response = ?, correct = ? WHERE id = ?", response, correct, existing.id);
    return;
  }
  run(
    `INSERT INTO attempt_answers (id, attempt_id, tenant_id, section_id, question_id, response, correct, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    uid(), attemptId, scope.tenantId, sectionId, questionId, response, correct, now(),
  );
}

export type AnswerRow = { question_id: string; response: string | null; correct: number | null };

export const answersFor = (scope: Scope, attemptId: string, sectionId?: string) =>
  all<AnswerRow>(
    `SELECT question_id, response, correct FROM attempt_answers
      WHERE attempt_id = ? AND tenant_id = ?${sectionId ? " AND section_id = ?" : ""}`,
    ...(sectionId ? [attemptId, scope.tenantId, sectionId] : [attemptId, scope.tenantId]),
  );

export function completeSection(
  scope: Scope, id: string,
  result: { raw?: number | null; max?: number | null; band: number | null; feedback?: unknown },
) {
  run(
    `UPDATE attempt_sections
        SET status = 'done', raw_score = ?, max_score = ?, band = ?, feedback = ?, completed_at = ?
      WHERE id = ? AND tenant_id = ?`,
    result.raw ?? null, result.max ?? null, result.band,
    result.feedback === undefined ? null : writeJson(result.feedback),
    now(), id, scope.tenantId,
  );
}

export function completeAttempt(scope: Scope, id: string, band: number | null, report: unknown) {
  run(
    "UPDATE test_attempts SET status = 'complete', overall_band = ?, report = ?, completed_at = ? WHERE id = ? AND tenant_id = ?",
    band, writeJson(report), now(), id, scope.tenantId,
  );
}

export const listAttempts = (scope: Scope) =>
  all<Attempt & { paper_title: string }>(
    `SELECT a.*, p.title AS paper_title
       FROM test_attempts a JOIN test_papers p ON p.id = a.paper_id
      WHERE a.tenant_id = ? AND a.user_id = ?
      ORDER BY a.started_at DESC`,
    scope.tenantId, scope.userId,
  );

export function deleteAttempt(scope: Scope, id: string) {
  run("DELETE FROM attempt_answers WHERE attempt_id = ? AND tenant_id = ?", id, scope.tenantId);
  run("DELETE FROM attempt_sections WHERE attempt_id = ? AND tenant_id = ?", id, scope.tenantId);
  run("DELETE FROM test_attempts WHERE id = ? AND tenant_id = ? AND user_id = ?", id, scope.tenantId, scope.userId);
}

// ------------------------------------------------------- trainer corrections
export function recordBankReview(
  paperId: string, questionId: string | null, reviewerId: string,
  verdict: "approve" | "fix" | "reject", note: string,
) {
  run(
    `INSERT INTO bank_reviews (id, paper_id, question_id, reviewer_id, verdict, note, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    uid(), paperId, questionId, reviewerId, verdict, note || null, now(),
  );
  if (questionId) {
    run("UPDATE test_questions SET flagged = ? WHERE id = ?", verdict === "approve" ? 0 : 1, questionId);
  }
}

export const reviewsFor = (paperId: string) =>
  all<{ id: string; question_id: string | null; verdict: string; note: string | null; created_at: string; reviewer: string }>(
    `SELECT r.id, r.question_id, r.verdict, r.note, r.created_at, u.full_name AS reviewer
       FROM bank_reviews r JOIN users u ON u.id = r.reviewer_id
      WHERE r.paper_id = ? ORDER BY r.created_at DESC`,
    paperId,
  );

export function setPaperStatus(paperId: string, status: string) {
  run(
    "UPDATE test_papers SET status = ?, published_at = CASE WHEN ? = 'published' THEN ? ELSE published_at END WHERE id = ?",
    status, status, now(), paperId,
  );
}

export const flaggedCount = (paperId: string) =>
  scalar("SELECT COUNT(*) FROM test_questions WHERE paper_id = ? AND flagged = 1", paperId);
