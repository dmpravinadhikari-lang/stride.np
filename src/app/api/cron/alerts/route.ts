import { NextResponse } from "next/server";
import { sweepDeadlines } from "@/modules/checklist/alerts";
import { flushQueue } from "@/lib/email/queue";

/**
 * The nightly reminder job.
 *
 * Runs inside the app rather than as a standalone script so it shares exactly
 * the same scheduling code the student sees on screen — a reminder that
 * disagreed with the checklist would be worse than no reminder.
 *
 * On the server, cron calls it:
 *   0 6 * * *  curl -fsS -H "Authorization: Bearer $STRIDE_CRON_SECRET" \
 *                http://127.0.0.1:3000/api/cron/alerts
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.STRIDE_CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || given !== secret) {
    return new NextResponse("Not authorised", { status: 401 });
  }

  const swept = sweepDeadlines();
  const flushed = await flushQueue();
  return NextResponse.json({ ok: true, swept, flushed });
}
