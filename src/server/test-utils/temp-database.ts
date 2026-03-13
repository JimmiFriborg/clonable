import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createDatabase } from "@/server/infrastructure/database/client";
import { SQLiteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";

export function createTempDatabasePath() {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "clonable-"));
  return {
    tempDirectory,
    databasePath: path.join(tempDirectory, "test.db"),
  };
}

export function createRepositoryForPath(databasePath: string, tempDirectory: string) {
  const database = createDatabase(databasePath);

  return {
    repository: new SQLiteProjectRepository(database),
    database,
    cleanup() {
      database.sqlite.close();
      fs.rmSync(tempDirectory, { force: true, recursive: true });
    },
  };
}

export function createTempRepository() {
  const { tempDirectory, databasePath } = createTempDatabasePath();
  return createRepositoryForPath(databasePath, tempDirectory);
}
