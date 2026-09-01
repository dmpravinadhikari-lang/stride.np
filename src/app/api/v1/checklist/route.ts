import { actorFromRequest } from "@/lib/api/auth";
import { fail, ok, unauthorised } from "@/lib/api/respond";
import { getProfile } from "@/lib/profile";
import { buildSchedule, parseIntake } from "@/modules/checklist/schedule";
import { progressFor, setStatus } from "@/modules/checklist/data";
import { stepById } from "@/modules/checklist/steps";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = actorFromRequest(request);
  if (!actor) return unauthorised();

  const profile = getProfile(actor.userId);
  const intake = parseIntake(profile?.target_intake);
  const schedule = buildSchedule(
    profile?.target_country ?? null, intake, progressFor(actor.scope, actor.userId),
  );

  return ok({
    intake: intake?.toISOString() ?? null,
    done: schedule.filter((s) => s.state === "done").length,
    total: schedule.length,
    steps: schedule.map((s) => ({
      id: s.step.id, title: s.step.title, detail: s.step.detail, phase: s.step.phase,
      href: s.step.href ?? null, warning: s.step.warning ?? null,
      dueOn: s.dueOn?.toISOString() ?? null, startBy: s.startBy?.toISOString() ?? null,
      status: s.status, state: s.state, daysLeft: s.daysLeft,
    })),
  });
}

export async function POST(request: Request) {
  const actor = actorFromRequest(request);
  if (!actor) return unauthorised();

  let body: { stepId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "Send JSON with a stepId and a status.");
  }
  const stepId = body.stepId ?? "";
  const status = body.status ?? "";
  if (!stepById(stepId)) return fail(400, "unknown_step", "That step does not exist.");
  if (!["todo", "doing", "done", "skipped"].includes(status)) {
    return fail(400, "bad_status", "Status must be todo, doing, done or skipped.");
  }

  setStatus(actor.scope, actor.userId, stepId, status);
  return ok({ stepId, status });
}
