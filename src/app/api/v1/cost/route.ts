import { fail, ok } from "@/lib/api/respond";
import { calculate } from "@/modules/cost/calculate";
import { COST, FX_NPR, RATES_AS_OF, type Level } from "@/modules/cost/data";
import { COUNTRY_CODES, type CountryCode } from "@/lib/countries";

/**
 * Dynamic because this handler reads query parameters. A force-static route
 * handler cannot see them, and silently answers with defaults instead — which
 * looks like it works right up until you check the numbers. Caching is done
 * with a header instead, so the CDN still does its job.
 */
export const dynamic = "force-dynamic";
const CACHE = { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const country = (q.get("country") ?? "AU") as CountryCode;
  if (!COUNTRY_CODES.includes(country)) {
    return fail(400, "unknown_country", `country must be one of ${COUNTRY_CODES.join(", ")}.`);
  }
  const level = (q.get("level") ?? "masters") as Level;

  const result = calculate({
    country, level,
    years: Number(q.get("years") ?? 0) || COST[country].years[level],
    tuition: Number(q.get("tuition") ?? 0) || 0,
    livingBand: (q.get("living") ?? "typical") as "low" | "typical" | "high",
    londonOrEquivalent: q.get("london") === "1",
    savingsNpr: Number(q.get("savingsNpr") ?? 0) || 0,
    sponsorIncomeNpr: Number(q.get("sponsorIncomeNpr") ?? 0) || 0,
    partTime: Number(q.get("partTime") ?? 0) || 0,
  });

  return ok({
    ...result,
    // So a client never has to guess how current the numbers are.
    ratesAsOf: RATES_AS_OF,
    rates: FX_NPR,
  }, { headers: CACHE });
}
