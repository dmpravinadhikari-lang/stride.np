import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * SMS, switched exactly the way email and the AI engine are.
 *
 *   outbox   writes the message to data/outbox-sms and marks it sent. No
 *            account, no cost, and you can read what would have gone out.
 *            The default while building.
 *   sparrow  Sparrow SMS, the established Nepali gateway. Routed for both NTC
 *            and Ncell. Needs SPARROW_TOKEN and SPARROW_FROM.
 *
 * Two things about SMS in Nepal that are easy to discover too late:
 *
 *  - The sender ID has to be registered with the operators before anything
 *    sends. An unregistered identity is rejected, not queued.
 *  - Every message costs money, around NPR 1.40. Unlike email there is no free
 *    tier to fall back on, so a runaway loop is a bill rather than a warning.
 *    The queue caps what one branch can send in an hour for that reason.
 */

export type Sms = { to: string; body: string };
export type SmsResult = { ok: boolean; detail: string };

export interface SmsProvider {
  id: string;
  label: string;
  health(): Promise<SmsResult>;
  send(m: Sms): Promise<SmsResult>;
}

/**
 * Nepali mobile numbers, normalised to what a gateway expects.
 *
 * People type 98xxxxxxxx, +977 98xxxxxxxx, 0098..., and with spaces and
 * dashes. All of those are the same phone.
 */
export function normaliseNepaliNumber(raw: string): string | null {
  const digits = String(raw ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  // Strip a country code however it was written.
  let n = digits;
  if (n.startsWith("00977")) n = n.slice(5);
  else if (n.startsWith("977") && n.length > 10) n = n.slice(3);
  // A Nepali mobile is ten digits starting 97 or 98.
  if (n.length === 10 && /^9[678]/.test(n)) return n;
  return null;
}

const outboxProvider: SmsProvider = {
  id: "outbox",
  label: "Local outbox (no SMS sent)",
  async health() {
    return { ok: true, detail: "Writes to data/outbox-sms instead of sending. Nothing leaves this machine and nothing is charged." };
  },
  async send(m) {
    const dir = join(process.cwd(), "data", "outbox-sms");
    await mkdir(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${m.to}.txt`;
    await writeFile(join(dir, name), `To: ${m.to}\n\n${m.body}\n`, "utf8");
    return { ok: true, detail: `Written to data/outbox-sms/${name}` };
  },
};

const sparrowProvider: SmsProvider = {
  id: "sparrow",
  label: "Sparrow SMS",
  async health() {
    if (!process.env.SPARROW_TOKEN) {
      return { ok: false, detail: "SPARROW_TOKEN is not set, so nothing can send." };
    }
    if (!process.env.SPARROW_FROM) {
      return { ok: false, detail: "SPARROW_FROM is not set. This is the sender identity, and it must be registered with NTC and Ncell before it will deliver." };
    }
    return { ok: true, detail: `Sending as ${process.env.SPARROW_FROM}.` };
  },
  async send(m) {
    const to = normaliseNepaliNumber(m.to);
    if (!to) return { ok: false, detail: `${m.to} is not a Nepali mobile number.` };

    const body = new URLSearchParams({
      token: process.env.SPARROW_TOKEN ?? "",
      from: process.env.SPARROW_FROM ?? "",
      to,
      text: m.body,
    });

    try {
      const res = await fetch("https://api.sparrowsms.com/v2/sms/", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(20000),
      });
      const text = await res.text();
      if (!res.ok) return { ok: false, detail: `Sparrow returned ${res.status}: ${text.slice(0, 160)}` };
      return { ok: true, detail: text.slice(0, 160) };
    } catch (e) {
      return { ok: false, detail: `Could not reach Sparrow: ${String((e as Error).message).slice(0, 120)}` };
    }
  },
};

export const SMS_PROVIDERS: Record<string, SmsProvider> = {
  outbox: outboxProvider,
  sparrow: sparrowProvider,
};

export function activeSmsProvider(): SmsProvider {
  return SMS_PROVIDERS[process.env.OFFICEYAK_SMS_PROVIDER ?? "outbox"] ?? outboxProvider;
}
