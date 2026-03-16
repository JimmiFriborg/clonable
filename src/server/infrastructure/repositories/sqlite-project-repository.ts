import crypto from "node:crypto";
import path from "node:path";

import { asc, eq, inArray } from "drizzle-orm";

import { defaultAgentTemplates } from "@/server/domain/default-agent-templates";
import type { ProjectRepository } from "@/server/domain/project-repository";
import type {
  ProjectChatMessage,
  ProjectChatSession,
} from "@/server/domain/openclaw";
import { resolveOpenClawDefaultBotId } from "@/server/domain/openclaw";
import {
  allowedTaskTransitions,
  type AgentCreateInput,
  type AgentPolicyRole,
  type AgentRecord,
  type AgentRunRecord,
  type AgentUpdateInput,
  type EventInput,
  type EventRecord,
  type FeatureCreateInput,
  type PlannerDraft,
  type PreviewLogRecord,
  type PreviewRecord,
  type ProjectDashboardModel,
  type ProjectIntakeInput,
  type ProjectMvpUpdateInput,
  type ProjectRecord,
  type ProjectRuntimeState,
  type ProjectStatus,
  type TaskChangeLogEntry,
  type TaskCreateInput,
  type TaskOwnerInput,
  type TaskPriority,
  type TaskRecord,
  type TaskRejectionLogEntry,
  type TaskState,
  type TaskTransitionInput,
  type WorkspaceFileRecord,
  type WorkspaceRecord,
  rejectionCodeOrder,
} from "@/server/domain/project";
import { buildProjectDashboardModel, buildProjectListItem } from "@/server/services/dashboard-builder";
import {
  getDatabase,
  type AppDatabase,
} from "@/server/infrastructure/database/client";
import {
  agentRunsTable,
  agentsTable,
  eventsTable,
  featuresTable,
  mvpDefinitionsTable,
  phasesTable,
  previewStateTable,
  projectsTable,
  projectRuntimeTable,
  tasksTable,
  projectChatMessagesTable,
  projectChatSessionsTable,
  workspaceStateTable,
} from "@/server/infrastructure/database/schema";

const DEFAULT_DEFINITION_OF_DONE = [
  "The goal and MVP boundary are explicit and visible.",
  "The MVP has phases, features, and tasks that a user can understand without hidden reasoning.",
  "The workspace and preview remain inspectable, recoverable, and tied to project progress.",
];

const ACTIVE_FEATURE_TASK_STATES: TaskState[] = [
  "Ready",
  "In_Progress",
  "Blocked",
  "Waiting",
  "QA_Review",
  "Split_Pending",
  "Done",
];

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function serializeJson(value: unknown) {
  return JSON.stringify(value);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function migrateLegacyTaskState(status: string | null | undefined): TaskState {
  switch (status) {
    case "Inbox":
    case "Planned":
      return "Backlog";
    case "Ready":
      return "Ready";
    case "In Progress":
      return "In_Progress";
    case "Review":
      return "QA_Review";
    case "Blocked":
      return "Blocked";
    case "Done":
      return "Done";
    default:
      return "Backlog";
  }
}

function migrateLegacyPriority(
  priority: string | null | undefined,
  state: TaskState,
): TaskPriority {
  if (state === "Blocked") {
    return "blocker";
  }

  switch (priority) {
    case "P0":
      return "high";
    case "P1":
      return "normal";
    case "P2":
    case "P3":
      return "low";
    case "blocker":
    case "high":
    case "normal":
    case "low":
      return priority;
    default:
      return "normal";
  }
}

function legacyStatusFromState(state: TaskState) {
  switch (state) {
    case "Backlog":
      return "Planned";
    case "Ready":
      return "Ready";
    case "In_Progress":
      return "In Progress";
    case "QA_Review":
      return "Review";
    case "Blocked":
      return "Blocked";
    case "Done":
      return "Done";
    case "Waiting":
    case "Split_Pending":
      return "Blocked";
    default:
      return "Planned";
  }
}

function buildLegacyHistory(task: TaskRecord) {
  return task.changeLog.map((entry) => ({
    at: entry.timestamp,
    summary: entry.field,
    reason: `${entry.from ?? "empty"} -> ${entry.to ?? "empty"}`,
  }));
}

function defaultPlannerMessage(plannerState: ProjectRecord["plannerState"]) {
  if (plannerState === "failed") {
    return "Planner was unavailable. Continue by defining the MVP manually.";
  }

  if (plannerState === "succeeded") {
    return "Planner draft ready for review.";
  }

  if (plannerState === "manual") {
    return "MVP draft saved manually.";
  }

  return undefined;
}

function buildWorkspaceState(slug: string): WorkspaceRecord {
  const projectsRoot = process.env.CLONABLE_PROJECTS_ROOT ?? "./projects";

  return {
    rootPath: path.resolve(process.cwd(), projectsRoot, slug),
    repoProvider: "Local Git",
    branch: "main",
    lastCommit: "No commits yet",
    dirtyFiles: [],
    files: [],
  };
}

function buildPreviewState(): PreviewRecord {
  return {
    status: "Stopped",
    command: "npm run dev",
    port: 3000,
    url: "http://localhost:3000",
    recentLogs: [
      {
        at: nowIso(),
        line: "Preview not started yet.",
      },
    ],
  };
}

function buildRuntimeState(): ProjectRuntimeState {
  return {
    orchestrationEnabled: false,
    runnerStatus: "idle",
  };
}

function createChangeLogEntry(
  agentId: string,
  field: string,
  from: string | null,
  to: string | null,
): TaskChangeLogEntry {
  return {
    timestamp: nowIso(),
    agentId,
    field,
    from,
    to,
  };
}

function createRejectionLogEntry(
  agentId: string,
  rejectionReasonCode: (typeof rejectionCodeOrder)[number],
  rejectionNote: string,
  attemptedTransition?: string,
  attemptedField?: string,
): TaskRejectionLogEntry {
  return {
    timestamp: nowIso(),
    agentId,
    rejectionReasonCode,
    rejectionNote,
    attemptedTransition,
    attemptedField,
  };
}

function countQaFailures(task: TaskRecord) {
  return task.changeLog.filter(
    (entry) => entry.field === "state" && entry.from === "QA_Review" && entry.to === "Ready",
  ).length;
}

function dependenciesSatisfied(task: TaskRecord, project: ProjectRecord) {
  const taskById = new Map(project.tasks.map((candidate) => [candidate.id, candidate]));
  return task.dependencies
    .filter((dependencyId) => !task.optionalDependencies.includes(dependencyId))
    .every((dependencyId) => taskById.get(dependencyId)?.state === "Done");
}

function parentIsBlocked(task: TaskRecord, project: ProjectRecord) {
  if (!task.parentTaskId) {
    return false;
  }

  return project.tasks.find((candidate) => candidate.id === task.parentTaskId)?.state === "Blocked";
}

function getAgentWipLimit(agent: AgentRecord) {
  if (agent.policyRole === "orchestrator" || agent.wipLimit === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (typeof agent.wipLimit === "number") {
    return agent.wipLimit;
  }

  return agent.policyRole === "tester" ? 3 : 1;
}

function hasWipCapacity(project: ProjectRecord, agent: AgentRecord) {
  const activeStates =
    agent.policyRole === "tester" ? ["QA_Review", "In_Progress"] : ["In_Progress"];
  const currentLoad = project.tasks.filter(
    (task) => task.ownerAgentId === agent.id && activeStates.includes(task.state),
  ).length;

  return currentLoad < getAgentWipLimit(agent);
}

function getOrchestratorAgent(project: ProjectRecord) {
  return (
    project.agents.find((agent) => agent.policyRole === "orchestrator" && agent.enabled) ??
    project.agents.find((agent) => agent.policyRole === "orchestrator") ??
    project.agents[0]
  );
}

function getTesterAgent(project: ProjectRecord) {
  return (
    project.agents.find((agent) => agent.policyRole === "tester" && agent.enabled) ??
    project.agents.find((agent) => agent.policyRole === "tester")
  );
}

function syncAgentCurrentTasks(project: ProjectRecord) {
  const activeTaskByAgent = new Map<string, string>();
  const taskPriority = new Map<TaskState, number>([
    ["In_Progress", 0],
    ["QA_Review", 1],
    ["Ready", 2],
    ["Blocked", 3],
    ["Waiting", 4],
    ["Split_Pending", 5],
    ["Backlog", 6],
    ["Done", 7],
  ]);

  const sortedTasks = [...project.tasks].sort((left, right) => {
    const leftRank = taskPriority.get(left.state) ?? 999;
    const rightRank = taskPriority.get(right.state) ?? 999;
    return leftRank - rightRank || right.lastUpdated.localeCompare(left.lastUpdated);
  });

  for (const task of sortedTasks) {
    if (task.ownerAgentId && task.state !== "Done" && !activeTaskByAgent.has(task.ownerAgentId)) {
      activeTaskByAgent.set(task.ownerAgentId, task.id);
    }
  }

  return {
    ...project,
    agents: project.agents.map((agent) => ({
      ...agent,
      currentTaskId: activeTaskByAgent.get(agent.id),
    })),
  };
}

function syncProjectState(project: ProjectRecord): ProjectRecord {
  const features = project.features.map((feature) => {
    const tasks = project.tasks.filter((task) => task.featureId === feature.id);

    if (tasks.length === 0) {
      return feature;
    }

    if (tasks.every((task) => task.state === "Done")) {
      return {
        ...feature,
        status: "Done" as const,
      };
    }

    if (tasks.some((task) => ACTIVE_FEATURE_TASK_STATES.includes(task.state) && task.state !== "Backlog")) {
      return {
        ...feature,
        status: "In Progress" as const,
      };
    }

    return {
      ...feature,
      status: "Planned" as const,
    };
  });

  const featuresById = new Map(features.map((feature) => [feature.id, feature]));
  const phases = project.phases.map((phase) => {
    const tasks = project.tasks.filter((task) => task.phaseId === phase.id);

    if (tasks.length === 0) {
      return phase;
    }

    if (tasks.every((task) => task.state === "Done")) {
      return {
        ...phase,
        status: "Done" as const,
      };
    }

    const phaseFeatures = features.filter((feature) => feature.phaseId === phase.id);
    const hasStartedFeature = phaseFeatures.some(
      (feature) => featuresById.get(feature.id)?.status === "In Progress",
    );

    if (hasStartedFeature || tasks.some((task) => task.state !== "Backlog")) {
      return {
        ...phase,
        status: "In Progress" as const,
      };
    }

    return {
      ...phase,
      status: "Planned" as const,
    };
  });

  const syncedProject = syncAgentCurrentTasks({
    ...project,
    features,
    phases,
  });
  const dashboard = buildProjectDashboardModel(syncedProject);

  let currentFocus = project.currentFocus;
  if (syncedProject.phases.length === 0) {
    currentFocus = "Define the first MVP phase.";
  } else if (syncedProject.features.length === 0) {
    currentFocus = `Break ${syncedProject.phases[0]?.title ?? "the MVP"} into features.`;
  } else if (syncedProject.tasks.length === 0) {
    currentFocus = `Create the first task for ${syncedProject.features[0]?.title ?? "the MVP"}.`;
  } else if (dashboard.blockers[0]) {
    currentFocus = `Resolve ${dashboard.blockers[0].title}.`;
  } else if (dashboard.nextTasks[0]) {
    currentFocus = `Focus on ${dashboard.nextTasks[0].title}.`;
  } else if (
    dashboard.counts.totalTasks > 0 &&
    dashboard.counts.doneTasks === dashboard.counts.totalTasks
  ) {
    currentFocus = "Review completed MVP work and decide the next slice.";
  }

  let status: ProjectStatus = "Planning";
  if (syncedProject.tasks.length === 0 || syncedProject.tasks.every((task) => task.state === "Backlog")) {
    status = "Planning";
  } else if (
    syncedProject.tasks.length > 0 &&
    syncedProject.tasks.every((task) => task.state === "Done")
  ) {
    status = "Review";
  } else if (
    syncedProject.tasks.some((task) => ["Ready", "In_Progress", "Blocked", "Waiting", "QA_Review", "Split_Pending"].includes(task.state))
  ) {
    status = "Building";
  }

  return {
    ...syncedProject,
    status,
    currentFocus,
  };
}

function buildDefaultProject(input: ProjectIntakeInput, slug: string): ProjectRecord {
  const createdAt = nowIso();
  const projectId = randomId("project");
  const workspace = buildWorkspaceState(slug);
  const defaultChatBotId = resolveOpenClawDefaultBotId(process.env.OPENCLAW_DEFAULT_BOT_ID);

  return {
    id: projectId,
    slug,
    name: input.name,
    summary: `Define the MVP for ${input.name} and translate it into a buildable plan.`,
    status: "Planning",
    currentFocus: "Generate an MVP draft and confirm the smallest credible scope.",
    vision: input.ideaPrompt,
    plannerState: "idle",
    plannerMessage: defaultPlannerMessage("idle"),
    targetUser: input.targetUser,
    ideaPrompt: input.ideaPrompt,
    stackPreferences: input.stackPreferences,
    constraints: input.constraints,
    defaultChatBotId,
    definitionOfDone: DEFAULT_DEFINITION_OF_DONE,
    mvp: {
      goalStatement: input.ideaPrompt,
      summary: "",
      successDefinition: "",
      laterScope: [],
      boundaryReasoning: "",
      constraints: input.constraints,
    },
    phases: [],
    features: [],
    tasks: [],
    agents: defaultAgentTemplates.map((template) => ({
      ...template,
      id: randomId("agent"),
    })),
    events: [
      {
        id: randomId("event"),
        createdAt,
        type: "system",
        summary: "Project created",
        reason: "A new project was created from the intake form.",
      },
    ],
    agentRuns: [],
    runtime: buildRuntimeState(),
    workspace,
    preview: buildPreviewState(),
  };
}

function rejectTaskChange(
  project: ProjectRecord,
  taskId: string,
  agentId: string,
  rejectionReasonCode: TaskRejectionLogEntry["rejectionReasonCode"],
  rejectionNote: string,
  attemptedTransition?: string,
  attemptedField?: string,
) {
  const orchestrator = getOrchestratorAgent(project);
  const timestamp = nowIso();

  return syncProjectState({
    ...project,
    tasks: project.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      const nextChangeLog =
        orchestrator && task.ownerAgentId !== orchestrator.id
          ? [
              ...task.changeLog,
              {
                timestamp,
                agentId,
                field: "ownerAgentId",
                from: task.ownerAgentId ?? null,
                to: orchestrator.id,
              },
            ]
          : task.changeLog;

      return {
        ...task,
        ownerAgentId: orchestrator?.id ?? task.ownerAgentId,
        lastUpdated: timestamp,
        changeLog: nextChangeLog,
        rejectionLog: [
          ...task.rejectionLog,
          createRejectionLogEntry(
            agentId,
            rejectionReasonCode,
            rejectionNote,
            attemptedTransition,
            attemptedField,
          ),
        ],
      };
    }),
  });
}

function appendNote(existing: string, note?: string) {
  const trimmed = note?.trim();
  if (!trimmed) {
    return existing;
  }

  return existing ? `${existing}\n\n${trimmed}` : trimmed;
}

function applyTaskTransitionToProject(
  project: ProjectRecord,
  taskId: string,
  input: TaskTransitionInput,
): ProjectRecord {
  const task = project.tasks.find((candidate) => candidate.id === taskId);
  const agent = project.agents.find((candidate) => candidate.id === input.agentId);
  const orchestrator = getOrchestratorAgent(project);
  const tester = getTesterAgent(project);

  if (!task || !agent) {
    return project;
  }

  const currentState = task.state;
  const nextState = input.state;
  const allowed =
    (allowedTaskTransitions[currentState] ?? []).includes(nextState) ||
    (currentState !== "Done" && nextState === "Blocked");
  const isOverride = currentState === "Done" && agent.policyRole === "orchestrator";

  if (!allowed && !isOverride) {
    return rejectTaskChange(
      project,
      taskId,
      input.agentId,
      "INVALID_TRANSITION",
      `${currentState} -> ${nextState} is not allowed by policy.`,
      `${currentState} -> ${nextState}`,
    );
  }

  if (
    (currentState === "Waiting" && nextState === "Blocked") ||
    (currentState === "Blocked" && nextState === "Waiting")
  ) {
    if (agent.policyRole !== "orchestrator") {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "ORCHESTRATOR_REQUIRED",
        "Only the Orchestrator may convert Waiting and Blocked tasks.",
        `${currentState} -> ${nextState}`,
      );
    }
  }

  if (nextState === "Done") {
    if (!(currentState === "QA_Review" && agent.policyRole === "tester") && agent.policyRole !== "orchestrator") {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "UNAUTHORIZED",
        "Only Tester approval or an Orchestrator override may move a task to Done.",
        `${currentState} -> ${nextState}`,
      );
    }
  }

  if (nextState === "Ready" && currentState === "Backlog") {
    if (agent.policyRole !== "orchestrator") {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "ORCHESTRATOR_REQUIRED",
        "The Orchestrator must assign an owner before Backlog moves to Ready.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (!task.ownerAgentId) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "OWNER_MISSING",
        "A Ready task requires an owner.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (!dependenciesSatisfied(task, project)) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "DEPENDENCY_NOT_DONE",
        "Required dependencies must be Done before a task becomes Ready.",
        `${currentState} -> ${nextState}`,
      );
    }
  }

  if (nextState === "In_Progress") {
    if (task.ownerAgentId !== input.agentId) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "UNAUTHORIZED",
        "Only the assigned owner may start a Ready task.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (!task.ownerAgentId) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "OWNER_MISSING",
        "A task must have an owner before work starts.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (!dependenciesSatisfied(task, project)) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "DEPENDENCY_NOT_DONE",
        "Required dependencies are not Done yet.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (parentIsBlocked(task, project)) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "CHECKLIST_FAIL",
        "Parent task is Blocked.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (!hasWipCapacity(project, agent)) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "WIP_EXCEEDED",
        "Agent WIP limit exceeded.",
        `${currentState} -> ${nextState}`,
      );
    }
  }

  if (nextState === "QA_Review") {
    if (task.ownerAgentId !== input.agentId) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "UNAUTHORIZED",
        "Only the implementation owner may hand work to QA.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (task.acceptanceCriteria.length === 0) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "CHECKLIST_FAIL",
        "Acceptance criteria are required for QA entry.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (!dependenciesSatisfied(task, project)) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "DEPENDENCY_NOT_DONE",
        "All dependencies must be Done before QA.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (task.relatedFiles.length === 0 && task.artifacts.length === 0 && !task.notes.trim()) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "CHECKLIST_FAIL",
        "QA entry requires a testable artifact, related file, or implementation note.",
        `${currentState} -> ${nextState}`,
      );
    }
  }

  if (nextState === "Ready" && currentState === "QA_Review") {
    if (agent.policyRole !== "tester") {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "UNAUTHORIZED",
        "Only the Tester may return QA work for rework.",
        `${currentState} -> ${nextState}`,
      );
    }

    if (!task.lastImplementationOwnerAgentId) {
      return rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "MISSING_FIELD",
        "lastImplementationOwnerAgentId is required on QA rework.",
        `${currentState} -> ${nextState}`,
        "lastImplementationOwnerAgentId",
      );
    }
  }

  if (nextState === "Blocked" && !input.blockerReason?.trim()) {
    return rejectTaskChange(
      project,
      taskId,
      input.agentId,
      "MISSING_FIELD",
      "Blocked tasks require blockerReason.",
      `${currentState} -> ${nextState}`,
      "blockerReason",
    );
  }

  if (nextState === "Waiting" && !input.waitingReason?.trim()) {
    return rejectTaskChange(
      project,
      taskId,
      input.agentId,
      "MISSING_FIELD",
      "Waiting tasks require waitingReason.",
      `${currentState} -> ${nextState}`,
      "waitingReason",
    );
  }

  const timestamp = nowIso();
  const nextTasks = project.tasks.map((candidate) => {
    if (candidate.id !== taskId) {
      return candidate;
    }

    let ownerAgentId = candidate.ownerAgentId;
    let blockerReason = nextState === "Blocked" ? input.blockerReason?.trim() : undefined;
    let waitingReason = nextState === "Waiting" ? input.waitingReason?.trim() : undefined;
    let lastImplementationOwnerAgentId = candidate.lastImplementationOwnerAgentId;
    let reviewDate = nextState === "Waiting" ? input.reviewDate?.trim() : undefined;
    let nextRole: AgentPolicyRole | undefined = candidate.nextRole;
    let completedAt = candidate.completedAt;
    let finalState = nextState;

    if (nextState === "Blocked" || nextState === "Split_Pending") {
      ownerAgentId = orchestrator?.id;
      nextRole = "orchestrator";
    } else if (nextState === "QA_Review") {
      ownerAgentId = tester?.id;
      lastImplementationOwnerAgentId = input.agentId;
      nextRole = "tester";
    } else if (nextState === "Ready" && currentState === "QA_Review") {
      ownerAgentId = candidate.lastImplementationOwnerAgentId;
      nextRole = "builder";
    } else if (nextState === "Done") {
      ownerAgentId = input.agentId;
      completedAt = timestamp;
      nextRole = undefined;
    } else if (nextState === "In_Progress") {
      ownerAgentId = input.agentId;
      nextRole = undefined;
    } else if (nextState === "Ready" && currentState === "Blocked") {
      blockerReason = undefined;
    } else if (nextState === "Ready" && currentState === "Waiting") {
      waitingReason = undefined;
      reviewDate = undefined;
    }

    if (nextState === "Ready" && currentState === "QA_Review" && countQaFailures(candidate) >= 2) {
      finalState = "Blocked";
      ownerAgentId = orchestrator?.id;
      blockerReason = "QA rejected the task three times. Orchestrator intervention required.";
      waitingReason = undefined;
      reviewDate = undefined;
      nextRole = "orchestrator";
      completedAt = undefined;
    }

    const finalNotes =
      finalState === "Ready" && currentState === "QA_Review"
        ? appendNote(candidate.notes, input.note ?? "QA requested rework.")
        : appendNote(candidate.notes, input.note);

    const changeLog = [...candidate.changeLog];
    const pushChange = (field: string, from: string | null, to: string | null) => {
      if (from !== to) {
        changeLog.push({
          timestamp,
          agentId: input.agentId,
          field,
          from,
          to,
        });
      }
    };

    pushChange("state", candidate.state, finalState);
    pushChange("ownerAgentId", candidate.ownerAgentId ?? null, ownerAgentId ?? null);
    pushChange("blockerReason", candidate.blockerReason ?? null, blockerReason ?? null);
    pushChange("waitingReason", candidate.waitingReason ?? null, waitingReason ?? null);
    pushChange(
      "lastImplementationOwnerAgentId",
      candidate.lastImplementationOwnerAgentId ?? null,
      lastImplementationOwnerAgentId ?? null,
    );
    pushChange("notes", candidate.notes || null, finalNotes || null);

    const updatedTask: TaskRecord = {
      ...candidate,
      state: finalState,
      ownerAgentId,
      blockerReason,
      waitingReason,
      lastImplementationOwnerAgentId,
      notes: finalNotes,
      reviewDate,
      nextRole,
      completedAt: finalState === "Done" ? completedAt : undefined,
      lastUpdated: timestamp,
      changeLog,
    };

    if (updatedTask.state !== "Backlog" && !updatedTask.ownerAgentId) {
      return {
        ...updatedTask,
        rejectionLog: [
          ...updatedTask.rejectionLog,
          createRejectionLogEntry(
            input.agentId,
            "OWNER_MISSING",
            "Non-Backlog tasks must keep an owner.",
            `${currentState} -> ${nextState}`,
          ),
        ],
      };
    }

    return updatedTask;
  });

  return syncProjectState({
    ...project,
    tasks: nextTasks,
  });
}

function createDraftArtifacts(
  project: ProjectRecord,
  draft: PlannerDraft,
): Pick<ProjectRecord, "phases" | "features" | "tasks"> {
  const orchestrator = getOrchestratorAgent(project);
  const phaseMap = new Map<string, string>();
  const phases = draft.phases.map((phase, index) => {
    const phaseId = `${project.id}-phase-${slugify(phase.title) || index + 1}`;
    phaseMap.set(phase.title, phaseId);

    return {
      id: phaseId,
      title: phase.title,
      goal: phase.goal,
      status: index === 0 ? "In Progress" : "Planned",
      sortOrder: index + 1,
    } as ProjectRecord["phases"][number];
  });

  const features = draft.features.map((feature, index) => ({
    id: `${project.id}-feature-${slugify(feature.title) || index + 1}`,
    phaseId: phaseMap.get(feature.phaseTitle) ?? phases[0]?.id ?? randomId("phase"),
    title: feature.title,
    summary: feature.summary,
    status: "Planned" as const,
    priority: feature.priority,
    sortOrder: index + 1,
  }));
  const featureMap = new Map(features.map((feature) => [feature.title, feature]));

  const taskIdByTitle = new Map<string, string>();
  draft.tasks.forEach((task, index) => {
    taskIdByTitle.set(task.title, `${project.id}-task-${slugify(task.title) || index + 1}`);
  });

  const tasks = draft.tasks.map((task, index) => {
    const feature = featureMap.get(task.featureTitle) ?? features[0];
    const dependencies = task.dependsOn
      .map((dependencyTitle) => taskIdByTitle.get(dependencyTitle))
      .filter((dependencyId): dependencyId is string => Boolean(dependencyId));
    const createdAt = nowIso();

    return {
      id: taskIdByTitle.get(task.title) ?? `${project.id}-task-${index + 1}`,
      phaseId: feature?.phaseId ?? phases[0]?.id ?? randomId("phase"),
      featureId: feature?.id ?? randomId("feature"),
      title: task.title,
      description: task.description,
      state: "Backlog" as const,
      ownerAgentId: undefined,
      priority: task.priority,
      acceptanceCriteria: task.acceptanceCriteria,
      lastUpdated: createdAt,
      notes: "",
      collectiveQa: undefined,
      nextRole: "orchestrator",
      parentTaskId: undefined,
      subTaskIds: [],
      dependencies,
      optionalDependencies: [],
      blockerReason: undefined,
      waitingReason: undefined,
      lastImplementationOwnerAgentId: undefined,
      requiresUser: false,
      reviewDate: undefined,
      changeLog: [
        createChangeLogEntry(orchestrator?.id ?? "system", "state", null, "Backlog"),
      ],
      rejectionLog: [],
      relatedFiles: [],
      artifacts: [],
      completedAt: undefined,
    } satisfies TaskRecord;
  });

  return { phases, features, tasks };
}

function mapDraftToProject(
  project: ProjectRecord,
  draft: PlannerDraft,
  plannerState: ProjectRecord["plannerState"],
  plannerMessage?: string,
) {
  const { phases, features, tasks } = createDraftArtifacts(project, draft);

  return syncProjectState({
    ...project,
    summary: draft.mvpSummary,
    status: "Planning",
    currentFocus: "Review the MVP draft, definition of done, and task ownership policy.",
    vision: draft.vision,
    plannerState,
    plannerMessage: plannerMessage ?? defaultPlannerMessage(plannerState),
    definitionOfDone:
      draft.definitionOfDone.length > 0 ? draft.definitionOfDone : DEFAULT_DEFINITION_OF_DONE,
    mvp: {
      goalStatement: draft.goalStatement,
      summary: draft.mvpSummary,
      successDefinition: draft.successDefinition,
      laterScope: draft.laterScope,
      boundaryReasoning: draft.boundaryReasoning,
      constraints: project.constraints,
    },
    phases,
    features,
    tasks,
  });
}

function mapProjectRowsToRecord(
  db: AppDatabase,
  projectId: string,
): ProjectRecord | undefined {
  const projectRow = db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .get();

  if (!projectRow) {
    return undefined;
  }

  const mvpRow = db
    .select()
    .from(mvpDefinitionsTable)
    .where(eq(mvpDefinitionsTable.projectId, projectId))
    .get();
  const runtimeRow = db
    .select()
    .from(projectRuntimeTable)
    .where(eq(projectRuntimeTable.projectId, projectId))
    .get();
  const workspaceRow = db
    .select()
    .from(workspaceStateTable)
    .where(eq(workspaceStateTable.projectId, projectId))
    .get();
  const previewRow = db
    .select()
    .from(previewStateTable)
    .where(eq(previewStateTable.projectId, projectId))
    .get();

  const phases = db
    .select()
    .from(phasesTable)
    .where(eq(phasesTable.projectId, projectId))
    .orderBy(asc(phasesTable.sortOrder))
    .all()
    .map((phase) => ({
      id: phase.id,
      title: phase.title,
      goal: phase.goal,
      status: phase.status as ProjectRecord["phases"][number]["status"],
      sortOrder: phase.sortOrder,
    }));

  const features = db
    .select()
    .from(featuresTable)
    .where(eq(featuresTable.projectId, projectId))
    .orderBy(asc(featuresTable.sortOrder))
    .all()
    .map((feature) => ({
      id: feature.id,
      phaseId: feature.phaseId,
      title: feature.title,
      summary: feature.summary,
      status: feature.status as ProjectRecord["features"][number]["status"],
      priority: feature.priority as TaskPriority,
      sortOrder: feature.sortOrder,
    }));

  const tasks = db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId))
    .orderBy(asc(tasksTable.sortOrder))
    .all()
    .map((task) => {
      const state = task.state
        ? (task.state as TaskState)
        : migrateLegacyTaskState(task.status ?? undefined);
      const blockerList = parseJson(task.blockers, [] as string[]);
      const legacyHistory = parseJson(
        task.history,
        [] as Array<{ at: string; summary: string; reason: string }>,
      );

      return {
        id: task.id,
        phaseId: task.phaseId,
        featureId: task.featureId,
        title: task.title,
        description: task.description,
        state,
        ownerAgentId: task.ownerAgentId ?? task.assigneeAgentId ?? undefined,
        priority: migrateLegacyPriority(task.priority, state),
        acceptanceCriteria: parseJson(task.acceptanceCriteria, [] as string[]),
        lastUpdated:
          task.lastUpdated !== "1970-01-01T00:00:00.000Z"
            ? task.lastUpdated
            : legacyHistory.at(-1)?.at ?? projectRow.updatedAt,
        notes: task.notes || legacyHistory.at(-1)?.reason || "",
        collectiveQa: task.collectiveQa ?? undefined,
        nextRole: task.nextRole as AgentPolicyRole | undefined,
        parentTaskId: task.parentTaskId ?? undefined,
        subTaskIds: parseJson(task.subTaskIds, [] as string[]),
        dependencies: parseJson(task.dependencies, [] as string[]),
        optionalDependencies: parseJson(task.optionalDependencies, [] as string[]),
        blockerReason: task.blockerReason ?? blockerList[0] ?? undefined,
        waitingReason: task.waitingReason ?? undefined,
        lastImplementationOwnerAgentId: task.lastImplementationOwnerAgentId ?? undefined,
        requiresUser: task.requiresUser,
        reviewDate: task.reviewDate ?? undefined,
        changeLog:
          parseJson(task.changeLog, [] as TaskChangeLogEntry[]).length > 0
            ? parseJson(task.changeLog, [] as TaskChangeLogEntry[])
            : legacyHistory.map((entry) => ({
                timestamp: entry.at,
                agentId: task.assigneeAgentId ?? "system",
                field: "legacy",
                from: null,
                to: entry.summary,
              })),
        rejectionLog: parseJson(task.rejectionLog, [] as TaskRejectionLogEntry[]),
        relatedFiles: parseJson(task.relatedFiles, [] as string[]),
        artifacts: parseJson(task.artifacts, [] as string[]),
        completedAt: task.completedAt ?? undefined,
      };
    });

  const agents = db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.projectId, projectId))
    .orderBy(asc(agentsTable.createdAt))
    .all()
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      policyRole: agent.policyRole as AgentPolicyRole,
      runtimeBackend: (agent.runtimeBackend as AgentRecord["runtimeBackend"]) ?? "provider",
      provider: agent.provider as AgentRecord["provider"],
      model: agent.model,
      fallbackProviders: parseJson(agent.fallbackProviders, [] as AgentRecord["fallbackProviders"]),
      openclawBotId: agent.openclawBotId ?? undefined,
      status: agent.status as AgentRecord["status"],
      enabled: agent.enabled,
      instructionsSummary: agent.instructionsSummary,
      instructions: agent.instructions,
      permissions: parseJson(agent.permissions, [] as string[]),
      boundaries: parseJson(agent.boundaries, [] as string[]),
      escalationRules: parseJson(agent.escalationRules, [] as string[]),
      wipLimit: agent.wipLimit ?? undefined,
      canWriteWorkspace: agent.canWriteWorkspace,
      currentTaskId: agent.currentTaskId ?? undefined,
    }));

  const events = db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.projectId, projectId))
    .orderBy(asc(eventsTable.createdAt))
    .all()
    .map((event) => ({
      id: event.id,
      createdAt: event.createdAt,
      type: event.type as EventRecord["type"],
      summary: event.summary,
      reason: event.reason,
      payload: parseJson(event.payload, {} as Record<string, unknown>),
    }));

  const agentRuns = db
    .select()
    .from(agentRunsTable)
    .where(eq(agentRunsTable.projectId, projectId))
    .orderBy(asc(agentRunsTable.createdAt))
    .all()
    .map((run) => ({
      id: run.id,
      agentId: run.agentId,
      taskId: run.taskId ?? undefined,
      status: run.status as AgentRunRecord["status"],
      trigger: run.trigger as AgentRunRecord["trigger"],
      summary: run.summary,
      reason: run.reason,
      inputSummary: run.inputSummary ?? undefined,
      outputSummary: run.outputSummary ?? undefined,
      errorMessage: run.errorMessage ?? undefined,
      changedFiles: parseJson(run.changedFiles, [] as string[]),
      artifacts: parseJson(run.artifacts, [] as string[]),
      branch: run.branch ?? undefined,
      leaseOwner: run.leaseOwner ?? undefined,
      leaseExpiresAt: run.leaseExpiresAt ?? undefined,
      createdAt: run.createdAt || run.startedAt || projectRow.createdAt,
      startedAt: run.startedAt ?? run.createdAt ?? undefined,
      endedAt: run.endedAt ?? undefined,
    }));

  const project: ProjectRecord = {
    id: projectRow.id,
    slug: projectRow.slug,
    name: projectRow.name,
    summary: projectRow.summary,
    status: projectRow.status as ProjectStatus,
    currentFocus: projectRow.currentFocus,
    vision: projectRow.vision,
    plannerState: projectRow.plannerState as ProjectRecord["plannerState"],
    plannerMessage:
      projectRow.plannerMessage ??
      defaultPlannerMessage(projectRow.plannerState as ProjectRecord["plannerState"]),
    targetUser: projectRow.targetUser,
    ideaPrompt: projectRow.ideaPrompt,
    stackPreferences: parseJson(projectRow.stackPreferences, [] as string[]),
    constraints: parseJson(projectRow.constraints, [] as string[]),
    defaultChatBotId: resolveOpenClawDefaultBotId(projectRow.defaultChatBotId ?? undefined),
    definitionOfDone: parseJson(projectRow.definitionOfDone, DEFAULT_DEFINITION_OF_DONE),
    mvp: {
      goalStatement: mvpRow?.goalStatement ?? projectRow.ideaPrompt,
      summary: mvpRow?.summary ?? "",
      successDefinition: mvpRow?.successDefinition ?? "",
      laterScope: parseJson(mvpRow?.laterScope, [] as string[]),
      boundaryReasoning: mvpRow?.boundaryReasoning ?? "",
      constraints: parseJson(mvpRow?.constraints, [] as string[]),
    },
    phases,
    features,
    tasks,
    agents,
    events,
    agentRuns,
    runtime: runtimeRow
      ? {
          orchestrationEnabled: runtimeRow.orchestrationEnabled,
          runnerStatus: runtimeRow.runnerStatus as ProjectRuntimeState["runnerStatus"],
          activeWriteRunId: runtimeRow.activeWriteRunId ?? undefined,
          lastTickAt: runtimeRow.lastTickAt ?? undefined,
        }
      : buildRuntimeState(),
    workspace: workspaceRow
      ? {
          rootPath: workspaceRow.rootPath,
          repoProvider: workspaceRow.repoProvider,
          branch: workspaceRow.branch,
          lastCommit: workspaceRow.lastCommit,
          dirtyFiles: parseJson(workspaceRow.dirtyFiles, [] as string[]),
          files: parseJson(workspaceRow.files, [] as WorkspaceFileRecord[]),
        }
      : buildWorkspaceState(projectRow.slug),
    preview: previewRow
      ? {
          status: previewRow.status as PreviewRecord["status"],
          command: previewRow.command,
          port: previewRow.port,
          url: previewRow.url,
          pid: previewRow.pid ?? undefined,
          logPath: previewRow.logPath ?? undefined,
          lastExitCode: previewRow.lastExitCode ?? undefined,
          lastRestartedAt: previewRow.lastRestartedAt ?? undefined,
          recentLogs: parseJson(previewRow.recentLogs, [] as PreviewLogRecord[]),
        }
      : buildPreviewState(),
  };

  return syncProjectState(project);
}

function listProjectChatSessionsForProject(
  db: AppDatabase,
  projectId: string,
): ProjectChatSession[] {
  return db
    .select()
    .from(projectChatSessionsTable)
    .where(eq(projectChatSessionsTable.projectId, projectId))
    .orderBy(asc(projectChatSessionsTable.createdAt))
    .all()
    .map((session) => ({
      id: session.id,
      projectId: session.projectId,
      botId: session.botId,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
}

function listProjectChatMessagesForSession(
  db: AppDatabase,
  projectId: string,
  sessionId: string,
): ProjectChatMessage[] {
  return db
    .select()
    .from(projectChatMessagesTable)
    .where(eq(projectChatMessagesTable.projectId, projectId))
    .orderBy(asc(projectChatMessagesTable.createdAt))
    .all()
    .filter((message) => message.sessionId === sessionId)
    .map((message) => ({
      id: message.id,
      projectId: message.projectId,
      sessionId: message.sessionId,
      botId: message.botId,
      role: message.role as ProjectChatMessage["role"],
      content: message.content,
      suggestions: parseJson(message.suggestions, [] as ProjectChatMessage["suggestions"]),
      createdAt: message.createdAt,
    }));
}

function insertProjectGraph(db: AppDatabase, project: ProjectRecord) {
  const syncedProject = syncProjectState(project);
  const timestamp = nowIso();

  db.insert(projectsTable)
    .values({
      id: syncedProject.id,
      slug: syncedProject.slug,
      name: syncedProject.name,
      summary: syncedProject.summary,
      status: syncedProject.status,
      currentFocus: syncedProject.currentFocus,
      vision: syncedProject.vision,
      plannerState: syncedProject.plannerState,
      plannerMessage: syncedProject.plannerMessage ?? null,
      targetUser: syncedProject.targetUser,
      ideaPrompt: syncedProject.ideaPrompt,
      stackPreferences: serializeJson(syncedProject.stackPreferences),
      constraints: serializeJson(syncedProject.constraints),
      defaultChatBotId: syncedProject.defaultChatBotId,
      definitionOfDone: serializeJson(syncedProject.definitionOfDone),
      workspacePath: syncedProject.workspace.rootPath,
      repoProvider: syncedProject.workspace.repoProvider,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  db.insert(mvpDefinitionsTable)
    .values({
      projectId: syncedProject.id,
      goalStatement: syncedProject.mvp.goalStatement,
      summary: syncedProject.mvp.summary,
      successDefinition: syncedProject.mvp.successDefinition,
      laterScope: serializeJson(syncedProject.mvp.laterScope),
      boundaryReasoning: syncedProject.mvp.boundaryReasoning,
      constraints: serializeJson(syncedProject.mvp.constraints),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  if (syncedProject.phases.length > 0) {
    db.insert(phasesTable)
      .values(
        syncedProject.phases.map((phase) => ({
          id: phase.id,
          projectId: syncedProject.id,
          title: phase.title,
          goal: phase.goal,
          status: phase.status,
          sortOrder: phase.sortOrder,
        })),
      )
      .run();
  }

  if (syncedProject.features.length > 0) {
    db.insert(featuresTable)
      .values(
        syncedProject.features.map((feature) => ({
          id: feature.id,
          projectId: syncedProject.id,
          phaseId: feature.phaseId,
          title: feature.title,
          summary: feature.summary,
          status: feature.status,
          priority: feature.priority,
          sortOrder: feature.sortOrder,
        })),
      )
      .run();
  }

  if (syncedProject.tasks.length > 0) {
    db.insert(tasksTable)
      .values(
        syncedProject.tasks.map((task, index) => ({
          id: task.id,
          projectId: syncedProject.id,
          phaseId: task.phaseId,
          featureId: task.featureId,
          title: task.title,
          description: task.description,
          status: legacyStatusFromState(task.state),
          state: task.state,
          assigneeAgentId: task.ownerAgentId ?? null,
          ownerAgentId: task.ownerAgentId ?? null,
          priority: task.priority,
          blockers: serializeJson(task.blockerReason ? [task.blockerReason] : []),
          acceptanceCriteria: serializeJson(task.acceptanceCriteria),
          lastUpdated: task.lastUpdated,
          notes: task.notes,
          collectiveQa: task.collectiveQa ?? null,
          nextRole: task.nextRole ?? null,
          parentTaskId: task.parentTaskId ?? null,
          subTaskIds: serializeJson(task.subTaskIds),
          dependencies: serializeJson(task.dependencies),
          optionalDependencies: serializeJson(task.optionalDependencies),
          blockerReason: task.blockerReason ?? null,
          waitingReason: task.waitingReason ?? null,
          lastImplementationOwnerAgentId: task.lastImplementationOwnerAgentId ?? null,
          requiresUser: task.requiresUser,
          reviewDate: task.reviewDate ?? null,
          history: serializeJson(buildLegacyHistory(task)),
          changeLog: serializeJson(task.changeLog),
          rejectionLog: serializeJson(task.rejectionLog),
          relatedFiles: serializeJson(task.relatedFiles),
          artifacts: serializeJson(task.artifacts),
          completedAt: task.completedAt ?? null,
          sortOrder: index + 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      )
      .run();
  }

  if (syncedProject.agents.length > 0) {
    db.insert(agentsTable)
      .values(
        syncedProject.agents.map((agent) => ({
          id: agent.id,
          projectId: syncedProject.id,
          name: agent.name,
          role: agent.role,
          policyRole: agent.policyRole,
          runtimeBackend: agent.runtimeBackend,
          provider: agent.provider ?? null,
          model: agent.model,
          fallbackProviders: serializeJson(agent.fallbackProviders),
          openclawBotId: agent.openclawBotId ?? null,
          status: agent.status,
          enabled: agent.enabled,
          instructionsSummary: agent.instructionsSummary,
          instructions: agent.instructions,
          permissions: serializeJson(agent.permissions),
          boundaries: serializeJson(agent.boundaries),
          escalationRules: serializeJson(agent.escalationRules),
          wipLimit: agent.wipLimit ?? null,
          canWriteWorkspace: agent.canWriteWorkspace,
          currentTaskId: agent.currentTaskId ?? null,
          isSystem: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      )
      .run();
  }

  db.insert(projectRuntimeTable)
    .values({
      projectId: syncedProject.id,
      orchestrationEnabled: syncedProject.runtime.orchestrationEnabled,
      runnerStatus: syncedProject.runtime.runnerStatus,
      activeWriteRunId: syncedProject.runtime.activeWriteRunId ?? null,
      lastTickAt: syncedProject.runtime.lastTickAt ?? null,
    })
    .run();

  db.insert(workspaceStateTable)
    .values({
      projectId: syncedProject.id,
      rootPath: syncedProject.workspace.rootPath,
      repoProvider: syncedProject.workspace.repoProvider,
      branch: syncedProject.workspace.branch,
      lastCommit: syncedProject.workspace.lastCommit,
      dirtyFiles: serializeJson(syncedProject.workspace.dirtyFiles),
      files: serializeJson(syncedProject.workspace.files),
    })
    .run();

  db.insert(previewStateTable)
    .values({
      projectId: syncedProject.id,
      status: syncedProject.preview.status,
      command: syncedProject.preview.command,
      port: syncedProject.preview.port,
      url: syncedProject.preview.url,
      pid: syncedProject.preview.pid ?? null,
      logPath: syncedProject.preview.logPath ?? null,
      lastExitCode: syncedProject.preview.lastExitCode ?? null,
      lastRestartedAt: syncedProject.preview.lastRestartedAt ?? null,
      recentLogs: serializeJson(syncedProject.preview.recentLogs),
    })
    .run();

  if (syncedProject.events.length > 0) {
    db.insert(eventsTable)
      .values(
        syncedProject.events.map((event) => ({
          id: event.id,
          projectId: syncedProject.id,
          type: event.type,
          summary: event.summary,
          reason: event.reason,
          payload: serializeJson(event.payload ?? {}),
          createdAt: event.createdAt,
        })),
      )
      .run();
  }

  if (syncedProject.agentRuns.length > 0) {
    db.insert(agentRunsTable)
      .values(
        syncedProject.agentRuns.map((run) => ({
          id: run.id,
          projectId: syncedProject.id,
          agentId: run.agentId,
          taskId: run.taskId ?? null,
          status: run.status,
          trigger: run.trigger,
          summary: run.summary,
          reason: run.reason,
          inputSummary: run.inputSummary ?? null,
          outputSummary: run.outputSummary ?? null,
          errorMessage: run.errorMessage ?? null,
          changedFiles: serializeJson(run.changedFiles),
          artifacts: serializeJson(run.artifacts),
          branch: run.branch ?? null,
          leaseOwner: run.leaseOwner ?? null,
          leaseExpiresAt: run.leaseExpiresAt ?? null,
          createdAt: run.createdAt,
          startedAt: run.startedAt ?? run.createdAt,
          endedAt: run.endedAt ?? null,
        })),
      )
      .run();
  }
}

export class SQLiteProjectRepository implements ProjectRepository {
  constructor(
    private readonly database: ReturnType<typeof getDatabase> = getDatabase(),
  ) {}

  async listProjects() {
    const rows = this.database.db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .orderBy(asc(projectsTable.createdAt))
      .all();

    return rows
      .map((row) => mapProjectRowsToRecord(this.database.db, row.id))
      .filter((project): project is ProjectRecord => Boolean(project))
      .map(buildProjectListItem);
  }

  async getProject(projectId: string) {
    return mapProjectRowsToRecord(this.database.db, projectId);
  }

  async getProjectDashboard(projectId: string): Promise<ProjectDashboardModel | undefined> {
    const project = await this.getProject(projectId);
    return project ? buildProjectDashboardModel(project) : undefined;
  }

  async saveProject(project: ProjectRecord) {
    this.persistProjectGraph(project);
    const persisted = await this.getProject(project.id);
    if (!persisted) {
      throw new Error(`Failed to persist project ${project.id}`);
    }

    return persisted;
  }

  async createProject(input: ProjectIntakeInput) {
    const slug = await this.getUniqueSlug(input.name);
    const project = buildDefaultProject(input, slug);

    this.database.db.transaction((tx) => {
      insertProjectGraph(tx, project);
    });

    return syncProjectState(project);
  }

  async savePlannerDraft(projectId: string, draft: PlannerDraft) {
    const project = await this.getProject(projectId);

    if (!project) {
      throw new Error(`Project ${projectId} was not found`);
    }

    const updatedProject = mapDraftToProject(project, draft, "succeeded");
    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async savePlannerFailure(projectId: string, reason: string, fallback: ProjectMvpUpdateInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      throw new Error(`Project ${projectId} was not found`);
    }

    const updatedProject = syncProjectState({
      ...project,
      summary: fallback.summary,
      status: "Planning",
      currentFocus:
        "Planner was unavailable. Review the manual MVP draft and define ownership before execution.",
      vision: fallback.vision,
      plannerState: "failed",
      plannerMessage: reason,
      definitionOfDone:
        fallback.definitionOfDone.length > 0
          ? fallback.definitionOfDone
          : project.definitionOfDone,
      mvp: {
        goalStatement: fallback.goalStatement,
        summary: fallback.summary,
        successDefinition: fallback.successDefinition,
        laterScope: fallback.laterScope,
        boundaryReasoning: fallback.boundaryReasoning,
        constraints: fallback.constraints,
      },
      phases: [],
      features: [],
      tasks: [],
    });

    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async updateMvpDefinition(projectId: string, input: ProjectMvpUpdateInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const updatedProject = syncProjectState({
      ...project,
      summary: input.summary,
      vision: input.vision,
      currentFocus:
        "MVP draft updated. Confirm the definition of done and route the first tasks.",
      plannerState: "manual",
      plannerMessage: defaultPlannerMessage("manual"),
      definitionOfDone:
        input.definitionOfDone.length > 0 ? input.definitionOfDone : project.definitionOfDone,
      mvp: {
        goalStatement: input.goalStatement,
        summary: input.summary,
        successDefinition: input.successDefinition,
        laterScope: input.laterScope,
        boundaryReasoning: input.boundaryReasoning,
        constraints: input.constraints,
      },
    });

    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async createPhase(projectId: string, input: { title: string; goal: string }) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      phases: [
        ...project.phases,
        {
          id: `${project.id}-phase-${slugify(input.title) || project.phases.length + 1}-${crypto.randomUUID().slice(0, 8)}`,
          title: input.title,
          goal: input.goal,
          status: project.phases.length === 0 ? "In Progress" : "Planned",
          sortOrder: project.phases.length + 1,
        },
      ],
    });
  }

  async createFeature(projectId: string, input: FeatureCreateInput) {
    const project = await this.getProject(projectId);

    if (!project || !project.phases.some((phase) => phase.id === input.phaseId)) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      features: [
        ...project.features,
        {
          id: `${project.id}-feature-${slugify(input.title) || project.features.length + 1}-${crypto.randomUUID().slice(0, 8)}`,
          phaseId: input.phaseId,
          title: input.title,
          summary: input.summary,
          status: "Planned",
          priority: input.priority,
          sortOrder: project.features.length + 1,
        },
      ],
    });
  }

  async createTask(projectId: string, input: TaskCreateInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const feature = project.features.find((candidate) => candidate.id === input.featureId);
    const orchestrator = getOrchestratorAgent(project);

    if (!feature) {
      return undefined;
    }

    const dependencies = input.dependencies.filter((dependencyId) =>
      project.tasks.some((task) => task.id === dependencyId),
    );
    const createdAt = nowIso();

    return this.saveProject({
      ...project,
      tasks: [
        ...project.tasks,
        {
          id: `${project.id}-task-${slugify(input.title) || project.tasks.length + 1}-${crypto.randomUUID().slice(0, 8)}`,
          phaseId: feature.phaseId,
          featureId: feature.id,
          title: input.title,
          description: input.description,
          state: "Backlog",
          ownerAgentId: undefined,
          priority: input.priority,
          acceptanceCriteria: input.acceptanceCriteria,
          lastUpdated: createdAt,
          notes: "",
          collectiveQa: undefined,
          nextRole: "orchestrator",
          parentTaskId: undefined,
          subTaskIds: [],
          dependencies,
          optionalDependencies: [],
          blockerReason: undefined,
          waitingReason: undefined,
          lastImplementationOwnerAgentId: undefined,
          requiresUser: input.requiresUser ?? false,
          reviewDate: undefined,
          changeLog: [
            createChangeLogEntry(orchestrator?.id ?? "system", "state", null, "Backlog"),
          ],
          rejectionLog: [],
          relatedFiles: [],
          artifacts: [],
          completedAt: undefined,
        },
      ],
    });
  }

  async transitionTask(projectId: string, taskId: string, input: TaskTransitionInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const updatedProject = applyTaskTransitionToProject(project, taskId, input);
    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async assignTaskOwner(projectId: string, taskId: string, input: TaskOwnerInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const agent = project.agents.find((candidate) => candidate.id === input.agentId);
    const owner = project.agents.find((candidate) => candidate.id === input.ownerAgentId);
    const task = project.tasks.find((candidate) => candidate.id === taskId);

    if (!task || !agent) {
      return undefined;
    }

    if (agent.policyRole !== "orchestrator") {
      const rejected = rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "ORCHESTRATOR_REQUIRED",
        "Only the Orchestrator may assign task owners.",
        undefined,
        "ownerAgentId",
      );
      this.persistProjectGraph(rejected);
      return rejected;
    }

    if (!owner && input.ownerAgentId) {
      return undefined;
    }

    if (!input.ownerAgentId && task.state !== "Backlog") {
      const rejected = rejectTaskChange(
        project,
        taskId,
        input.agentId,
        "OWNER_MISSING",
        "Only Backlog tasks may be left without an owner.",
        undefined,
        "ownerAgentId",
      );
      this.persistProjectGraph(rejected);
      return rejected;
    }

    const timestamp = nowIso();
    const updatedProject = syncProjectState({
      ...project,
      tasks: project.tasks.map((candidate) => {
        if (candidate.id !== taskId) {
          return candidate;
        }

        return {
          ...candidate,
          ownerAgentId: input.ownerAgentId,
          lastUpdated: timestamp,
          changeLog:
            candidate.ownerAgentId === input.ownerAgentId
              ? candidate.changeLog
              : [
                  ...candidate.changeLog,
                  createChangeLogEntry(
                    input.agentId,
                    "ownerAgentId",
                    candidate.ownerAgentId ?? null,
                    input.ownerAgentId ?? null,
                  ),
                ],
        };
      }),
    });

    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async createAgent(projectId: string, input: AgentCreateInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      agents: [
        ...project.agents,
        {
          ...input,
          id: randomId("agent"),
          currentTaskId: undefined,
        },
      ],
    });
  }

  async updateAgent(projectId: string, agentId: string, input: AgentUpdateInput) {
    const project = await this.getProject(projectId);

    if (!project || !project.agents.some((agent) => agent.id === agentId)) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      agents: project.agents.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              ...input,
            }
          : agent,
      ),
    });
  }

  async updateProjectDefaultChatBot(projectId: string, defaultChatBotId: string) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      defaultChatBotId: resolveOpenClawDefaultBotId(defaultChatBotId),
    });
  }

  async listProjectChatSessions(projectId: string) {
    return listProjectChatSessionsForProject(this.database.db, projectId);
  }

  async getProjectChatSession(projectId: string, sessionId: string) {
    return listProjectChatSessionsForProject(this.database.db, projectId).find(
      (session) => session.id === sessionId,
    );
  }

  async createProjectChatSession(projectId: string, session: ProjectChatSession) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    this.database.db
      .insert(projectChatSessionsTable)
      .values({
        id: session.id,
        projectId,
        botId: session.botId,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })
      .run();

    return session;
  }

  async listProjectChatMessages(projectId: string, sessionId: string) {
    return listProjectChatMessagesForSession(this.database.db, projectId, sessionId);
  }

  async createProjectChatMessage(projectId: string, message: ProjectChatMessage) {
    const session = await this.getProjectChatSession(projectId, message.sessionId);

    if (!session) {
      return undefined;
    }

    this.database.db
      .insert(projectChatMessagesTable)
      .values({
        id: message.id,
        projectId,
        sessionId: message.sessionId,
        botId: message.botId,
        role: message.role,
        content: message.content,
        suggestions: serializeJson(message.suggestions),
        createdAt: message.createdAt,
      })
      .run();

    this.database.db
      .update(projectChatSessionsTable)
      .set({
        updatedAt: message.createdAt,
      })
      .where(eq(projectChatSessionsTable.id, message.sessionId))
      .run();

    return message;
  }

  async updateProjectRuntime(projectId: string, runtime: ProjectRuntimeState) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      runtime,
    });
  }

  async updateWorkspaceState(projectId: string, workspace: WorkspaceRecord) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      workspace,
    });
  }

  async updatePreviewState(projectId: string, preview: PreviewRecord) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      preview,
    });
  }

  async addAgentRun(projectId: string, run: AgentRunRecord) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      agentRuns: [...project.agentRuns, run],
    });
  }

  async updateAgentRun(projectId: string, runId: string, update: Partial<AgentRunRecord>) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    return this.saveProject({
      ...project,
      agentRuns: project.agentRuns.map((run) =>
        run.id === runId
          ? {
              ...run,
              ...update,
              id: run.id,
              agentId: update.agentId ?? run.agentId,
            }
          : run,
      ),
    });
  }

  async recordEvent(input: EventInput) {
    this.database.db
      .insert(eventsTable)
      .values({
        id: randomId("event"),
        projectId: input.projectId,
        type: input.type,
        summary: input.summary,
        reason: input.reason,
        payload: serializeJson(input.payload ?? {}),
        createdAt: nowIso(),
      })
      .run();
  }

  async seedDemoProject(project: ProjectRecord) {
    const existing = await this.getProject(project.id);

    if (existing) {
      return;
    }

    this.database.db.transaction((tx) => {
      insertProjectGraph(tx, project);
    });
  }

  private persistProjectGraph(project: ProjectRecord) {
    this.database.db.transaction((tx) => {
      const syncedProject = syncProjectState(project);
      const timestamp = nowIso();

      tx.update(projectsTable)
        .set({
          name: syncedProject.name,
          summary: syncedProject.summary,
          status: syncedProject.status,
          currentFocus: syncedProject.currentFocus,
          vision: syncedProject.vision,
          plannerState: syncedProject.plannerState,
          plannerMessage: syncedProject.plannerMessage ?? null,
          targetUser: syncedProject.targetUser,
          ideaPrompt: syncedProject.ideaPrompt,
          stackPreferences: serializeJson(syncedProject.stackPreferences),
          constraints: serializeJson(syncedProject.constraints),
          defaultChatBotId: syncedProject.defaultChatBotId,
          definitionOfDone: serializeJson(syncedProject.definitionOfDone),
          workspacePath: syncedProject.workspace.rootPath,
          repoProvider: syncedProject.workspace.repoProvider,
          updatedAt: timestamp,
        })
        .where(eq(projectsTable.id, syncedProject.id))
        .run();

      tx.insert(mvpDefinitionsTable)
        .values({
          projectId: syncedProject.id,
          goalStatement: syncedProject.mvp.goalStatement,
          summary: syncedProject.mvp.summary,
          successDefinition: syncedProject.mvp.successDefinition,
          laterScope: serializeJson(syncedProject.mvp.laterScope),
          boundaryReasoning: syncedProject.mvp.boundaryReasoning,
          constraints: serializeJson(syncedProject.mvp.constraints),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .onConflictDoUpdate({
          target: mvpDefinitionsTable.projectId,
          set: {
            goalStatement: syncedProject.mvp.goalStatement,
            summary: syncedProject.mvp.summary,
            successDefinition: syncedProject.mvp.successDefinition,
            laterScope: serializeJson(syncedProject.mvp.laterScope),
            boundaryReasoning: syncedProject.mvp.boundaryReasoning,
            constraints: serializeJson(syncedProject.mvp.constraints),
            updatedAt: timestamp,
          },
        })
        .run();

      tx.delete(agentRunsTable).where(eq(agentRunsTable.projectId, syncedProject.id)).run();
      tx.delete(eventsTable).where(eq(eventsTable.projectId, syncedProject.id)).run();
      tx.delete(tasksTable).where(eq(tasksTable.projectId, syncedProject.id)).run();
      tx.delete(featuresTable).where(eq(featuresTable.projectId, syncedProject.id)).run();
      tx.delete(phasesTable).where(eq(phasesTable.projectId, syncedProject.id)).run();
      tx.delete(agentsTable).where(eq(agentsTable.projectId, syncedProject.id)).run();

      if (syncedProject.phases.length > 0) {
        tx.insert(phasesTable)
          .values(
            syncedProject.phases.map((phase) => ({
              id: phase.id,
              projectId: syncedProject.id,
              title: phase.title,
              goal: phase.goal,
              status: phase.status,
              sortOrder: phase.sortOrder,
            })),
          )
          .run();
      }

      if (syncedProject.features.length > 0) {
        tx.insert(featuresTable)
          .values(
            syncedProject.features.map((feature) => ({
              id: feature.id,
              projectId: syncedProject.id,
              phaseId: feature.phaseId,
              title: feature.title,
              summary: feature.summary,
              status: feature.status,
              priority: feature.priority,
              sortOrder: feature.sortOrder,
            })),
          )
          .run();
      }

      if (syncedProject.tasks.length > 0) {
        tx.insert(tasksTable)
          .values(
            syncedProject.tasks.map((task, index) => ({
              id: task.id,
              projectId: syncedProject.id,
              phaseId: task.phaseId,
              featureId: task.featureId,
              title: task.title,
              description: task.description,
              status: legacyStatusFromState(task.state),
              state: task.state,
              assigneeAgentId: task.ownerAgentId ?? null,
              ownerAgentId: task.ownerAgentId ?? null,
              priority: task.priority,
              blockers: serializeJson(task.blockerReason ? [task.blockerReason] : []),
              acceptanceCriteria: serializeJson(task.acceptanceCriteria),
              lastUpdated: task.lastUpdated,
              notes: task.notes,
              collectiveQa: task.collectiveQa ?? null,
              nextRole: task.nextRole ?? null,
              parentTaskId: task.parentTaskId ?? null,
              subTaskIds: serializeJson(task.subTaskIds),
              dependencies: serializeJson(task.dependencies),
              optionalDependencies: serializeJson(task.optionalDependencies),
              blockerReason: task.blockerReason ?? null,
              waitingReason: task.waitingReason ?? null,
              lastImplementationOwnerAgentId: task.lastImplementationOwnerAgentId ?? null,
              requiresUser: task.requiresUser,
              reviewDate: task.reviewDate ?? null,
              history: serializeJson(buildLegacyHistory(task)),
              changeLog: serializeJson(task.changeLog),
              rejectionLog: serializeJson(task.rejectionLog),
              relatedFiles: serializeJson(task.relatedFiles),
              artifacts: serializeJson(task.artifacts),
              completedAt: task.completedAt ?? null,
              sortOrder: index + 1,
              createdAt: timestamp,
              updatedAt: timestamp,
            })),
          )
          .run();
      }

      if (syncedProject.agents.length > 0) {
        tx.insert(agentsTable)
          .values(
            syncedProject.agents.map((agent) => ({
              id: agent.id,
              projectId: syncedProject.id,
              name: agent.name,
              role: agent.role,
              policyRole: agent.policyRole,
              runtimeBackend: agent.runtimeBackend,
              provider: agent.provider ?? null,
              model: agent.model,
              fallbackProviders: serializeJson(agent.fallbackProviders),
              openclawBotId: agent.openclawBotId ?? null,
              status: agent.status,
              enabled: agent.enabled,
              instructionsSummary: agent.instructionsSummary,
              instructions: agent.instructions,
              permissions: serializeJson(agent.permissions),
              boundaries: serializeJson(agent.boundaries),
              escalationRules: serializeJson(agent.escalationRules),
              wipLimit: agent.wipLimit ?? null,
              canWriteWorkspace: agent.canWriteWorkspace,
              currentTaskId: agent.currentTaskId ?? null,
              isSystem: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            })),
          )
          .run();
      }

      tx.insert(projectRuntimeTable)
        .values({
          projectId: syncedProject.id,
          orchestrationEnabled: syncedProject.runtime.orchestrationEnabled,
          runnerStatus: syncedProject.runtime.runnerStatus,
          activeWriteRunId: syncedProject.runtime.activeWriteRunId ?? null,
          lastTickAt: syncedProject.runtime.lastTickAt ?? null,
        })
        .onConflictDoUpdate({
          target: projectRuntimeTable.projectId,
          set: {
            orchestrationEnabled: syncedProject.runtime.orchestrationEnabled,
            runnerStatus: syncedProject.runtime.runnerStatus,
            activeWriteRunId: syncedProject.runtime.activeWriteRunId ?? null,
            lastTickAt: syncedProject.runtime.lastTickAt ?? null,
          },
        })
        .run();

      tx.insert(workspaceStateTable)
        .values({
          projectId: syncedProject.id,
          rootPath: syncedProject.workspace.rootPath,
          repoProvider: syncedProject.workspace.repoProvider,
          branch: syncedProject.workspace.branch,
          lastCommit: syncedProject.workspace.lastCommit,
          dirtyFiles: serializeJson(syncedProject.workspace.dirtyFiles),
          files: serializeJson(syncedProject.workspace.files),
        })
        .onConflictDoUpdate({
          target: workspaceStateTable.projectId,
          set: {
            rootPath: syncedProject.workspace.rootPath,
            repoProvider: syncedProject.workspace.repoProvider,
            branch: syncedProject.workspace.branch,
            lastCommit: syncedProject.workspace.lastCommit,
            dirtyFiles: serializeJson(syncedProject.workspace.dirtyFiles),
            files: serializeJson(syncedProject.workspace.files),
          },
        })
        .run();

      tx.insert(previewStateTable)
        .values({
          projectId: syncedProject.id,
          status: syncedProject.preview.status,
          command: syncedProject.preview.command,
          port: syncedProject.preview.port,
          url: syncedProject.preview.url,
          pid: syncedProject.preview.pid ?? null,
          logPath: syncedProject.preview.logPath ?? null,
          lastExitCode: syncedProject.preview.lastExitCode ?? null,
          lastRestartedAt: syncedProject.preview.lastRestartedAt ?? null,
          recentLogs: serializeJson(syncedProject.preview.recentLogs),
        })
        .onConflictDoUpdate({
          target: previewStateTable.projectId,
          set: {
            status: syncedProject.preview.status,
            command: syncedProject.preview.command,
            port: syncedProject.preview.port,
            url: syncedProject.preview.url,
            pid: syncedProject.preview.pid ?? null,
            logPath: syncedProject.preview.logPath ?? null,
            lastExitCode: syncedProject.preview.lastExitCode ?? null,
            lastRestartedAt: syncedProject.preview.lastRestartedAt ?? null,
            recentLogs: serializeJson(syncedProject.preview.recentLogs),
          },
        })
        .run();

      if (syncedProject.events.length > 0) {
        tx.insert(eventsTable)
          .values(
            syncedProject.events.map((event) => ({
              id: event.id,
              projectId: syncedProject.id,
              type: event.type,
              summary: event.summary,
              reason: event.reason,
              payload: serializeJson(event.payload ?? {}),
              createdAt: event.createdAt,
            })),
          )
          .run();
      }

      if (syncedProject.agentRuns.length > 0) {
        tx.insert(agentRunsTable)
          .values(
            syncedProject.agentRuns.map((run) => ({
              id: run.id,
              projectId: syncedProject.id,
              agentId: run.agentId,
              taskId: run.taskId ?? null,
              status: run.status,
              trigger: run.trigger,
              summary: run.summary,
              reason: run.reason,
              inputSummary: run.inputSummary ?? null,
              outputSummary: run.outputSummary ?? null,
              errorMessage: run.errorMessage ?? null,
              changedFiles: serializeJson(run.changedFiles),
              artifacts: serializeJson(run.artifacts),
              branch: run.branch ?? null,
              leaseOwner: run.leaseOwner ?? null,
              leaseExpiresAt: run.leaseExpiresAt ?? null,
              createdAt: run.createdAt,
              startedAt: run.startedAt ?? run.createdAt,
              endedAt: run.endedAt ?? null,
            })),
          )
          .run();
      }
    });
  }

  private async getUniqueSlug(name: string) {
    const baseSlug = slugify(name) || "project";
    const existingSlugs = new Set(
      this.database.db
        .select({ slug: projectsTable.slug })
        .from(projectsTable)
        .where(
          inArray(
            projectsTable.slug,
            Array.from({ length: 50 }, (_, index) =>
              index === 0 ? baseSlug : `${baseSlug}-${index + 1}`,
            ),
          ),
        )
        .all()
        .map((row) => row.slug),
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;
    while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseSlug}-${suffix}`;
  }
}

export const sqliteProjectRepository = new SQLiteProjectRepository();
