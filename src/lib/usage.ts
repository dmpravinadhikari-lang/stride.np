import { all, now, run, scalar, uid } from "@/lib/db";
import { planOf } from "@/lib/plans";
import type { Scope } from "@/lib/db/scope";
import type { AiResult } from "@/lib/ai/types";

/** Credits reset on the first of each month. */
export function periodStart(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export class OutOfCreditsError extends Error {
  constructor(public used: number, public allowance: number) {
    super(`This month's AI allowance is used up (${used} of ${allowance} credits).`);
    this.name = "OutOfCreditsError";
  }
}

export type Allowance = {
  used: number;
  allowance: number;
  remaining: number;
  costUsd: number;
  calls: number;
  scopeLabel: string;
};

/**
 * Consultancies get one pooled allowance for the whole branch. Direct students
 * get their own, because there is no branch to pool with.
 */
export function allowanceFor(opts: {
  tenantId: string;
  tenantKind: string;
  tenantPlan: string;
  userId: string;
  studentPlan: string | null;
}): Allowance {
  const since = periodStart();

  // Credits belong to the consultancy, not the individual. Everyone using
  // STRIDE now does so through a branch, so the whole branch draws on one
  // monthly allowance and an owner sees a single number rather than having to
  // add up their students.
  const plan = planOf(opts.tenantPlan);
  const where = "tenant_id = ?";
  const key = opts.tenantId;

  const used = scalar(
    `SELECT COALESCE(SUM(credits),0) FROM usage_events WHERE ${where} AND created_at >= ? AND ok = 1`,
    key, since,
  );
  const costUsd = scalar(
    `SELECT COALESCE(SUM(est_cost_usd),0) FROM usage_events WHERE ${where} AND created_at >= ?`,
    key, since,
  );
  const calls = scalar(
    `SELECT COUNT(*) FROM usage_events WHERE ${where} AND created_at >= ?`,
    key, since,
  );

  const allowance = plan.monthlyCredits;
  return {
    used,
    allowance,
    remaining: Math.max(0, allowance - used),
    costUsd,
    calls,
    scopeLabel: "this branch",
  };
}

export function logUsage(
  scope: Scope,
  entry: { module: string; action: string; credits: number; ok: boolean },
  result: Partial<AiResult>,
) {
  run(
    `INSERT INTO usage_events
       (id, tenant_id, user_id, module_id, action, credits, provider, model,
        input_tokens, output_tokens, est_cost_usd, ok, ms, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    uid(), scope.tenantId, scope.userId, entry.module, entry.action,
    entry.ok ? entry.credits : 0,
    result.provider ?? "unknown", result.model ?? null,
    result.inputTokens ?? 0, result.outputTokens ?? 0,
    result.estCostUsd ?? 0, entry.ok ? 1 : 0, result.ms ?? 0, now(),
  );
}

export type UsageRow = {
  module_id: string;
  action: string;
  credits: number;
  est_cost_usd: number;
  provider: string;
  created_at: string;
  full_name: string;
};

export function recentUsage(tenantId: string, limit = 25): UsageRow[] {
  return all<UsageRow>(
    `SELECT e.module_id, e.action, e.credits, e.est_cost_usd, e.provider, e.created_at,
            u.full_name
       FROM usage_events e JOIN users u ON u.id = e.user_id
      WHERE e.tenant_id = ?
      ORDER BY e.created_at DESC
      LIMIT ?`,
    tenantId, limit,
  );
}
