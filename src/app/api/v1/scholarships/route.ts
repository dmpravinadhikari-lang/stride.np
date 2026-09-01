import { ok } from "@/lib/api/respond";
import { SCHOLARSHIPS } from "@/modules/finder/scholarships";

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
  const country = q.get("country");
  const level = q.get("level");

  const list = SCHOLARSHIPS
    .filter((s) => !country || s.countries.includes(country as never))
    .filter((s) => !level || s.levels.includes(level as never));

  return ok({ total: list.length, scholarships: list }, { headers: CACHE });
}
