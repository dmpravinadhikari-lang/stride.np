/** Deletes the local database so `npm run setup` can start clean. */
import { rmSync } from "node:fs";
const path = process.env.STRIDE_DB_PATH || "./data/stride.db";
for (const f of [path, `${path}-wal`, `${path}-shm`]) {
  try { rmSync(f); console.log(`removed ${f}`); } catch { /* not there */ }
}
console.log("Done. Run `npm run setup` to rebuild it.");
