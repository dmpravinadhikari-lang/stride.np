import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Files on disk, outside the web root, under data/uploads.
 *
 * Nothing here builds a public URL. Serving a file goes through
 * /app/api/documents/[id], which checks who is asking before it reads a byte.
 * On the Contabo server this same layout sits on an encrypted volume.
 */
const ROOT = process.env.STRIDE_UPLOAD_DIR || "./data/uploads";

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
  await writeFile(full, bytes);
  return { path: full, bytes: bytes.length };
}

export const readStored = (path: string) => readFile(path);

export async function deleteStored(path: string) {
  try { await unlink(path); } catch { /* already gone is fine */ }
}
