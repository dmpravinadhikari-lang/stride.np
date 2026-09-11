"use server";

import { revalidatePath } from "next/cache";
import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { raiseAlert } from "@/lib/alerts";
import { logActivity } from "@/lib/crm/activity";
import { claimTask, completeTask, createTask } from "@/modules/tasks/data";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function addTask(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!isStaff(user.role)) return;

  const assigneeId = clean(formData.get("assignee_id")) || null;
  const teamId = clean(formData.get("team_id")) || null;
  const studentId = clean(formData.get("student_id")) || null;
  const title = clean(formData.get("title"));

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
  raiseAlert(scope, {
    userId: teamId ? null : assigneeId,
    teamId,
    kind: "task.assigned",
    title: title.slice(0, 120),
    body: clean(formData.get("due_on")) ? `Due ${clean(formData.get("due_on"))}` : null,
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
