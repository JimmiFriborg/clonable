import { afterEach, describe, expect, it } from "vitest";

import { createProjectFromIdea } from "@/server/services/project-service";
import { createTempRepository } from "@/server/test-utils/temp-database";

const cleanups: Array<() => void> = [];
const originalPlannerTimeout = process.env.CLONABLE_PLANNER_TIMEOUT_MS;

afterEach(() => {
  process.env.CLONABLE_PLANNER_TIMEOUT_MS = originalPlannerTimeout;
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

describe("project-service", () => {
  it("creates a project, seeds agents, and saves planner output", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await createProjectFromIdea(
      {
        name: "AI drafted project",
        ideaPrompt: "Create an MVP planning workspace.",
        targetUser: "Solo founders",
        constraints: ["Local-first"],
        stackPreferences: ["Next.js"],
        githubRepositoryUrl: "https://github.com/example/ai-drafted-project.git",
      },
      {
        repository: temp.repository,
        planner: async () => ({
          vision: "Vision",
          goalStatement: "Goal statement",
          mvpSummary: "MVP summary",
          successDefinition: "Success",
          laterScope: ["Later"],
          boundaryReasoning: "Boundary",
          definitionOfDone: ["Clear MVP", "Visible ownership"],
          phases: [{ title: "Phase 1", goal: "Phase goal" }],
          features: [
            {
              phaseTitle: "Phase 1",
              title: "Feature 1",
              summary: "Feature summary",
              priority: "high",
            },
          ],
          tasks: [
            {
              featureTitle: "Feature 1",
              title: "Task 1",
              description: "Task description",
              priority: "high",
              acceptanceCriteria: ["Works"],
              dependsOn: [],
            },
          ],
        }),
      },
    );

    const stored = await temp.repository.getProject(project.id);
    expect(stored?.plannerState).toBe("succeeded");
    expect(stored?.agents).toHaveLength(8);
    expect(stored?.tasks).toHaveLength(1);
    expect(stored?.definitionOfDone).toContain("Clear MVP");
    expect(stored?.workspace.remoteUrl).toBe("https://github.com/example/ai-drafted-project.git");
    expect(stored?.workspace.repoProvider).toBe("GitHub");
    expect(
      stored?.agents.find((agent) => agent.name === "Project Manager")?.runtimeBackend,
    ).toBe("provider");
  });

  it("falls back to a manual MVP draft when the planner fails", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await createProjectFromIdea(
      {
        name: "Fallback project",
        ideaPrompt: "Build a fallback flow.",
        targetUser: "Solo founders",
        constraints: ["Local-first"],
        stackPreferences: ["Next.js"],
      },
      {
        repository: temp.repository,
        planner: async () => {
          throw new Error("Planner unavailable");
        },
      },
    );

    const stored = await temp.repository.getProject(project.id);
    expect(stored?.plannerState).toBe("failed");
    expect(stored?.mvp.goalStatement).toBe("Build a fallback flow.");
    expect(stored?.tasks).toHaveLength(0);
  });

  it("falls back when the planner exceeds the configured timeout", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);
    process.env.CLONABLE_PLANNER_TIMEOUT_MS = "10";

    const project = await createProjectFromIdea(
      {
        name: "Timeout project",
        ideaPrompt: "Build a timeout-safe planning flow.",
        targetUser: "Solo founders",
        constraints: ["Stable first-run"],
        stackPreferences: ["Next.js"],
      },
      {
        repository: temp.repository,
        planner: async () =>
          new Promise(() => {
            // Intentionally unresolved so the timeout path is deterministic.
          }),
      },
    );

    const stored = await temp.repository.getProject(project.id);
    expect(stored?.plannerState).toBe("failed");
    expect(stored?.plannerMessage).toContain("Planner timed out");
    expect(stored?.tasks).toHaveLength(0);
  });
});
