import { afterEach, describe, expect, it } from "vitest";

import { createProjectFromIdea } from "@/server/services/project-service";
import { createTempRepository } from "@/server/test-utils/temp-database";

const cleanups: Array<() => void> = [];

afterEach(() => {
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
});
