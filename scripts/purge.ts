/**
 * Deletes sensitive documents whose retention window has passed.
 *
 *   npm run purge
 *
 * On the Contabo server this runs nightly from cron. It is the enforcement half
 * of the retention decision: financial documents and identity scans disappear
 * 90 days after upload unless the student chose to keep them.
 */
import { DatabaseSync } from "node:sqlite";
import { unlink } from "node:fs/promises";

const db = new DatabaseSync(process.env.OFFICEYAK_DB_PATH || "./data/officeyak.db");
const nowIso = new Date().toISOString();

const due = db.prepare(
  "SELECT id, storage_path, filename FROM documents WHERE keep = 0 AND expires_at IS NOT NULL AND expires_at <= ?",
).all(nowIso) as Array<{ id: string; storage_path: string; filename: string }>;

if (due.length === 0) {
  console.log("Nothing to purge.");
} else {
  for (const doc of due) {
    try { await unlink(doc.storage_path); } catch { /* already gone */ }
    db.prepare("DELETE FROM document_access WHERE document_id = ?").run(doc.id);
    db.prepare("DELETE FROM documents WHERE id = ?").run(doc.id);
    console.log(`purged ${doc.filename}`);
  }
  console.log(`\nDeleted ${due.length} expired document(s).`);
}
