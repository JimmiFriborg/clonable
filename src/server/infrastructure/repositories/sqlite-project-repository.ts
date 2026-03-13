import crypto from "node:crypto";
import path from "node:path";

import { asc, eq, inArray } from "drizzle-orm";

import { defaultAgentTemplates } from "@/server/domain/default-agent-templates";
import type { ProjectRepository } from "@/server/domain/project-repository";
import type {
  AgentRecord,
  EventInput,
  EventRecord,
  FeatureCreateInput,
  PlannerDraft,
  PhaseCreateInput,
  PreviewRecord,
  PreviewLogRecord,
  ProjectDashboardModel,
  ProjectIntakeInput,
  ProjectMvpUpdateInput,
  ProjectRecord,
  ProjectStatus,
  TaskCreateInput,
  TaskHistoryRecord,
  TaskStatusUpdateInput,
  WorkspaceFileRecord,
  WorkspaceRecord,
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
  tasksTable,
  workspaceStateTable,
} from "@/server/infrastructure/database/schema";

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

function getDefaultAgentStatus(name: string): AgentRecord["status"] {
  if (name === "Fixer") {
    return "paused";
  }

  if (
    name === "Product Planner" ||
    name === "Project Manager" ||
    name === "Documentation Agent"
  ) {
    return "active";
  }

  return "ready";
}

function buildWorkspaceState(slug: string): WorkspaceRecord {
  return {
    rootPath: path.resolve(process.cwd(), "projects", slug),
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

function buildDefaultProject(input: ProjectIntakeInput, slug: string): ProjectRecord {
  const createdAt = nowIso();
  const projectId = randomId("project");
  const workspace = buildWorkspaceState(slug);

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
      status: getDefaultAgentStatus(template.name),
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
    workspace,
    preview: buildPreviewState(),
  };
}

function createTaskHistory(summary: string, reason: string): TaskHistoryRecord[] {
  return [
    {
      at: nowIso(),
      summary,
      reason,
    },
  ];
}

function createTaskHistoryEntry(summary: string, reason: string): TaskHistoryRecord {
  return {
    at: nowIso(),
    summary,
    reason,
  };
}

function hasStartedTask(project: ProjectRecord, scopeId: string, key: "phaseId" | "featureId") {
  return project.tasks.some(
    (task) =>
      task[key] === scopeId &&
      ["In Progress", "Review", "Blocked", "Done"].includes(task.status),
  );
}

function syncProjectState(project: ProjectRecord): ProjectRecord {
  const features = project.features.map((feature) => {
    const tasks = project.tasks.filter((task) => task.featureId === feature.id);

    if (tasks.length === 0) {
      return feature;
    }

    if (tasks.every((task) => task.status === "Done")) {
      return {
        ...feature,
        status: "Done" as const,
      };
    }

    if (hasStartedTask(project, feature.id, "featureId")) {
      return {
        ...feature,
        status: "In Progress" as const,
      };
    }

    return {
      ...feature,
      status: feature.status === "Done" ? "Planned" : feature.status,
    };
  });

  const featuresById = new Map(features.map((feature) => [feature.id, feature]));
  const phases = project.phases.map((phase) => {
    const tasks = project.tasks.filter((task) => task.phaseId === phase.id);

    if (tasks.length === 0) {
      return phase;
    }

    if (tasks.every((task) => task.status === "Done")) {
      return {
        ...phase,
        status: "Done" as const,
      };
    }

    const phaseFeatures = features.filter((feature) => feature.phaseId === phase.id);
    const hasStartedFeature = phaseFeatures.some(
      (feature) => featuresById.get(feature.id)?.status === "In Progress",
    );

    if (hasStartedFeature || hasStartedTask(project, phase.id, "phaseId")) {
      return {
        ...phase,
        status: "In Progress" as const,
      };
    }

    return {
      ...phase,
      status: phase.status === "Done" ? "Planned" : phase.status,
    };
  });

  const syncedProject = {
    ...project,
    features,
    phases,
  };
  const dashboard = buildProjectDashboardModel(syncedProject);

  let currentFocus = project.currentFocus;
  if (project.phases.length === 0) {
    currentFocus = "Define the first phase for the MVP.";
  } else if (project.features.length === 0) {
    currentFocus = `Break ${project.phases[0]?.title ?? "the MVP"} into features.`;
  } else if (project.tasks.length === 0) {
    currentFocus = `Create the first actionable task for ${project.features[0]?.title ?? "the MVP"}.`;
  } else if (dashboard.blockers[0]) {
    currentFocus = `Resolve blockers on ${dashboard.blockers[0].title}.`;
  } else if (dashboard.nextTasks[0]) {
    currentFocus = `Focus on ${dashboard.nextTasks[0].title}.`;
  } else if (
    dashboard.counts.totalTasks > 0 &&
    dashboard.counts.doneTasks === dashboard.counts.totalTasks
  ) {
    currentFocus = "Review completed MVP work and choose the next slice.";
  }

  let status: ProjectStatus = "Planning";
  if (project.tasks.length === 0) {
    status = "Planning";
  } else if (dashboard.counts.doneTasks === dashboard.counts.totalTasks) {
    status = "Review";
  } else if (
    project.tasks.some((task) =>
      ["In Progress", "Review", "Blocked", "Done"].includes(task.status),
    )
  ) {
    status = "Building";
  }

  return {
    ...syncedProject,
    status,
    currentFocus,
  };
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
      priority: feature.priority as ProjectRecord["features"][number]["priority"],
      sortOrder: feature.sortOrder,
    }));

  const tasks = db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId))
    .orderBy(asc(tasksTable.sortOrder))
    .all()
    .map((task) => ({
      id: task.id,
      phaseId: task.phaseId,
      featureId: task.featureId,
      title: task.title,
      description: task.description,
      status: task.status as ProjectRecord["tasks"][number]["status"],
      priority: task.priority as ProjectRecord["tasks"][number]["priority"],
      assigneeAgentId: task.assigneeAgentId ?? undefined,
      dependencies: parseJson(task.dependencies, [] as string[]),
      blockers: parseJson(task.blockers, [] as string[]),
      acceptanceCriteria: parseJson(task.acceptanceCriteria, [] as string[]),
      relatedFiles: parseJson(task.relatedFiles, [] as string[]),
      artifacts: parseJson(task.artifacts, [] as string[]),
      history: parseJson(task.history, [] as TaskHistoryRecord[]),
      completedAt: task.completedAt ?? undefined,
    }));

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
      model: agent.model,
      status: agent.status as AgentRecord["status"],
      instructionsSummary: agent.instructionsSummary,
      permissions: parseJson(agent.permissions, [] as string[]),
      boundaries: parseJson(agent.boundaries, [] as string[]),
      escalationRules: parseJson(agent.escalationRules, [] as string[]),
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
    .orderBy(asc(agentRunsTable.startedAt))
    .all()
    .map((run) => ({
      id: run.id,
      agentId: run.agentId,
      taskId: run.taskId ?? undefined,
      status: run.status as ProjectRecord["agentRuns"][number]["status"],
      summary: run.summary,
      startedAt: run.startedAt,
      endedAt: run.endedAt ?? undefined,
    }));

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

  return {
    id: projectRow.id,
    slug: projectRow.slug,
    name: projectRow.name,
    summary: projectRow.summary,
    status: projectRow.status as ProjectStatus,
    currentFocus: projectRow.currentFocus,
    vision: projectRow.vision,
    plannerState: projectRow.plannerState as ProjectRecord["plannerState"],
    plannerMessage: projectRow.plannerMessage ?? defaultPlannerMessage(projectRow.plannerState as ProjectRecord["plannerState"]),
    targetUser: projectRow.targetUser,
    ideaPrompt: projectRow.ideaPrompt,
    stackPreferences: parseJson(projectRow.stackPreferences, [] as string[]),
    constraints: parseJson(projectRow.constraints, [] as string[]),
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
          lastRestartedAt: previewRow.lastRestartedAt ?? undefined,
          recentLogs: parseJson(previewRow.recentLogs, [] as PreviewLogRecord[]),
        }
      : buildPreviewState(),
  };
}

function insertProjectGraph(db: AppDatabase, project: ProjectRecord) {
  const now = nowIso();

  db.insert(projectsTable)
    .values({
      id: project.id,
      slug: project.slug,
      name: project.name,
      summary: project.summary,
      status: project.status,
      currentFocus: project.currentFocus,
      vision: project.vision,
      plannerState: project.plannerState,
      plannerMessage: project.plannerMessage ?? null,
      targetUser: project.targetUser,
      ideaPrompt: project.ideaPrompt,
      stackPreferences: serializeJson(project.stackPreferences),
      constraints: serializeJson(project.constraints),
      workspacePath: project.workspace.rootPath,
      repoProvider: project.workspace.repoProvider,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(mvpDefinitionsTable)
    .values({
      projectId: project.id,
      goalStatement: project.mvp.goalStatement,
      summary: project.mvp.summary,
      successDefinition: project.mvp.successDefinition,
      laterScope: serializeJson(project.mvp.laterScope),
      boundaryReasoning: project.mvp.boundaryReasoning,
      constraints: serializeJson(project.mvp.constraints),
      createdAt: now,
      updatedAt: now,
    })
    .run();

  if (project.phases.length > 0) {
    db.insert(phasesTable)
      .values(
        project.phases.map((phase) => ({
          id: phase.id,
          projectId: project.id,
          title: phase.title,
          goal: phase.goal,
          status: phase.status,
          sortOrder: phase.sortOrder,
        })),
      )
      .run();
  }

  if (project.features.length > 0) {
    db.insert(featuresTable)
      .values(
        project.features.map((feature) => ({
          id: feature.id,
          projectId: project.id,
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

  if (project.tasks.length > 0) {
    db.insert(tasksTable)
      .values(
        project.tasks.map((task, index) => ({
          id: task.id,
          projectId: project.id,
          phaseId: task.phaseId,
          featureId: task.featureId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigneeAgentId: task.assigneeAgentId ?? null,
          dependencies: serializeJson(task.dependencies),
          blockers: serializeJson(task.blockers),
          acceptanceCriteria: serializeJson(task.acceptanceCriteria),
          relatedFiles: serializeJson(task.relatedFiles),
          artifacts: serializeJson(task.artifacts),
          history: serializeJson(task.history),
          completedAt: task.completedAt ?? null,
          sortOrder: index + 1,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .run();
  }

  db.insert(agentsTable)
    .values(
      project.agents.map((agent) => ({
        id: agent.id,
        projectId: project.id,
        name: agent.name,
        role: agent.role,
        model: agent.model,
        status: agent.status,
        instructionsSummary: agent.instructionsSummary,
        permissions: serializeJson(agent.permissions),
        boundaries: serializeJson(agent.boundaries),
        escalationRules: serializeJson(agent.escalationRules),
        currentTaskId: agent.currentTaskId ?? null,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .run();

  db.insert(workspaceStateTable)
    .values({
      projectId: project.id,
      rootPath: project.workspace.rootPath,
      repoProvider: project.workspace.repoProvider,
      branch: project.workspace.branch,
      lastCommit: project.workspace.lastCommit,
      dirtyFiles: serializeJson(project.workspace.dirtyFiles),
      files: serializeJson(project.workspace.files),
    })
    .run();

  db.insert(previewStateTable)
    .values({
      projectId: project.id,
      status: project.preview.status,
      command: project.preview.command,
      port: project.preview.port,
      url: project.preview.url,
      lastRestartedAt: project.preview.lastRestartedAt ?? null,
      recentLogs: serializeJson(project.preview.recentLogs),
    })
    .run();

  if (project.events.length > 0) {
    db.insert(eventsTable)
      .values(
        project.events.map((event) => ({
          id: event.id,
          projectId: project.id,
          type: event.type,
          summary: event.summary,
          reason: event.reason,
          payload: serializeJson(event.payload ?? {}),
          createdAt: event.createdAt,
        })),
      )
      .run();
  }
}

function createDraftArtifacts(
  projectId: string,
  draft: PlannerDraft,
): Pick<ProjectRecord, "phases" | "features" | "tasks"> {
  const phaseMap = new Map<string, string>();
  const phases = draft.phases.map((phase, index) => {
    const phaseId = `${projectId}-phase-${slugify(phase.title) || index + 1}`;
    phaseMap.set(phase.title, phaseId);

    return {
      id: phaseId,
      title: phase.title,
      goal: phase.goal,
      status: index === 0 ? "In Progress" : "Planned",
      sortOrder: index + 1,
    } as ProjectRecord["phases"][number];
  });

  const featureMap = new Map<string, string>();
  const features = draft.features.map((feature, index) => {
    const featureId = `${projectId}-feature-${slugify(feature.title) || index + 1}`;
    featureMap.set(feature.title, featureId);

    return {
      id: featureId,
      phaseId: phaseMap.get(feature.phaseTitle) ?? phases[0]?.id ?? `${projectId}-phase-unassigned`,
      title: feature.title,
      summary: feature.summary,
      status: "Planned",
      priority: feature.priority,
      sortOrder: index + 1,
    } as ProjectRecord["features"][number];
  });

  const taskIdByTitle = new Map<string, string>();
  draft.tasks.forEach((task, index) => {
    taskIdByTitle.set(task.title, `${projectId}-task-${slugify(task.title) || index + 1}`);
  });

  const tasks = draft.tasks.map((task) => {
    const feature = features.find((candidate) => candidate.title === task.featureTitle) ?? features[0];
    const dependencies = task.dependsOn
      .map((dependencyTitle) => taskIdByTitle.get(dependencyTitle))
      .filter((dependencyId): dependencyId is string => Boolean(dependencyId));
    const status = dependencies.length === 0 ? "Ready" : "Planned";

    return {
      id: taskIdByTitle.get(task.title) ?? randomId("task"),
      phaseId: feature?.phaseId ?? phases[0]?.id ?? randomId("phase"),
      featureId: feature?.id ?? randomId("feature"),
      title: task.title,
      description: task.description,
      status,
      priority: task.priority,
      dependencies,
      blockers: [],
      acceptanceCriteria: task.acceptanceCriteria,
      relatedFiles: [],
      artifacts: [],
      history: createTaskHistory(
        "Task drafted",
        "Generated by the planner from the project intake prompt.",
      ),
    } as ProjectRecord["tasks"][number];
  });

  return { phases, features, tasks };
}

function mapDraftToProject(
  project: ProjectRecord,
  draft: PlannerDraft,
  plannerState: ProjectRecord["plannerState"],
  plannerMessage?: string,
) {
  const { phases, features, tasks } = createDraftArtifacts(project.id, draft);
  const nextReadyTask = tasks.find((task) => task.status === "Ready");

  return {
    ...project,
    summary: draft.mvpSummary,
    status: "Planning" as const,
    currentFocus: nextReadyTask
      ? `Review the MVP draft and start with ${nextReadyTask.title}.`
      : "Review the MVP draft and confirm the first planning phase.",
    vision: draft.vision,
    plannerState,
    plannerMessage: plannerMessage ?? defaultPlannerMessage(plannerState),
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
  };
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

  async createProject(input: ProjectIntakeInput) {
    const slug = await this.getUniqueSlug(input.name);
    const project = buildDefaultProject(input, slug);

    this.database.db.transaction((tx) => {
      insertProjectGraph(tx, project);
    });

    return project;
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

    const updatedProject = {
      ...project,
      summary: fallback.summary,
      status: "Planning" as const,
      currentFocus:
        "Planner was unavailable. Review the manual MVP draft and define the smallest credible scope.",
      vision: fallback.vision,
      plannerState: "failed" as const,
      plannerMessage: reason,
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
    };

    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async updateMvpDefinition(projectId: string, input: ProjectMvpUpdateInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const updatedProject = {
      ...project,
      summary: input.summary,
      vision: input.vision,
      currentFocus:
        "MVP draft updated. Confirm the boundary and move into the first planning task.",
      plannerState: "manual" as const,
      plannerMessage: defaultPlannerMessage("manual"),
      mvp: {
        goalStatement: input.goalStatement,
        summary: input.summary,
        successDefinition: input.successDefinition,
        laterScope: input.laterScope,
        boundaryReasoning: input.boundaryReasoning,
        constraints: input.constraints,
      },
    };

    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async createPhase(projectId: string, input: PhaseCreateInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const updatedProject = syncProjectState({
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

    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async createFeature(projectId: string, input: FeatureCreateInput) {
    const project = await this.getProject(projectId);

    if (!project || !project.phases.some((phase) => phase.id === input.phaseId)) {
      return undefined;
    }

    const updatedProject = syncProjectState({
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

    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async createTask(projectId: string, input: TaskCreateInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const feature = project.features.find((candidate) => candidate.id === input.featureId);

    if (!feature) {
      return undefined;
    }

    const dependencies = input.dependencies.filter((dependencyId) =>
      project.tasks.some((task) => task.id === dependencyId),
    );

    const updatedProject = syncProjectState({
      ...project,
      tasks: [
        ...project.tasks,
        {
          id: `${project.id}-task-${slugify(input.title) || project.tasks.length + 1}-${crypto.randomUUID().slice(0, 8)}`,
          phaseId: feature.phaseId,
          featureId: feature.id,
          title: input.title,
          description: input.description,
          status: dependencies.length === 0 ? "Ready" : "Planned",
          priority: input.priority,
          dependencies,
          blockers: [],
          acceptanceCriteria: input.acceptanceCriteria,
          relatedFiles: [],
          artifacts: [],
          history: createTaskHistory(
            "Task created",
            "Added manually from the planning interface.",
          ),
        },
      ],
    });

    this.persistProjectGraph(updatedProject);
    return updatedProject;
  }

  async updateTaskStatus(projectId: string, taskId: string, input: TaskStatusUpdateInput) {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const existingTask = project.tasks.find((task) => task.id === taskId);

    if (!existingTask) {
      return undefined;
    }

    const updatedProject = syncProjectState({
      ...project,
      tasks: project.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          status: input.status,
          completedAt: input.status === "Done" ? nowIso() : undefined,
          history: [
            ...task.history,
            createTaskHistoryEntry(
              `Status set to ${input.status}`,
              `Updated manually from ${task.status} to ${input.status}.`,
            ),
          ],
        };
      }),
    });

    this.persistProjectGraph(updatedProject);
    return updatedProject;
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
      tx.update(projectsTable)
        .set({
          name: project.name,
          summary: project.summary,
          status: project.status,
          currentFocus: project.currentFocus,
          vision: project.vision,
          plannerState: project.plannerState,
          plannerMessage: project.plannerMessage ?? null,
          targetUser: project.targetUser,
          ideaPrompt: project.ideaPrompt,
          stackPreferences: serializeJson(project.stackPreferences),
          constraints: serializeJson(project.constraints),
          workspacePath: project.workspace.rootPath,
          repoProvider: project.workspace.repoProvider,
          updatedAt: nowIso(),
        })
        .where(eq(projectsTable.id, project.id))
        .run();

      tx.insert(mvpDefinitionsTable)
        .values({
          projectId: project.id,
          goalStatement: project.mvp.goalStatement,
          summary: project.mvp.summary,
          successDefinition: project.mvp.successDefinition,
          laterScope: serializeJson(project.mvp.laterScope),
          boundaryReasoning: project.mvp.boundaryReasoning,
          constraints: serializeJson(project.mvp.constraints),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        })
        .onConflictDoUpdate({
          target: mvpDefinitionsTable.projectId,
          set: {
            goalStatement: project.mvp.goalStatement,
            summary: project.mvp.summary,
            successDefinition: project.mvp.successDefinition,
            laterScope: serializeJson(project.mvp.laterScope),
            boundaryReasoning: project.mvp.boundaryReasoning,
            constraints: serializeJson(project.mvp.constraints),
            updatedAt: nowIso(),
          },
        })
        .run();

      tx.delete(tasksTable).where(eq(tasksTable.projectId, project.id)).run();
      tx.delete(featuresTable).where(eq(featuresTable.projectId, project.id)).run();
      tx.delete(phasesTable).where(eq(phasesTable.projectId, project.id)).run();

      if (project.phases.length > 0) {
        tx.insert(phasesTable)
          .values(
            project.phases.map((phase) => ({
              id: phase.id,
              projectId: project.id,
              title: phase.title,
              goal: phase.goal,
              status: phase.status,
              sortOrder: phase.sortOrder,
            })),
          )
          .run();
      }

      if (project.features.length > 0) {
        tx.insert(featuresTable)
          .values(
            project.features.map((feature) => ({
              id: feature.id,
              projectId: project.id,
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

      if (project.tasks.length > 0) {
        tx.insert(tasksTable)
          .values(
            project.tasks.map((task, index) => ({
              id: task.id,
              projectId: project.id,
              phaseId: task.phaseId,
              featureId: task.featureId,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              assigneeAgentId: task.assigneeAgentId ?? null,
              dependencies: serializeJson(task.dependencies),
              blockers: serializeJson(task.blockers),
              acceptanceCriteria: serializeJson(task.acceptanceCriteria),
              relatedFiles: serializeJson(task.relatedFiles),
              artifacts: serializeJson(task.artifacts),
              history: serializeJson(task.history),
              completedAt: task.completedAt ?? null,
              sortOrder: index + 1,
              createdAt: nowIso(),
              updatedAt: nowIso(),
            })),
          )
          .run();
      }

      tx.update(workspaceStateTable)
        .set({
          rootPath: project.workspace.rootPath,
          repoProvider: project.workspace.repoProvider,
          branch: project.workspace.branch,
          lastCommit: project.workspace.lastCommit,
          dirtyFiles: serializeJson(project.workspace.dirtyFiles),
          files: serializeJson(project.workspace.files),
        })
        .where(eq(workspaceStateTable.projectId, project.id))
        .run();

      tx.update(previewStateTable)
        .set({
          status: project.preview.status,
          command: project.preview.command,
          port: project.preview.port,
          url: project.preview.url,
          lastRestartedAt: project.preview.lastRestartedAt ?? null,
          recentLogs: serializeJson(project.preview.recentLogs),
        })
        .where(eq(previewStateTable.projectId, project.id))
        .run();
    });
  }

  private async getUniqueSlug(name: string) {
    const baseSlug = slugify(name) || "project";
    const existingSlugs = new Set(
      this.database.db
        .select({ slug: projectsTable.slug })
        .from(projectsTable)
        .where(inArray(projectsTable.slug, Array.from({ length: 50 }, (_, index) =>
          index === 0 ? baseSlug : `${baseSlug}-${index + 1}`,
        )))
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
