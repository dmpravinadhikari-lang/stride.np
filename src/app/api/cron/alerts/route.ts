import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sweepDeadlines } from "@/modules/checklist/alerts";
import { flushQueue } from "@/lib/email/queue";
import { runAutomations, type Cadence } from "@/lib/email/rules";

/**
 * The scheduled job: reminders out, post flushed.
 *
 * Runs inside the app rather than as a standalone script so it shares exactly
 * the same scheduling code the student sees on screen; a reminder that
 * disagreed with the checklist would be worse than no reminder.
 *
 * On the server, cron calls it:
 *   0 6 * * *  curl -fsS -H "Authorization: Bearer $OFFICEYAK_CRON_SECRET" \
 *                "http://127.0.0.1:3000/api/cron/alerts?run=daily"
 *   0 6 * * 1  ...?run=weekly     (Monday, for the owner's summary)
 *   every 15 minutes ...?run=flush  (just posts what is already written)
 */
export const dynamic = "force-dynamic";

/** Constant time, so the secret cannot be guessed a character at a time. */
function matches(given: string, secret: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const secret = process.env.OFFICEYAK_CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !matches(given, secret)) {
    return new NextResponse("Not authorised", { status: 401 });
  }

  const run = new URL(request.url).searchParams.get("run") ?? "daily";
  if (run === "flush") {
    return NextResponse.json({ ok: true, flushed: await flushQueue() });
  }
  if (run !== "daily" && run !== "weekly") {
    return NextResponse.json({ ok: false, error: "run must be daily, weekly or flush" }, { status: 400 });
  }

  // Deadlines first: a reminder written now goes out in this same run rather
  // than sitting in the queue until tomorrow.
  const swept = run === "daily" ? sweepDeadlines() : null;
  const automations = runAutomations(run as Cadence);
  const flushed = await flushQueue(200);
  return NextResponse.json({ ok: true, run, swept, automations, flushed });
}
