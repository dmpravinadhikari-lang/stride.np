import { all, now, one, readJson, run, scalar, uid, writeJson } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";
import type { AnswerEvaluation, InterviewReport } from "@/modules/ai-interview/types";
import { EMPTY_EVAL, EMPTY_REPORT } from "@/modules/ai-interview/types";

export type Session = {
  id: string; tenant_id: string; user_id: string; kind: string; country: string;
  mode: string; status: string; question_budget: number; report: string | null;
  started_at: string; completed_at: string | null;
};
export type TurnRow = {
  id: string; session_id: string; idx: number; question: string; intent: string | null;
  answer: string | null; score: number | null; evaluation: string | null;
  is_followup: number; created_at: string; answered_at: string | null;
};
export type Turn = Omit<TurnRow, "evaluation"> & { evaluation: AnswerEvaluation | null };

const hydrate = (row: TurnRow): Turn => ({
  ...row,
  evaluation: row.evaluation ? readJson<AnswerEvaluation>(row.evaluation, EMPTY_EVAL) : null,
});

export function listSessions(scope: Scope) {
  return all<Session & { answered: number }>(
    `SELECT s.*, (SELECT COUNT(*) FROM interview_turns t
                   WHERE t.session_id = s.id AND t.answer IS NOT NULL) AS answered
       FROM interview_sessions s
      WHERE s.tenant_id = ? AND s.user_id = ?
      ORDER BY s.started_at DESC`,
    scope.tenantId, scope.userId,
  );
}

export const getSession = (scope: Scope, id: string) =>
  one<Session>(
    "SELECT * FROM interview_sessions WHERE id = ? AND tenant_id = ? AND user_id = ?",
    id, scope.tenantId, scope.userId,
  );

/**
 * An interview this student already started, for the same thing, that they
 * never answered. A double-tap on a slow connection — or a browser replaying
 * the form POST — should land back in that one, not litter the list.
 */
export const unansweredSession = (scope: Scope, kind: string, countryCode: string) =>
  one<Session>(
    `SELECT s.* FROM interview_sessions s
      WHERE s.tenant_id = ? AND s.user_id = ? AND s.kind = ? AND s.country = ?
        AND s.status = 'in_progress'
        AND NOT EXISTS (SELECT 1 FROM interview_turns t
                         WHERE t.session_id = s.id AND t.answer IS NOT NULL)
      ORDER BY s.started_at DESC LIMIT 1`,
    scope.tenantId, scope.userId, kind, countryCode,
  );

export function createSession(
  scope: Scope,
  input: { kind: string; country: string; budget: number },
): string {
  const id = uid();
  run(
    `INSERT INTO interview_sessions
       (id, tenant_id, user_id, kind, country, mode, status, question_budget, started_at)
     VALUES (?,?,?,?,?,'text','in_progress',?,?)`,
    id, scope.tenantId, scope.userId, input.kind, input.country, input.budget, now(),
  );
  return id;
}

export function deleteSession(scope: Scope, id: string) {
  run("DELETE FROM interview_turns WHERE session_id = ? AND tenant_id = ?", id, scope.tenantId);
  run("DELETE FROM interview_sessions WHERE id = ? AND tenant_id = ? AND user_id = ?", id, scope.tenantId, scope.userId);
}

export const listTurns = (scope: Scope, sessionId: string): Turn[] =>
  all<TurnRow>(
    "SELECT * FROM interview_turns WHERE session_id = ? AND tenant_id = ? ORDER BY idx ASC",
    sessionId, scope.tenantId,
  ).map(hydrate);

export const openTurn = (scope: Scope, sessionId: string): Turn | null => {
  const row = one<TurnRow>(
    "SELECT * FROM interview_turns WHERE session_id = ? AND tenant_id = ? AND answer IS NULL ORDER BY idx ASC LIMIT 1",
    sessionId, scope.tenantId,
  );
  return row ? hydrate(row) : null;
};

export function addQuestion(
  scope: Scope, sessionId: string,
  q: { question: string; intent: string; isFollowup: boolean },
): string {
  const idx = scalar("SELECT COALESCE(MAX(idx),0)+1 FROM interview_turns WHERE session_id = ?", sessionId);
  const id = uid();
  run(
    `INSERT INTO interview_turns
       (id, tenant_id, session_id, idx, question, intent, is_followup, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    id, scope.tenantId, sessionId, idx, q.question, q.intent, q.isFollowup ? 1 : 0, now(),
  );
  return id;
}

export function recordAnswer(
  scope: Scope, turnId: string, answer: string, evaluation: AnswerEvaluation,
) {
  run(
    `UPDATE interview_turns
        SET answer = ?, score = ?, evaluation = ?, answered_at = ?
      WHERE id = ? AND tenant_id = ?`,
    answer, Math.round(evaluation.score), writeJson(evaluation), now(), turnId, scope.tenantId,
  );
}

export function completeSession(scope: Scope, sessionId: string, report: InterviewReport) {
  run(
    "UPDATE interview_sessions SET status = 'complete', report = ?, completed_at = ? WHERE id = ? AND tenant_id = ?",
    writeJson(report), now(), sessionId, scope.tenantId,
  );
}

export const reportOf = (session: Session): InterviewReport | null =>
  session.report ? readJson<InterviewReport>(session.report, EMPTY_REPORT) : null;

export const answeredCount = (scope: Scope, sessionId: string) =>
  scalar(
    "SELECT COUNT(*) FROM interview_turns WHERE session_id = ? AND tenant_id = ? AND answer IS NOT NULL",
    sessionId, scope.tenantId,
  );
