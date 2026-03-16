import crypto from "node:crypto";

import type { ProjectRepository } from "@/server/domain/project-repository";
import type { AgentRunRecord, ProjectRecord, TaskRecord } from "@/server/domain/project";
import { sqliteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";

const DEFAULT_STALE_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RUNNER_POLL_MS = 5_000;

let runnerStarted = false;
let runnerTimer: NodeJS.Timeout | undefined;

function nowIso() {
  return new Date().toISOString();
}

function runId() {
  return `run-${crypto.randomUUID()}`;
}

function getRunnerPollMs() {
  const rawValue = Number(process.env.CLONABLE_RUNNER_POLL_MS ?? DEFAULT_RUNNER_POLL_MS);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_RUNNER_POLL_MS;
}

function runnerEnabled() {
  return process.env.CLONABLE_RUNNER_ENABLED === "true";
}

function getOrchestrator(project: ProjectRecord) {
  return (
    project.agents.find((agent) => agent.policyRole === "orchestrator" && agent.enabled) ??
    project.agents.find((agent) => agent.policyRole === "orchestrator")
  );
}

function getTester(project: ProjectRecord) {
  return (
    project.agents.find((agent) => agent.policyRole === "tester" && agent.enabled) ??
    project.agents.find((agent) => agent.policyRole === "tester")
  );
}

function hasEvidence(task: TaskRecord) {
  return Boolean(task.notes.trim() || task.relatedFiles.length > 0 || task.artifacts.length > 0);
}

function pickOwnerForTask(project: ProjectRecord, task: TaskRecord) {
  const text = `${task.title} ${task.description}`.toLowerCase();
  const enabledAgents = project.agents.filter((agent) => agent.enabled);

  const findNamed = (pattern: RegExp) =>
    enabledAgents.find((agent) => pattern.test(agent.name.toLowerCase()));

  if (/docs?|readme|copy|prd|architecture/.test(text)) {
    return (
      enabledAgents.find((agent) => agent.policyRole === "documentation") ??
      findNamed(/documentation/)
    );
  }

  if (/ui|ux|page|component|tailwind|layout|frontend/.test(text)) {
    return findNamed(/frontend/) ?? enabledAgents.find((agent) => agent.policyRole === "builder");
  }

  if (/api|server|database|sqlite|drizzle|migration|repository|backend/.test(text)) {
    return findNamed(/backend/) ?? enabledAgents.find((agent) => agent.policyRole === "builder");
  }

  return enabledAgents.find((agent) =>
    ["builder", "documentation", "advisory"].includes(agent.policyRole),
  );
}

function isStale(task: TaskRecord) {
  if (["Done", "Backlog"].includes(task.state)) {
    return false;
  }

  if (task.state === "Waiting" && task.reviewDate) {
    return new Date(task.reviewDate).getTime() <= Date.now();
  }

  if (task.state === "Waiting" && !task.reviewDate) {
    return false;
  }

  return Date.now() - new Date(task.lastUpdated).getTime() > DEFAULT_STALE_TIMEOUT_MS;
}

async function addRun(
  repository: ProjectRepository,
  projectId: string,
  run: AgentRunRecord,
) {
  await repository.addAgentRun(projectId, run);
}

async function updateRun(
  repository: ProjectRepository,
  projectId: string,
  runIdValue: string,
  update: Partial<AgentRunRecord>,
) {
  await repository.updateAgentRun(projectId, runIdValue, update);
}

export async function runProjectOrchestrationCycle(
  projectId: string,
  repository: ProjectRepository = sqliteProjectRepository,
) {
  const project = await repository.getProject(projectId);

  if (!project || !project.runtime.orchestrationEnabled) {
    return project;
  }

  const orchestrator = getOrchestrator(project);
  const tester = getTester(project);

  if (!orchestrator) {
    return project;
  }

  await repository.updateProjectRuntime(projectId, {
    ...project.runtime,
    runnerStatus: "running",
    lastTickAt: nowIso(),
  });

  const managerRun: AgentRunRecord = {
    id: runId(),
    agentId: orchestrator.id,
    status: "Queued",
    trigger: "runner",
    summary: "Policy orchestration cycle",
    reason: "Runner evaluated ownership, stale tasks, and review work.",
    changedFiles: [],
    artifacts: [],
    createdAt: nowIso(),
  };
  await addRun(repository, projectId, managerRun);
  await updateRun(repository, projectId, managerRun.id, {
    status: "Running",
    startedAt: nowIso(),
  });

  let workingProject = (await repository.getProject(projectId)) ?? project;

  for (const staleTask of workingProject.tasks.filter(isStale)) {
    if (staleTask.ownerAgentId && staleTask.ownerAgentId !== orchestrator.id) {
      workingProject =
        (await repository.assignTaskOwner(projectId, staleTask.id, {
          ownerAgentId: orchestrator.id,
          agentId: orchestrator.id,
        })) ?? workingProject;
    } else if (staleTask.ownerAgentId === orchestrator.id) {
      workingProject =
        (await repository.transitionTask(projectId, staleTask.id, {
          state: "Waiting",
          agentId: orchestrator.id,
          waitingReason: "orchestrator_stale",
          reviewDate: new Date(Date.now() + DEFAULT_STALE_TIMEOUT_MS).toISOString(),
        })) ?? workingProject;
    }
  }

  for (const task of workingProject.tasks.filter((candidate) => candidate.state === "Backlog")) {
    if (!task.ownerAgentId) {
      const owner = pickOwnerForTask(workingProject, task);
      if (owner) {
        workingProject =
          (await repository.assignTaskOwner(projectId, task.id, {
            ownerAgentId: owner.id,
            agentId: orchestrator.id,
          })) ?? workingProject;
      }
    }
  }

  workingProject = (await repository.getProject(projectId)) ?? workingProject;

  for (const task of workingProject.tasks.filter((candidate) => candidate.state === "Backlog")) {
    if (task.ownerAgentId && task.dependencies.every((dependencyId) => {
      const dependency = workingProject.tasks.find((candidate) => candidate.id === dependencyId);
      return dependency?.state === "Done";
    })) {
      workingProject =
        (await repository.transitionTask(projectId, task.id, {
          state: "Ready",
          agentId: orchestrator.id,
          note: "Orchestrator promoted the task after ownership and dependency checks passed.",
        })) ?? workingProject;
    }
  }

  if (tester) {
    for (const task of workingProject.tasks.filter(
      (candidate) => candidate.state === "QA_Review" && candidate.ownerAgentId === tester.id,
    )) {
      const reviewRun: AgentRunRecord = {
        id: runId(),
        agentId: tester.id,
        taskId: task.id,
        status: "Queued",
        trigger: "runner",
        summary: `Review ${task.title}`,
        reason: "Runner processed a QA_Review task.",
        changedFiles: task.relatedFiles,
        artifacts: task.artifacts,
        createdAt: nowIso(),
      };
      await addRun(repository, projectId, reviewRun);
      await updateRun(repository, projectId, reviewRun.id, {
        status: "Running",
        startedAt: nowIso(),
      });

      const result = hasEvidence(task)
        ? await repository.transitionTask(projectId, task.id, {
            state: "Done",
            agentId: tester.id,
            note: "Auto-review passed because the task had visible evidence attached.",
          })
        : await repository.transitionTask(projectId, task.id, {
            state: "Ready",
            agentId: tester.id,
            note: "Auto-review requested rework because no task evidence was attached.",
          });

      workingProject = result ?? workingProject;

      await updateRun(repository, projectId, reviewRun.id, {
        status: "Succeeded",
        endedAt: nowIso(),
        outputSummary: hasEvidence(task)
          ? "Task auto-approved by the tester."
          : "Task returned for rework due to missing evidence.",
      });
    }
  }

  await updateRun(repository, projectId, managerRun.id, {
    status: "Succeeded",
    endedAt: nowIso(),
    outputSummary: "Orchestrator checked stale work, assigned owners, and promoted ready tasks.",
  });

  const latestProject = await repository.getProject(projectId);
  if (latestProject) {
    await repository.updateProjectRuntime(projectId, {
      ...latestProject.runtime,
      runnerStatus: "idle",
      lastTickAt: nowIso(),
    });
  }

  return repository.getProject(projectId);
}

export async function runOrchestrationAcrossProjects(
  repository: ProjectRepository = sqliteProjectRepository,
) {
  const projects = await repository.listProjects();

  for (const project of projects) {
    await runProjectOrchestrationCycle(project.id, repository);
  }
}

export function ensureOrchestrationRunner(
  repository: ProjectRepository = sqliteProjectRepository,
) {
  if (!runnerEnabled() || runnerStarted) {
    return;
  }

  runnerStarted = true;
  runnerTimer = setInterval(() => {
    void runOrchestrationAcrossProjects(repository);
  }, getRunnerPollMs());
  runnerTimer.unref?.();
}

export function stopOrchestrationRunnerForTests() {
  if (runnerTimer) {
    clearInterval(runnerTimer);
    runnerTimer = undefined;
  }
  runnerStarted = false;
}
