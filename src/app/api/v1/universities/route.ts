import { ok } from "@/lib/api/respond";
import { UNIVERSITIES, ALL_FIELDS } from "@/modules/finder/universities";
import { matchUniversities } from "@/modules/finder/match";
import type { Level } from "@/modules/cost/data";

/**
 * Dynamic because this handler reads query parameters. A force-static route
 * handler cannot see them, and silently answers with defaults instead, which
 * looks like it works right up until you check the numbers. Caching is done
 * with a header instead, so the CDN still does its job.
 */
export const dynamic = "force-dynamic";
const CACHE = { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const criteria = {
    country: q.get("country") ?? "",
    level: (q.get("level") ?? "masters") as Level,
    field: q.get("field") ?? "",
    budgetNpr: Number(q.get("budgetNpr") ?? 0) || 0,
    ielts: Number(q.get("ielts") ?? 0) || 0,
    percent: Number(q.get("percent") ?? 0) || 0,
  };

  const matches = matchUniversities(UNIVERSITIES, criteria);
  // `total` sitting beside a filtered list reads as "76 results" to whoever
  // writes the client. Name both numbers for what they actually are.
  return ok({
    catalogueSize: UNIVERSITIES.length,
    matched: matches.length,
    criteria,
    fields: ALL_FIELDS,
    matches: matches.map((m) => ({
      id: m.uni.id, name: m.uni.name, city: m.uni.city, country: m.uni.country,
      fields: m.uni.fields, intakes: m.uni.intakes, site: m.uni.site,
      tuitionLow: m.uni.tuitionLow, tuitionHigh: m.uni.tuitionHigh,
      ielts: m.uni.ielts, minPercent: m.uni.minPercent,
      verdict: m.verdict, score: m.score, reasons: m.reasons, blockers: m.blockers,
    })),
  }, { headers: CACHE });
}
