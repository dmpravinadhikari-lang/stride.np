import { countTool } from "@/lib/analytics/tools";
import { guard } from "@/lib/security/rate-limit";

/**
 * The only endpoint the free tools call.
 *
 * It takes a tool id and whether the visitor opened or finished, increments a
 * counter, and returns nothing. It reads no cookie, writes no cookie, and
 * stores nothing about the caller. Rate-limited so it cannot be used to
 * inflate the numbers or as a cheap way to hammer the database.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = await guard("count");
  if (!limited.ok) return new Response(null, { status: 429 });

  let body: { tool?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const kind = body.kind === "completed" ? "completed" : "opened";
  if (typeof body.tool !== "string") return new Response(null, { status: 400 });

  countTool(body.tool, kind);
  // 204: there is nothing to say back, and nothing to cache.
  return new Response(null, { status: 204 });
}
