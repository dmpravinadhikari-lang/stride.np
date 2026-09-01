import { activeProvider } from "@/lib/ai/provider";
import { extractJson } from "@/lib/ai/json";
import type { AiTask } from "@/lib/ai/types";
import { allowanceFor, logUsage, OutOfCreditsError } from "@/lib/usage";
import type { Scope } from "@/lib/db/scope";
import { one } from "@/lib/db";
import { guard } from "@/lib/security/rate-limit";

/**
 * The only way a module is allowed to use AI.
 *
 * Checks the allowance, calls whichever provider is switched on, records what
 * it cost, and hands back the answer. Nothing is metered twice and nothing
 * escapes the meter.
 */
export async function runAi(
  scope: Scope,
  task: AiTask,
  credits: number,
): Promise<{ text: string; provider: string }> {
  const ctx = one<{ kind: string; plan: string; student_plan: string | null }>(
    `SELECT t.kind, t.plan, u.student_plan
       FROM tenants t JOIN users u ON u.tenant_id = t.id
      WHERE u.id = ?`,
    scope.userId,
  );

  const budget = allowanceFor({
    tenantId: scope.tenantId,
    tenantKind: ctx?.kind ?? "consultancy",
    tenantPlan: ctx?.plan ?? "starter",
    userId: scope.userId,
    studentPlan: ctx?.student_plan ?? null,
  });

  if (budget.remaining < credits) {
    throw new OutOfCreditsError(budget.used, budget.allowance);
  }

  // The credit ceiling caps the month; this caps the hour, so a runaway script
  // or a stuck retry loop cannot burn a branch's whole allowance in minutes.
  const paced = await guard("aiAction", scope.userId);
  if (!paced.ok) throw new Error(paced.message);

  const provider = activeProvider();
  try {
    const result = await provider.complete(task);
    logUsage(scope, { module: task.module, action: task.action, credits, ok: true }, result);
    return { text: result.text, provider: result.provider };
  } catch (error) {
    logUsage(
      scope,
      { module: task.module, action: task.action, credits, ok: false },
      { provider: provider.id },
    );
    throw error;
  }
}

/** Same, for the common case where the module wants structured data back. */
export async function runAiJson<T>(
  scope: Scope,
  task: AiTask,
  credits: number,
  fallback: T,
): Promise<T> {
  const { text } = await runAi(scope, { ...task, json: true }, credits);
  return extractJson<T>(text, fallback);
}
