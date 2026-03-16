import { afterEach, describe, expect, it } from "vitest";

import { runProjectOrchestrationCycle } from "@/server/services/orchestration-service";
import { createTempRepository } from "@/server/test-utils/temp-database";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

describe("orchestration-service", () => {
  it("assigns and promotes backlog work when orchestration is enabled", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "Orchestration project",
      ideaPrompt: "Route backlog work automatically.",
      targetUser: "Founders",
      constraints: ["Local-first"],
      stackPreferences: ["Next.js"],
    });

    const withPhase = await temp.repository.createPhase(project.id, {
      title: "Phase 1",
      goal: "Create policy-safe execution flow.",
    });
    const withFeature = await temp.repository.createFeature(project.id, {
      phaseId: withPhase?.phases[0]?.id ?? "",
      title: "Automatic routing",
      summary: "Assign owners and promote backlog tasks.",
      priority: "normal",
    });
    const withTask = await temp.repository.createTask(project.id, {
      featureId: withFeature?.features[0]?.id ?? "",
      title: "Implement backend routing",
      description: "Use the backend builder for repo and service work.",
      priority: "normal",
      acceptanceCriteria: ["Task can be routed"],
      dependencies: [],
    });

    await temp.repository.updateProjectRuntime(project.id, {
      ...(withTask?.runtime ?? { orchestrationEnabled: false, runnerStatus: "idle" as const }),
      orchestrationEnabled: true,
      runnerStatus: "idle",
    });

    const cycled = await runProjectOrchestrationCycle(project.id, temp.repository);

    expect(cycled?.tasks[0]?.ownerAgentId).toBeTruthy();
    expect(cycled?.tasks[0]?.state).toBe("Ready");
    expect(cycled?.agentRuns.length).toBeGreaterThan(0);
  });

  it("auto-completes QA review when evidence is present", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "QA project",
      ideaPrompt: "Finish QA tasks automatically when evidence exists.",
      targetUser: "Founders",
      constraints: ["Local-first"],
      stackPreferences: ["Next.js"],
    });

    const withPhase = await temp.repository.createPhase(project.id, {
      title: "Phase 1",
      goal: "Create reviewable work.",
    });
    const withFeature = await temp.repository.createFeature(project.id, {
      phaseId: withPhase?.phases[0]?.id ?? "",
      title: "QA automation",
      summary: "Review tasks with visible evidence.",
      priority: "normal",
    });
    const withTask = await temp.repository.createTask(project.id, {
      featureId: withFeature?.features[0]?.id ?? "",
      title: "Backend implementation",
      description: "This task should route to the backend builder.",
      priority: "normal",
      acceptanceCriteria: ["Task has review evidence"],
      dependencies: [],
    });

    const managerId = withTask?.agents.find((agent) => agent.policyRole === "orchestrator")?.id ?? "";
    const builderId = withTask?.agents.find((agent) => agent.name === "Backend Builder")?.id ?? "";
    const reviewerId = withTask?.agents.find((agent) => agent.policyRole === "tester")?.id ?? "";

    await temp.repository.assignTaskOwner(project.id, withTask?.tasks[0]?.id ?? "", {
      ownerAgentId: builderId,
      agentId: managerId,
    });
    await temp.repository.transitionTask(project.id, withTask?.tasks[0]?.id ?? "", {
      state: "Ready",
      agentId: managerId,
    });
    await temp.repository.transitionTask(project.id, withTask?.tasks[0]?.id ?? "", {
      state: "In_Progress",
      agentId: builderId,
      note: "Implemented and attached evidence.",
    });
    await temp.repository.transitionTask(project.id, withTask?.tasks[0]?.id ?? "", {
      state: "QA_Review",
      agentId: builderId,
    });
    await temp.repository.updateProjectRuntime(project.id, {
      orchestrationEnabled: true,
      runnerStatus: "idle",
    });

    const cycled = await runProjectOrchestrationCycle(project.id, temp.repository);
    const task = cycled?.tasks.find((candidate) => candidate.id === withTask?.tasks[0]?.id);

    expect(task?.state).toBe("Done");
    expect(task?.ownerAgentId).toBe(reviewerId);
  });
});
