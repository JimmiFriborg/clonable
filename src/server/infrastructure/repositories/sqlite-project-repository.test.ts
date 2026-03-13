import { afterEach, describe, expect, it } from "vitest";

import { demoProjectFixture } from "@/server/infrastructure/demo-project-repository";
import {
  createRepositoryForPath,
  createTempDatabasePath,
  createTempRepository,
} from "@/server/test-utils/temp-database";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

describe("SQLiteProjectRepository", () => {
  it("returns an empty project list for a fresh database", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    await expect(temp.repository.listProjects()).resolves.toEqual([]);
  });

  it("hydrates the persisted demo project into the dashboard shape", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);
    await temp.repository.seedDemoProject(demoProjectFixture);

    const dashboard = await temp.repository.getProjectDashboard(demoProjectFixture.id);

    expect(dashboard?.project.name).toBe(demoProjectFixture.name);
    expect(dashboard?.featureProgress.length).toBeGreaterThan(0);
    expect(dashboard?.project.agents.length).toBeGreaterThan(0);
  });

  it("persists a created project across repository restarts", async () => {
    const { tempDirectory, databasePath } = createTempDatabasePath();
    const temp = createRepositoryForPath(databasePath, tempDirectory);
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "Persisted project",
      ideaPrompt: "Build a stable local-first MVP planning tool.",
      targetUser: "Solo founders",
      constraints: ["Keep it local-first"],
      stackPreferences: ["Next.js", "SQLite"],
    });

    temp.database.sqlite.close();
    const reopened = createRepositoryForPath(databasePath, tempDirectory);
    cleanups.push(() => reopened.database.sqlite.close());

    const persisted = await reopened.repository.getProject(project.id);
    expect(persisted?.name).toBe("Persisted project");
  });
});
