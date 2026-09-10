import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import nodemailer from "nodemailer";

/**
 * Email, switched the same way the AI engine is.
 *
 *   outbox, writes the message to data/outbox as a file and marks it sent.
 *             No account, no cost, and you can read exactly what would have
 *             gone out. This is the default while building.
 *   smtp, a real mail server. Needs the SMTP_* settings in .env.local.
 *
 * SMS slots in here later as a third channel without touching any module.
 */
export type Message = { to: string; subject: string; body: string };
export type SendResult = { ok: boolean; detail: string };

export interface EmailProvider {
  id: string;
  label: string;
  health(): Promise<SendResult>;
  send(m: Message): Promise<SendResult>;
}

const outboxProvider: EmailProvider = {
  id: "outbox",
  label: "Local outbox (no mail sent)",
  async health() {
    return { ok: true, detail: "Writes to data/outbox instead of sending. Nothing leaves this machine." };
  },
  async send(m) {
    const dir = join(process.cwd(), "data", "outbox");
    await mkdir(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${m.to.replace(/[^a-z0-9]/gi, "_")}.txt`;
    await writeFile(join(dir, name), `To: ${m.to}\nSubject: ${m.subject}\n\n${m.body}\n`, "utf8");
    return { ok: true, detail: `Written to data/outbox/${name}` };
  },
};

const smtpProvider: EmailProvider = {
  id: "smtp",
  label: "SMTP",
  async health() {
    if (!process.env.SMTP_HOST) return { ok: false, detail: "SMTP_HOST is not set in .env.local." };
    try {
      await transporter().verify();
      return { ok: true, detail: `Connected to ${process.env.SMTP_HOST}.` };
    } catch (e) {
      return { ok: false, detail: `Could not reach ${process.env.SMTP_HOST}: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
  async send(m) {
    try {
      await transporter().sendMail({
        from: process.env.SMTP_FROM || "STRIDE <no-reply@localhost>",
        to: m.to, subject: m.subject, text: m.body,
      });
      return { ok: true, detail: "Sent" };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  },
};

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export const EMAIL_PROVIDERS: Record<string, EmailProvider> = {
  outbox: outboxProvider,
  smtp: smtpProvider,
};

export const activeEmailProvider = (): EmailProvider =>
  EMAIL_PROVIDERS[(process.env.STRIDE_EMAIL_PROVIDER || "outbox").trim()] ?? outboxProvider;
