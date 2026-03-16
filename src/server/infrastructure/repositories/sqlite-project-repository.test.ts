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
      priority: "normal",
    });
    expect(withFeature?.features).toHaveLength(1);
    expect(withFeature?.currentFocus).toContain("task");

    const withTask = await temp.repository.createTask(project.id, {
      featureId: withFeature?.features[0].id ?? "",
      title: "Add a task form",
      description: "Create the first manual task input flow.",
      priority: "normal",
      acceptanceCriteria: ["User can create a task"],
      dependencies: [],
    });
    expect(withTask?.tasks).toHaveLength(1);
    expect(withTask?.tasks[0]?.state).toBe("Backlog");

    const managerId = withTask?.agents.find((agent) => agent.policyRole === "orchestrator")?.id ?? "";
    const builderId = withTask?.agents.find((agent) => agent.policyRole === "builder")?.id ?? "";
    const reviewerId = withTask?.agents.find((agent) => agent.policyRole === "tester")?.id ?? "";

    const assigned = await temp.repository.assignTaskOwner(
      project.id,
      withTask?.tasks[0]?.id ?? "",
      {
        ownerAgentId: builderId,
        agentId: managerId,
      },
    );

    const ready = await temp.repository.transitionTask(project.id, withTask?.tasks[0]?.id ?? "", {
      state: "Ready",
      agentId: managerId,
    });

    const inProgress = await temp.repository.transitionTask(project.id, withTask?.tasks[0]?.id ?? "", {
      state: "In_Progress",
      agentId: builderId,
      note: "Implementation started.",
    });

    const inQa = await temp.repository.transitionTask(project.id, withTask?.tasks[0]?.id ?? "", {
      state: "QA_Review",
      agentId: builderId,
    });

    const reviewDone = await temp.repository.transitionTask(project.id, withTask?.tasks[0]?.id ?? "", {
      state: "Done",
      agentId: reviewerId,
    });

    expect(assigned?.tasks[0]?.ownerAgentId).toBe(builderId);
    expect(ready?.tasks[0]?.state).toBe("Ready");
    expect(inProgress?.tasks[0]?.state).toBe("In_Progress");
    expect(inQa?.tasks[0]?.state).toBe("QA_Review");
    expect(reviewDone?.tasks[0]?.completedAt).toBeTruthy();
    expect(reviewDone?.tasks[0]?.changeLog.at(-1)?.to).toBe("Done");
    expect(reviewDone?.features[0]?.status).toBe("Done");
    expect(reviewDone?.phases[0]?.status).toBe("Done");
    expect(reviewDone?.status).toBe("Review");
  });

  it("persists agent runtime and project chat state", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "Chat runtime project",
      ideaPrompt: "Keep chat and agent runtimes visible.",
      targetUser: "Builders",
      constraints: ["Stay local-first"],
      stackPreferences: ["Next.js"],
    });

    const manager = project.agents.find((agent) => agent.policyRole === "orchestrator");
    expect(manager?.runtimeBackend).toBe("provider");

    const updatedProject = await temp.repository.updateProjectDefaultChatBot(project.id, "quality-guardian");
    const session = await temp.repository.createProjectChatSession(project.id, {
      id: "session-1",
      projectId: project.id,
      botId: "quality-guardian",
      title: "Quality thread",
      createdAt: "2026-03-16T10:00:00.000Z",
      updatedAt: "2026-03-16T10:00:00.000Z",
    });
    await temp.repository.createProjectChatMessage(project.id, {
      id: "message-1",
      projectId: project.id,
      sessionId: "session-1",
      botId: "quality-guardian",
      role: "assistant",
      content: "Review the current MVP boundary.",
      suggestions: [],
      createdAt: "2026-03-16T10:01:00.000Z",
    });

    expect(updatedProject?.defaultChatBotId).toBe("quality-guardian");
    expect(session?.botId).toBe("quality-guardian");

    const persisted = await temp.repository.getProject(project.id);
    const messages = await temp.repository.listProjectChatMessages(project.id, "session-1");

    expect(persisted?.defaultChatBotId).toBe("quality-guardian");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toContain("MVP boundary");
  });
});
