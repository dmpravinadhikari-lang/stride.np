/**
 * A backup you can actually restore, encrypted before it leaves the machine.
 *
 *   npm run backup                  writes data/backups/stride-<stamp>.tar.gz.enc
 *   npm run backup -- --restore <file> --out <dir>
 *
 * Why it is written rather than left to a hosting panel's snapshot:
 *
 *   A snapshot is the whole disk, taken by somebody else, kept somewhere we do
 *   not control, and restoring it means restoring the machine. This takes the
 *   two things that matter, the database and the uploaded documents, seals
 *   them with the same class of key the product uses, and leaves a file small
 *   enough to copy off the server every night.
 *
 *   It is encrypted here, not after upload, because a backup is the most
 *   attractive single object in the whole system: one file with every
 *   passport in it. Anything that copies it, an rsync, a cloud bucket, a USB
 *   stick, then holds ciphertext.
 *
 * The key comes from STRIDE_BACKUP_KEY (base64, 32 bytes). Losing it loses the
 * backups, which is the trade every honest encrypted backup makes. Keep it
 * somewhere that is not the server.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip, createGunzip } from "node:zlib";
import { spawn } from "node:child_process";
import { join } from "node:path";

const DB = process.env.STRIDE_DB_PATH || "./data/stride.db";
const UPLOADS = process.env.STRIDE_UPLOAD_DIR || "./data/uploads";
const OUT_DIR = process.env.STRIDE_BACKUP_DIR || "./data/backups";

function key(): Buffer {
  const raw = process.env.STRIDE_BACKUP_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("STRIDE_BACKUP_KEY must be 32 bytes, base64 encoded");
    return k;
  }
  console.warn("! STRIDE_BACKUP_KEY is not set. Deriving one from STRIDE_SESSION_SECRET.");
  console.warn("! That is fine on a laptop and wrong on a server: set a real key there.");
  return scryptSync(process.env.STRIDE_SESSION_SECRET || "dev-only-secret", "stride-backups", 32);
}

/** tar the two directories that hold everything a consultancy would miss. */
function tarStream(): NodeJS.ReadableStream {
  const parts = [DB, `${DB}-wal`, `${DB}-shm`, UPLOADS].filter((p) => existsSync(p));
  const child = spawn("tar", ["-cf", "-", ...parts], { stdio: ["ignore", "pipe", "inherit"] });
  return child.stdout;
}

/**
 * Backups do not pile up for ever.
 *
 * The privacy policy tells customers their data is gone from the backups
 * within ninety days of their account closing. That is only true if something
 * actually removes the old ones, so this does, and the number here is the
 * number published there.
 */
const KEEP_DAYS = Number(process.env.STRIDE_BACKUP_KEEP_DAYS || 90);

function prune() {
  if (!existsSync(OUT_DIR)) return 0;
  const cutoff = Date.now() - KEEP_DAYS * 864e5;
  let gone = 0;
  for (const name of readdirSync(OUT_DIR)) {
    if (!name.endsWith(".tar.gz.enc")) continue;
    const full = join(OUT_DIR, name);
    if (statSync(full).mtimeMs < cutoff) { unlinkSync(full); gone += 1; }
  }
  return gone;
}

async function backup() {
  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = join(OUT_DIR, `stride-${stamp}.tar.gz.enc`);

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const file = createWriteStream(out);
  // The header is the IV; the tag is appended once the stream is finished,
  // which is the only order GCM allows.
  file.write(Buffer.from("STRIDEBK", "latin1"));
  file.write(iv);

  await pipeline(tarStream(), createGzip({ level: 6 }), cipher, file, { end: false });
  file.write(cipher.getAuthTag());
  file.end();

  await new Promise((r) => file.on("close", r));
  const size = statSync(out).size;
  const gone = prune();
  console.log(`Backup written: ${out} (${(size / 1e6).toFixed(1)} MB, encrypted)`);
  if (gone) console.log(`Removed ${gone} backup${gone === 1 ? "" : "s"} older than ${KEEP_DAYS} days.`);
  console.log("Copy it off this machine tonight. A backup on the same disk is not a backup.");
}

async function restore(file: string, dir: string) {
  if (!existsSync(file)) throw new Error(`No such backup: ${file}`);
  mkdirSync(dir, { recursive: true });

  const size = statSync(file).size;
  const headerBytes = 9 + 12;         // magic + iv
  const tagStart = size - 16;

  const header = await read(file, 0, headerBytes);
  const tag = await read(file, tagStart, 16);
  const iv = header.subarray(9);

  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);

  const child = spawn("tar", ["-xf", "-", "-C", dir], { stdio: ["pipe", "inherit", "inherit"] });
  await pipeline(
    createReadStream(file, { start: headerBytes, end: tagStart - 1 }),
    decipher,
    createGunzip(),
    child.stdin,
  );
  console.log(`Restored into ${dir}. Check it before pointing the app at it.`);
}

function read(path: string, start: number, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    createReadStream(path, { start, end: start + length - 1 })
      .on("data", (c) => chunks.push(c as Buffer))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject);
  });
}

const args = process.argv.slice(2);
const at = (flag: string) => {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1] ?? null;
};

const toRestore = at("--restore");
(toRestore
  ? restore(toRestore, at("--out") ?? "./data/restored")
  : backup()
).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
