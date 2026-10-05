import path from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

// SQLite-backed Drizzle client using Bun's built-in sqlite.
//
// Why bun:sqlite (not better-sqlite3): better-sqlite3's native Statement objects
// register Node `AddEnvironmentCleanupHook` cleanup hooks tied to the V8
// environment. Next.js's Turbopack dev server spins up fresh V8 isolates when
// compiling/invalidating server modules, so as soon as the isolate that created
// a Statement is torn down, the destructor trips `Assertion failed: (env) !=
// nullptr` and aborts the whole dev server — even on the FIRST route compile,
// not just HMR. bun:sqlite has no native addon and no env-tied cleanup hooks,
// so it survives Turbopack's isolate churn.
//
// This requires the Next dev server itself to run under Bun (so `bun:sqlite`
// resolves) — see the `dev` script in package.json (`bun --bun next dev`). The
// seed script runs under Bun too (`bun run scripts/seed.ts`).
//
// IMPORTANT: the sandbox's .env ships DATABASE_URL=file:.../db/custom.db for the
// bundled Prisma setup. That path belongs to Prisma — Meridian must NOT write
// into it. We use a dedicated MERIDIAN_DB env var (default ./db/meridian.db)
// and deliberately ignore DATABASE_URL.
const DB_PATH =
  process.env.MERIDIAN_DB?.replace(/^file:/, "") ||
  path.join(process.cwd(), "db", "meridian.db");

const globalForDb = globalThis as typeof globalThis & {
  __meridianSqlite?: Database;
};

function open() {
  const inst = new Database(DB_PATH);
  inst.exec("PRAGMA journal_mode = WAL;");
  inst.exec("PRAGMA foreign_keys = ON;");
  inst.exec("PRAGMA busy_timeout = 5000;");
  return inst;
}

export const sqlite =
  globalForDb.__meridianSqlite ?? (globalForDb.__meridianSqlite = open());

export const db = drizzle(sqlite, { schema });

export function closeDb() {
  sqlite.close();
  globalForDb.__meridianSqlite = undefined;
}
