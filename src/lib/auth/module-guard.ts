import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { studentMayOpen } from "@/lib/modules/entitlements";
import { moduleById } from "@/lib/modules/registry";

/**
 * The guard every member-only page runs before it renders.
 *
 * Hiding a link is presentation, not security. A student who has had the mock
 * interview switched off can still type /app/interview, and a page that only
 * checked the sidebar would happily serve it — and bill the consultancy for
 * the AI call. This is the check that actually decides.
 *
 * Staff are not subject to per-student switches: a counsellor has to be able
 * to open a tool to see what their student sees.
 */
export async function requireModule(moduleId: string) {
  const user = await requireUser();
  const mod = moduleById(moduleId);

  if (!mod) redirect("/app");
  if (!mod.roles.includes(user.role)) redirect("/app");

  if (isStaff(user.role)) return user;

  if (!studentMayOpen(moduleId, user.id, user.tenantId, user.tenantPlan)) {
    // Back to the dashboard with an explanation, rather than a bare 404 that
    // reads like a broken site. Their consultancy controls this, so the
    // message says so.
    redirect(`/app?unavailable=${encodeURIComponent(moduleId)}`);
  }

  return user;
}
