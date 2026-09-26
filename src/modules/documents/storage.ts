import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { documentKey as fileKey } from "@/lib/security/secrets";

/**
 * Files on disk, outside the web root, under data/uploads, and encrypted.
 *
 * Nothing here builds a public URL. Serving a file goes through
 * /api/documents/[id], which checks who is asking before it reads a byte.
 *
 * ENCRYPTED AT REST, BY THE APPLICATION. The disk on the server is encrypted
 * too, but full-disk encryption only protects a machine that is switched off:
 * a stolen backup tarball, a misconfigured rsync, a support engineer with
 * shell access, or a snapshot handed to a hosting company are all cases where
 * the volume is mounted and the passports are readable. So every file is
 * sealed here, with a key that lives in the environment rather than beside the
 * data, and the ciphertext is what touches the filesystem.
 *
 * AES-256-GCM: the tag means a file that has been altered on disk fails to
 * open rather than returning quietly corrupted bytes.
 */
const ROOT = process.env.STRIDE_UPLOAD_DIR || "./data/uploads";

/** "STRIDE" then a version byte, so an older plaintext file is still readable. */
const MAGIC = Buffer.from("STRIDE", "latin1");
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function seal(plain: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", fileKey(), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

export function unseal(stored: Buffer): Buffer {
  // Anything uploaded before this existed is plain, and still opens.
  if (stored.length < MAGIC.length || !stored.subarray(0, MAGIC.length).equals(MAGIC)) return stored;
  const iv = stored.subarray(MAGIC.length, MAGIC.length + IV_BYTES);
  const tag = stored.subarray(MAGIC.length + IV_BYTES, MAGIC.length + IV_BYTES + TAG_BYTES);
  const body = stored.subarray(MAGIC.length + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", fileKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

export const MAX_BYTES = 8 * 1024 * 1024;
/** Ceilings per student, so one account cannot fill the server's disk. */
export const MAX_FILES_PER_STUDENT = 80;
export const MAX_BYTES_PER_STUDENT = 200 * 1024 * 1024;
export const ALLOWED = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic",
]);

export type StoreResult = { path: string; bytes: number };

export async function storeFile(tenantId: string, studentId: string, file: File): Promise<StoreResult> {
  const dir = join(ROOT, tenantId, studentId);
  await mkdir(dir, { recursive: true });
  // The stored name is random: an uploaded filename is untrusted input and has
  // no business deciding a path.
  const name = `${randomUUID()}${extname(file.name).slice(0, 8).toLowerCase()}`;
  const full = join(dir, name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(full, seal(bytes));
  // The size recorded is the real one, so quotas and "2.1 MB" on screen mean
  // what a student would see if they downloaded it.
  return { path: full, bytes: bytes.length };
}

export const readStored = async (path: string): Promise<Buffer> => unseal(await readFile(path));

export async function deleteStored(path: string) {
  try { await unlink(path); } catch { /* already gone is fine */ }
}
