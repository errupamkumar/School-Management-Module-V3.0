/**
 * SQLite data layer.
 *
 * Runtime: Node's built-in `node:sqlite` (available from Node 22.5). This is a
 * deliberate choice over Prisma for the dev/demo path because it needs no
 * native module compilation and no network access at install time — the
 * original project shipped a fake Prisma client precisely because
 * `prisma generate` could not download its engine binaries.
 *
 * The database is created, migrated and seeded automatically on first access,
 * so `npm run dev` is the only command required to get a working system.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Row = Record<string, any>;
export type Param = string | number | bigint | null | Uint8Array;

/* ------------------------------------------------------------------ */
/* Connection singleton                                                */
/* ------------------------------------------------------------------ */

const DB_FILE =
  process.env.SQLITE_PATH || path.join(process.cwd(), 'prisma', 'dev.db');

// Next.js dev mode re-evaluates modules on hot reload. Caching the handle on
// globalThis prevents opening a new file handle on every edit.
const globalForDb = globalThis as unknown as {
  __vidyalayaDb?: DatabaseSync;
  __vidyalayaReady?: boolean;
};

function assertNodeSqliteAvailable(): void {
  if (typeof DatabaseSync !== 'function') {
    throw new Error(
      `node:sqlite is unavailable on Node ${process.version}. ` +
        `This project's SQLite runtime requires Node 22.5 or newer. ` +
        `Upgrade Node, or switch DATABASE_URL to PostgreSQL and use the Prisma path.`
    );
  }
}

function openDatabase(): DatabaseSync {
  assertNodeSqliteAvailable();

  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

  const database = new DatabaseSync(DB_FILE);

  // WAL keeps readers from blocking on the writer, which matters because
  // Next.js serves many route handlers concurrently.
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA foreign_keys = ON;');
  database.exec('PRAGMA busy_timeout = 5000;');

  return database;
}

/**
 * Returns the live connection, running migration and seeding exactly once per
 * process. Every repository funnels through here, so callers never have to
 * think about initialisation order.
 */
export function getDb(): DatabaseSync {
  if (!globalForDb.__vidyalayaDb) {
    globalForDb.__vidyalayaDb = openDatabase();
  }

  const database = globalForDb.__vidyalayaDb;

  if (!globalForDb.__vidyalayaReady) {
    migrate(database);
    globalForDb.__vidyalayaReady = true;
  }

  return database;
}

function migrate(database: DatabaseSync): void {
  database.exec(SCHEMA_SQL);

  const current = database
    .prepare(`SELECT value FROM _meta WHERE key = 'schemaVersion'`)
    .get() as Row | undefined;

  if (!current) {
    database
      .prepare(`INSERT INTO _meta (key, value) VALUES ('schemaVersion', ?)`)
      .run(String(SCHEMA_VERSION));
  }

  const seeded = database
    .prepare(`SELECT value FROM _meta WHERE key = 'seeded'`)
    .get() as Row | undefined;

  if (!seeded) {
    // Imported lazily so the (large) seed module is not loaded on every boot
    // once the database already has data.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { seedDatabase } = require('./seed') as typeof import('./seed');
    seedDatabase(database);
    database
      .prepare(`INSERT INTO _meta (key, value) VALUES ('seeded', ?)`)
      .run(new Date().toISOString());
  }
}

/* ------------------------------------------------------------------ */
/* Query helpers                                                       */
/* ------------------------------------------------------------------ */

/** Run a query returning every matching row. */
export function all<T = Row>(sql: string, params: Param[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

/** Run a query returning the first row, or undefined. */
export function get<T = Row>(sql: string, params: Param[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

/** Execute a write. Returns rows changed and the last inserted rowid. */
export function run(
  sql: string,
  params: Param[] = []
): { changes: number; lastInsertRowid: number | bigint } {
  const result = getDb().prepare(sql).run(...params);
  return {
    changes: Number(result.changes),
    lastInsertRowid: result.lastInsertRowid,
  };
}

/** Convenience for `SELECT COUNT(*)` style scalars. */
export function count(sql: string, params: Param[] = []): number {
  const row = get<{ c: number }>(sql, params);
  return Number(row?.c ?? 0);
}

/** Convenience for `SELECT SUM(x) AS s` style scalars, coercing NULL to 0. */
export function sum(sql: string, params: Param[] = []): number {
  const row = get<{ s: number | null }>(sql, params);
  return Number(row?.s ?? 0);
}

/**
 * Wrap a set of writes in a transaction. Rolls back on any thrown error, so
 * multi-table operations (admissions, fee collection, marks entry) cannot
 * leave the database half-written.
 */
export function transaction<T>(fn: () => T): T {
  const database = getDb();
  database.exec('BEGIN');
  try {
    const result = fn();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      database.exec('ROLLBACK');
    } catch {
      // A rollback failure must not mask the original error.
    }
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Value coercion                                                      */
/* ------------------------------------------------------------------ */

/** SQLite stores booleans as 0/1. */
export function toBool(value: unknown): boolean {
  return value === 1 || value === true || value === '1';
}

/** Booleans must be written back as integers. */
export function fromBool(value: unknown): number {
  return value ? 1 : 0;
}

/** Parse a JSON TEXT column that stands in for a Postgres array. */
export function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as string[];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Serialise an array for storage. */
export function fromArray(value: string[] | null | undefined): string {
  return JSON.stringify(value ?? []);
}

/* ------------------------------------------------------------------ */
/* Identity & time                                                     */
/* ------------------------------------------------------------------ */

/**
 * Collision-resistant sortable id. Mirrors the shape of Prisma's cuid()
 * closely enough that existing seeded ids and new ids look consistent.
 */
export function cuid(prefix = 'c'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 6);
  return `${prefix}${time}${rand}${rand2}`;
}

/** Current timestamp in the ISO-8601 form used by every TEXT date column. */
export function now(): string {
  return new Date().toISOString();
}

/** Normalise any date-ish input to an ISO string. */
export function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Midnight-anchored date key, used for attendance uniqueness per day. */
export function dateKey(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

/** YYYY-MM-DD for display and <input type="date">. */
export function dayOnly(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
