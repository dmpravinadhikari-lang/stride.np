"use server";

import { revalidatePath } from "next/cache";
import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { raiseAlert } from "@/lib/alerts";
import { one } from "@/lib/db";
import { shortDate } from "@/lib/dates";
import { notify } from "@/lib/email/notify";
import { logActivity } from "@/lib/crm/activity";
import { claimTask, completeTask, createTask } from "@/modules/tasks/data";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function addTask(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!isStaff(user.role)) return;

  // The form offers one "Give it to" choice holding either "user:<id>" or
  // "team:<id>". The separate fields are still read for older callers.
  const assign = clean(formData.get("assign"));
  const assigneeId = (assign.startsWith("user:") ? assign.slice(5) : clean(formData.get("assignee_id"))) || null;
  const teamId = (assign.startsWith("team:") ? assign.slice(5) : clean(formData.get("team_id"))) || null;
  const studentId = clean(formData.get("student_id")) || null;
  const title = clean(formData.get("title"));

  // Every id arrives from the browser, so each is checked against this
  // consultancy before a task, or an alert about it, can point at it.
  if (assigneeId && !one("SELECT 1 FROM users WHERE id = ? AND tenant_id = ? AND role <> 'student'", assigneeId, scope.tenantId)) return;
  if (teamId && !one("SELECT 1 FROM teams WHERE id = ? AND tenant_id = ?", teamId, scope.tenantId)) return;
  if (studentId && !one("SELECT 1 FROM users WHERE id = ? AND tenant_id = ? AND role = 'student'", studentId, scope.tenantId)) return;

  const id = createTask(scope, {
    title,
    detail: clean(formData.get("detail")) || null,
    // A task goes to a person or a team, never both, so a team choice wins
    // and the person field is ignored rather than quietly doing both.
    assigneeId: teamId ? null : assigneeId,
    teamId,
    studentId,
    dueOn: clean(formData.get("due_on")) || null,
    priority: clean(formData.get("priority")) || "normal",
  });
  if (!id) return;

  // Tell whoever now owns it. Assigning work to someone who never finds out
  // is the same as not assigning it.
  notify({
    tenantId: scope.tenantId,
    userId: teamId ? null : assigneeId,
    teamId,
    actorId: user.id,
    kind: "task.assigned",
    subject: `New task: ${title.slice(0, 60)}`,
    line: clean(formData.get("due_on"))
      ? `${user.fullName} gave you a task, due ${shortDate(clean(formData.get("due_on")))}: ${title}`
      : `${user.fullName} gave you a task: ${title}`,
    href: "/app/tasks",
    cta: "See your tasks",
    dedupeKey: `task.assigned:${id}`,
  });

  raiseAlert(scope, {
    userId: teamId ? null : assigneeId,
    teamId,
    kind: "task.assigned",
    title: title.slice(0, 120),
    body: clean(formData.get("due_on")) ? `Due ${shortDate(clean(formData.get("due_on")))}` : null,
    href: studentId ? `/app/pipeline/${studentId}` : "/app/tasks",
  });

  if (studentId) {
    logActivity(scope, {
      studentId, actorId: user.id, actorLabel: user.fullName,
      kind: "action.set",
      summary: `Task added: ${title}.`,
    });
    revalidatePath(`/app/pipeline/${studentId}`);
  }
  revalidatePath("/app/tasks");
}

export async function finishTask(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!isStaff(user.role)) return;

  const before = completeTask(scope, clean(formData.get("id")));
  if (before?.student_id) {
    logActivity(scope, {
      studentId: before.student_id, actorId: user.id, actorLabel: user.fullName,
      kind: "action.set",
      summary: `Task done: ${before.title}.`,
    });
    revalidatePath(`/app/pipeline/${before.student_id}`);
  }
  revalidatePath("/app/tasks");
}

export async function takeTask(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!isStaff(user.role)) return;
  claimTask(scope, clean(formData.get("id")));
  revalidatePath("/app/tasks");
}
