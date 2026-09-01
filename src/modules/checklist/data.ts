import { all, now, one, run, uid } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";

export type ProgressRow = { step_id: string; status: string; due_on: string | null; note: string | null };

export const progressFor = (scope: Scope, studentId: string) =>
  new Map(
    all<ProgressRow>(
      "SELECT step_id, status, due_on, note FROM checklist_items WHERE student_id = ? AND tenant_id = ?",
      studentId, scope.tenantId,
    ).map((r) => [r.step_id, r]),
  );

export function setStatus(scope: Scope, studentId: string, stepId: string, status: string) {
  const existing = one<{ id: string }>(
    "SELECT id FROM checklist_items WHERE student_id = ? AND step_id = ?", studentId, stepId,
  );
  const doneAt = status === "done" ? now() : null;
  if (existing) {
    run(
      "UPDATE checklist_items SET status = ?, done_at = ?, updated_at = ? WHERE id = ?",
      status, doneAt, now(), existing.id,
    );
    return;
  }
  run(
    `INSERT INTO checklist_items (id, tenant_id, student_id, step_id, status, done_at, updated_at)
     VALUES (?,?,?,?,?,?,?)`,
    uid(), scope.tenantId, studentId, stepId, status, doneAt, now(),
  );
}

export const doneCount = (scope: Scope, studentId: string) =>
  all<{ n: number }>(
    "SELECT COUNT(*) AS n FROM checklist_items WHERE student_id = ? AND tenant_id = ? AND status IN ('done','skipped')",
    studentId, scope.tenantId,
  )[0]?.n ?? 0;
