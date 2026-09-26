/**
 * Refuses to start a server that is configured wrongly.
 *
 *   npm run preflight
 *
 * systemd runs this before the app, so a box missing one line of its
 * environment file fails in the first second with a sentence saying which
 * line, instead of coming up and serving a product whose documents are sealed
 * with a key published in the source.
 *
 * The rule for what belongs here: anything that is silently survivable but
 * seriously wrong. A missing session secret is not survivable and already
 * throws; a missing SMTP host is survivable, so it is a warning and the mail
 * simply waits in the queue.
 */
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";

type Check = { name: string; state: "ok" | "warn" | "fail"; detail: string };

/*
 * On a laptop the environment lives in .env.local, which Next loads for
 * itself; run on its own this script would see none of it and report every
 * key as missing. On the server systemd passes the environment file directly
 * and there is nothing here to load.
 */
try { process.loadEnvFile?.(".env.local"); } catch { /* there may not be one */ }

const checks: Check[] = [];
const ok = (name: string, detail: string) => checks.push({ name, state: "ok", detail });
const warn = (name: string, detail: string) => checks.push({ name, state: "warn", detail });
const fail = (name: string, detail: string) => checks.push({ name, state: "fail", detail });

const production = process.env.NODE_ENV === "production";
const env = (k: string) => process.env[k]?.trim() ?? "";

/* --------------------------------------------------------------- secrets */

function base64Key(name: string, why: string) {
  const raw = env(name);
  if (!raw) {
    (production ? fail : warn)(name, `Not set. ${why} Generate one: openssl rand -base64 32`);
    return;
  }
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length !== 32) {
    fail(name, `Must decode to 32 bytes, this one is ${bytes.length}. Generate one: openssl rand -base64 32`);
    return;
  }
  ok(name, "32 bytes, good");
}

const session = env("STRIDE_SESSION_SECRET");
if (!session) {
  (production ? fail : warn)(
    "STRIDE_SESSION_SECRET",
    "Not set. Every session cookie would be signed with a key published in the source.",
  );
} else if (session.length < 24) {
  fail("STRIDE_SESSION_SECRET", `Only ${session.length} characters. Use at least 24: openssl rand -base64 32`);
} else if (session === "dev-only-secret") {
  fail("STRIDE_SESSION_SECRET", "This is the development fallback, and it is in a public repository.");
} else {
  ok("STRIDE_SESSION_SECRET", `${session.length} characters`);
}

base64Key("STRIDE_FILE_KEY", "Documents would be sealed with a key derived from the session secret.");
base64Key("STRIDE_BACKUP_KEY", "Backups would be sealed with a key derived from the session secret.");

const cron = env("STRIDE_CRON_SECRET");
if (!cron) {
  (production ? fail : warn)("STRIDE_CRON_SECRET", "Not set, so the scheduled jobs cannot authenticate and no email will ever go out.");
} else if (cron.length < 16) {
  fail("STRIDE_CRON_SECRET", "Too short to be worth having. Use at least 16 characters.");
} else {
  ok("STRIDE_CRON_SECRET", "set");
}

/* ------------------------------------------------------------- addresses */

const root = env("STRIDE_ROOT_DOMAIN");
if (!root) {
  (production ? fail : warn)("STRIDE_ROOT_DOMAIN", "Not set. Server Actions check the Origin header against it, and every consultancy's subdomain is built from it.");
} else if (root.startsWith("http")) {
  fail("STRIDE_ROOT_DOMAIN", `Give the host only, not a URL: ${root.replace(/^https?:\/\//, "")}`);
} else {
  ok("STRIDE_ROOT_DOMAIN", root);
}

/* ------------------------------------------------------------- the disks */

function writable(label: string, path: string, kind: "dir" | "file") {
  const dir = kind === "dir" ? path : dirname(path);
  try {
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, `.preflight-${process.pid}`);
    writeFileSync(probe, "x");
    unlinkSync(probe);
    ok(label, `${dir} is writable`);
  } catch (e) {
    fail(label, `Cannot write to ${dir}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const dbPath = env("STRIDE_DB_PATH") || "./data/stride.db";
writable("Database directory", dbPath, "file");
writable("Uploads directory", env("STRIDE_UPLOAD_DIR") || "./data/uploads", "dir");
writable("Backup directory", env("STRIDE_BACKUP_DIR") || "./data/backups", "dir");

if (production && !existsSync(dbPath)) {
  warn("Database", `${dbPath} does not exist yet. It is created on first boot, with an empty consultancy list.`);
}

/* ----------------------------------------------------------------- email */

const provider = env("STRIDE_EMAIL_PROVIDER") || "outbox";
if (provider === "outbox") {
  (production ? fail : warn)(
    "STRIDE_EMAIL_PROVIDER",
    "Set to outbox, which writes messages to a folder instead of sending them. Students would never receive their sign-in details. Use smtp.",
  );
} else if (provider === "smtp") {
  if (!env("SMTP_HOST")) fail("SMTP_HOST", "The mailer is set to smtp and there is no host to talk to.");
  else if (!env("SMTP_FROM")) warn("SMTP_FROM", "No from address, so messages go out as no-reply@localhost and will be treated as spam.");
  else ok("Email", `smtp via ${env("SMTP_HOST")}, from ${env("SMTP_FROM")}`);
} else {
  fail("STRIDE_EMAIL_PROVIDER", `Unknown value "${provider}". Use smtp or outbox.`);
}

/* -------------------------------------------------------------------- AI */

const ai = env("STRIDE_AI_PROVIDER") || "sample";
if (ai === "sample") {
  warn("STRIDE_AI_PROVIDER", "Set to sample, so the practice tools answer with canned text. Fine for a demo, wrong for customers.");
} else if (ai === "anthropic-api" && !env("ANTHROPIC_API_KEY")) {
  fail("ANTHROPIC_API_KEY", "The AI provider is anthropic-api and there is no key, so every practice tool will fail.");
} else {
  ok("STRIDE_AI_PROVIDER", ai);
}

/* ------------------------------------------------------------------ node */

const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  fail("Node", `This needs Node 22 or newer for node:sqlite, and this is ${process.versions.node}.`);
} else {
  ok("Node", process.versions.node);
}

/* ---------------------------------------------------------------- report */

const pad = (s: string) => s.padEnd(26);
const failures = checks.filter((c) => c.state === "fail");
const warnings = checks.filter((c) => c.state === "warn");

console.log(`\nSTRIDE preflight, NODE_ENV=${process.env.NODE_ENV ?? "unset"}\n`);
for (const c of checks) {
  const mark = c.state === "ok" ? "  ok  " : c.state === "warn" ? " warn " : " FAIL ";
  console.log(`${mark} ${pad(c.name)} ${c.detail}`);
}

console.log(
  `\n${checks.length - failures.length - warnings.length} fine, ${warnings.length} to look at, ${failures.length} stopping the server.\n`,
);

if (failures.length) {
  console.error("Not starting. Fix the lines marked FAIL in the environment file, then try again.\n");
  process.exit(1);
}
if (warnings.length && production) {
  console.log("Starting anyway. The warnings above are survivable, but somebody should read them.\n");
}
