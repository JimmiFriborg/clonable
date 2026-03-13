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

  it("supports manual planning mutations and keeps derived statuses in sync", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "Manual planning project",
      ideaPrompt: "Turn an MVP into a manually steerable plan.",
      targetUser: "Founders",
      constraints: ["Stay simple"],
      stackPreferences: ["Next.js"],
    });

    const withPhase = await temp.repository.createPhase(project.id, {
      title: "Phase 1: Planning",
      goal: "Create the first manual project structure.",
    });
    expect(withPhase?.phases).toHaveLength(1);
    expect(withPhase?.currentFocus).toContain("features");

    const withFeature = await temp.repository.createFeature(project.id, {
      phaseId: withPhase?.phases[0].id ?? "",
      title: "Manual planning controls",
      summary: "Let the user add and adjust plan structure without regenerating everything.",
      priority: "P1",
    });
    expect(withFeature?.features).toHaveLength(1);
    expect(withFeature?.currentFocus).toContain("task");

    const withTask = await temp.repository.createTask(project.id, {
      featureId: withFeature?.features[0].id ?? "",
      title: "Add a task form",
      description: "Create the first manual task input flow.",
      priority: "P1",
      acceptanceCriteria: ["User can create a task"],
      dependencies: [],
    });
    expect(withTask?.tasks).toHaveLength(1);
    expect(withTask?.tasks[0]?.status).toBe("Ready");

    const completed = await temp.repository.updateTaskStatus(
      project.id,
      withTask?.tasks[0]?.id ?? "",
      {
        status: "Done",
      },
    );

    expect(completed?.tasks[0]?.completedAt).toBeTruthy();
    expect(completed?.tasks[0]?.history.at(-1)?.summary).toBe("Status set to Done");
    expect(completed?.features[0]?.status).toBe("Done");
    expect(completed?.phases[0]?.status).toBe("Done");
    expect(completed?.status).toBe("Review");
  });
});
