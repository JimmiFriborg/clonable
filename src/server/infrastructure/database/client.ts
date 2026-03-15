import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "@/server/infrastructure/database/schema";

export type AppDatabase = BetterSQLite3Database<typeof schema>;
const MIGRATION_LOCK_TIMEOUT_MS = 30_000;

function resolveDatabasePath(explicitPath?: string) {
  return explicitPath
    ? path.resolve(explicitPath)
    : path.resolve(process.cwd(), process.env.CLONABLE_DB_PATH ?? "./data/clonable.db");
}

function sleep(milliseconds: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function hasTable(sqlite: Database.Database, tableName: string) {
  return Boolean(
    sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      )
      .get(tableName),
  );
}

function hasColumn(sqlite: Database.Database, tableName: string, columnName: string) {
  const rows = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  return rows.some((row) => row.name === columnName);
}

function ensureMigrations(
  sqlite: Database.Database,
  db: AppDatabase,
  databasePath: string,
) {
  const migrationsFolder = path.resolve(process.cwd(), "./drizzle");
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");

  if (!fs.existsSync(journalPath)) {
    return;
  }

  if (
    !hasTable(sqlite, "__drizzle_migrations") &&
    hasTable(sqlite, "projects") &&
    hasColumn(sqlite, "projects", "definition_of_done")
  ) {
    return;
  }

  const lockPath = `${databasePath}.migrate.lock`;
  const start = Date.now();
  let hasLock = false;

  while (!hasLock) {
    try {
      const handle = fs.openSync(lockPath, "wx");
      fs.closeSync(handle);
      hasLock = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      if (Date.now() - start > MIGRATION_LOCK_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for DB migration lock at ${lockPath}`);
      }

      sleep(50);
    }
  }

  try {
    migrate(db, { migrationsFolder });
  } finally {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  }
}

export function createDatabase(explicitPath?: string) {
  const databasePath = resolveDatabasePath(explicitPath);
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  ensureMigrations(sqlite, db, databasePath);

  return { db, sqlite, databasePath };
}

let databaseSingleton: ReturnType<typeof createDatabase> | undefined;

export function getDatabase() {
  if (!databaseSingleton) {
    databaseSingleton = createDatabase();
  }

  return databaseSingleton;
}
