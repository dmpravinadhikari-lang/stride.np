import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * One database connection for the whole app.
 *
 * Next.js reloads modules constantly while you develop, so the connection is
 * parked on globalThis — otherwise every code change would open another handle
 * to the same file and eventually run out.
 */
const g = globalThis as unknown as { __strideDb?: DatabaseSync };

function open(): DatabaseSync {
  const path = process.env.STRIDE_DB_PATH || "./data/stride.db";

  // SQLite will happily create a missing *file*, but not a missing *directory*
  // — it fails with "unable to open database file", which then surfaces as a
  // 500 on every page at once and says nothing about the actual cause.
  // Creating the directory turns a confusing outage into a clean empty start.
  try {
    mkdirSync(dirname(path), { recursive: true });
  } catch {
    // If the directory cannot be created, the DatabaseSync call below throws
    // with a message that is now genuinely about permissions.
  }

  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8"));
  addColumns(db);
  return db;
}

/**
 * Columns added after a table already existed.
 *
 * schema.sql runs on every start and uses CREATE TABLE IF NOT EXISTS, which
 * cannot add a column to a table that is already there. SQLite has no
 * ADD COLUMN IF NOT EXISTS either, so each one is checked first. Adding a
 * column later means adding a line here.
 */
function addColumns(db: DatabaseSync) {
  const additions: Array<[table: string, column: string, definition: string]> = [
    ["users", "google_sub", "TEXT"],
    ["users", "avatar_url", "TEXT"],
    ["users", "auth_method", "TEXT NOT NULL DEFAULT 'password'"],
  ];
  for (const [table, column, definition] of additions) {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (existing.some((c) => c.name === column)) continue;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_sub) WHERE google_sub IS NOT NULL");
}

export function db(): DatabaseSync {
  if (!g.__strideDb) g.__strideDb = open();
  return g.__strideDb;
}

type Param = string | number | null;

/**
 * node:sqlite hands back objects with a null prototype. React refuses to send
 * those from a server component to a client component, so every row is copied
 * into a plain object here — once, at the boundary, rather than at each call
 * site where it would eventually be forgotten.
 */
const plain = <T,>(row: unknown): T => ({ ...(row as object) }) as T;

/** Every row matching the query. */
export function all<T = Record<string, unknown>>(sql: string, ...params: Param[]): T[] {
  return db().prepare(sql).all(...params).map((r) => plain<T>(r));
}

/** The first row, or null. */
export function one<T = Record<string, unknown>>(sql: string, ...params: Param[]): T | null {
  const row = db().prepare(sql).get(...params);
  return row === undefined || row === null ? null : plain<T>(row);
}

/** Insert / update / delete. */
export function run(sql: string, ...params: Param[]): void {
  db().prepare(sql).run(...params);
}

/** A single number out of a COUNT/SUM query. */
export function scalar(sql: string, ...params: Param[]): number {
  const row = one<Record<string, unknown>>(sql, ...params);
  if (!row) return 0;
  const v = Object.values(row)[0];
  return typeof v === "number" ? v : Number(v ?? 0);
}

export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/** Columns holding JSON are TEXT here and jsonb on PostgreSQL later. */
export function readJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
export const writeJson = (value: unknown) => JSON.stringify(value ?? null);
