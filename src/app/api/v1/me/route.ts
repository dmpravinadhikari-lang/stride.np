import { actorFromRequest } from "@/lib/api/auth";
import { ok, unauthorised } from "@/lib/api/respond";
import { one } from "@/lib/db";
import { allowanceFor } from "@/lib/usage";
import { getProfile, profileCompleteness } from "@/lib/profile";
import { capabilitiesOf } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = actorFromRequest(request);
  if (!actor) return unauthorised();

  const tenant = one<{ name: string; plan: string; kind: string }>(
    "SELECT name, plan, kind FROM tenants WHERE id = ?", actor.scope.tenantId,
  );
  const studentPlan = one<{ student_plan: string | null }>(
    "SELECT student_plan FROM users WHERE id = ?", actor.userId,
  )?.student_plan ?? null;

  const budget = allowanceFor({
    tenantId: actor.scope.tenantId, tenantKind: tenant?.kind ?? "consultancy",
    tenantPlan: tenant?.plan ?? "starter", userId: actor.userId, studentPlan,
  });
  const profile = getProfile(actor.userId);

  return ok({
    user: { id: actor.userId, name: actor.fullName, email: actor.email, role: actor.role },
    tenant: { name: tenant?.name ?? "", plan: tenant?.plan ?? "", kind: tenant?.kind ?? "" },
    // The app renders its own navigation from these rather than guessing.
    can: capabilitiesOf(actor.role),
    credits: { remaining: budget.remaining, allowance: budget.allowance, scope: budget.scopeLabel },
    profile: profile
      ? {
          targetCountry: profile.target_country, studyLevel: profile.study_level,
          intendedCourse: profile.intended_course, targetIntake: profile.target_intake,
          completeness: profileCompleteness(profile).pct,
        }
      : null,
  });
}
