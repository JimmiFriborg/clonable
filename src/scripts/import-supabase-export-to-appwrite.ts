import fs from "node:fs";
import path from "node:path";

import { defaultAgentTemplates } from "@/server/domain/default-agent-templates";
import type {
  AgentRecord,
  AgentPolicyRole,
  EventRecord,
  FeatureRecord,
  PhaseRecord,
  PreviewRecord,
  ProjectRecord,
  ProjectStatus,
  TaskPriority,
  TaskRecord,
  TaskState,
  WorkspaceRecord,
} from "@/server/domain/project";
import { sqliteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";
import { syncProjectMetadataToAppwrite } from "@/server/infrastructure/appwrite/metadata-sync";

interface SupabaseExport {
  projects?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  milestones?: Array<Record<string, unknown>>;
  project_documents?: Array<Record<string, unknown>>;
  agent_roles?: Array<Record<string, unknown>>;
  agent_runs?: Array<Record<string, unknown>>;
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function mapStatus(status: string): TaskState {
  switch (status) {
    case "backlog":
      return "Backlog";
    case "ready":
      return "Ready";
    case "in_progress":
      return "In_Progress";
    case "qa_review":
      return "QA_Review";
    case "waiting":
      return "Waiting";
    case "blocked":
      return "Blocked";
    case "done":
      return "Done";
    case "needs_clarification":
      return "Blocked";
    case "self_check":
      return "In_Progress";
    default:
      return "Backlog";
  }
}

function mapPriority(priority: string): TaskPriority {
  switch (priority) {
    case "blocker":
    case "high":
    case "normal":
    case "low":
      return priority;
    case "urgent":
      return "blocker";
    case "medium":
      return "normal";
    default:
      return "normal";
  }
}

function buildWorkspaceState(slug: string): WorkspaceRecord {
  return {
    rootPath: path.resolve(process.cwd(), "projects", slug),
    repoProvider: "Local Git",
    branch: "main",
    lastCommit: "Imported from Supabase export",
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
        line: "Imported project. Preview has not been started on this machine yet.",
      },
    ],
  };
}

function mapAgents(projectId: string, roles: Array<Record<string, unknown>>): AgentRecord[] {
  const imported = roles.map((role, index) => ({
    id: asString(role.id, `imported-agent-${index}`),
    name: asString(role.name, `Imported Agent ${index + 1}`),
    role: asString(role.description, "Imported from ai-project-navigator."),
    policyRole: (
      role.name === "Orchestrator"
        ? "orchestrator"
        : role.name === "Tester" || role.name === "Reviewer"
          ? "tester"
          : "builder"
    ) as AgentPolicyRole,
    model: asString(role.ai_model, asString(role.model, "GPT-5.4")),
    status: "ready" as const,
    enabled: true,
    instructionsSummary: asString(role.description, "Imported agent"),
    instructions: asString(role.system_prompt, "Imported from ai-project-navigator export."),
    permissions: [],
    boundaries: ["imported from navigator"],
    escalationRules: [],
    wipLimit: undefined,
    canWriteWorkspace: role.name === "Builder",
  }));

  if (imported.length > 0) {
    return imported;
  }

  return defaultAgentTemplates.map((template, index) => ({
    id: `${projectId}-agent-${index + 1}`,
    ...template,
  }));
}

function mapProjectRecord(
  project: Record<string, unknown>,
  payload: SupabaseExport,
): ProjectRecord {
  const projectId = asString(project.id);
  const projectName = asString(project.name, "Imported Project");
  const slug = slugify(projectName);
  const milestones = (payload.milestones ?? []).filter(
    (item) => asString(item.project_id) === projectId,
  );
  const tasks = (payload.tasks ?? []).filter((item) => asString(item.project_id) === projectId);
  const documents = (payload.project_documents ?? []).filter(
    (item) => asString(item.project_id) === projectId,
  );
  const roles = (payload.agent_roles ?? []).filter(
    (item) => asString(item.project_id) === projectId,
  );
  const runs = (payload.agent_runs ?? []).filter(
    (item) => asString(item.project_id) === projectId,
  );

  const phases: PhaseRecord[] = milestones.map((milestone, index) => ({
    id: asString(milestone.id, `${projectId}-phase-${index + 1}`),
    title: asString(milestone.title, `Phase ${index + 1}`),
    goal: asString(milestone.description, "Imported from ai-project-navigator."),
    status: asString(milestone.status) === "completed" ? "Done" : "In Progress",
    sortOrder: Number(milestone.sort_order ?? index),
  }));

  const fallbackPhaseId = phases[0]?.id ?? `${projectId}-phase-default`;
  if (phases.length === 0) {
    phases.push({
      id: fallbackPhaseId,
      title: "Imported Plan",
      goal: "Recovered from ai-project-navigator export.",
      status: "In Progress",
      sortOrder: 0,
    });
  }

  const features: FeatureRecord[] = phases.map((phase, index) => ({
    id: `${phase.id}-feature`,
    phaseId: phase.id,
    title: phase.title,
    summary: phase.goal,
    status: phase.status,
    priority: "normal",
    sortOrder: index,
  }));

  const taskRecords: TaskRecord[] = tasks.map((task, index) => ({
    id: asString(task.id, `${projectId}-task-${index + 1}`),
    phaseId: fallbackPhaseId,
    featureId: features[0]?.id ?? `${fallbackPhaseId}-feature`,
    title: asString(task.title, `Imported Task ${index + 1}`),
    description: asString(task.description, "Imported from ai-project-navigator."),
    state: mapStatus(asString(task.status)),
    ownerAgentId: asString(task.assigned_role) || undefined,
    priority: mapPriority(asString(task.priority)),
    acceptanceCriteria: asArray(task.acceptance_criteria).map((item) => asString(item)).filter(Boolean),
    lastUpdated: asString(task.updated_at, nowIso()),
    notes: asString(task.description, ""),
    collectiveQa: false,
    nextRole: undefined,
    parentTaskId: undefined,
    subTaskIds: [],
    dependencies: [],
    optionalDependencies: [],
    blockerReason: asString(task.blocked_reason) || undefined,
    waitingReason: asString(task.waiting_reason) || undefined,
    lastImplementationOwnerAgentId: asString(task.last_implementation_owner) || undefined,
    requiresUser: false,
    reviewDate: undefined,
    changeLog: [],
    rejectionLog: [],
    relatedFiles: [],
    artifacts: [],
    completedAt: mapStatus(asString(task.status)) === "Done" ? asString(task.updated_at, nowIso()) : undefined,
  }));

  const overviewDoc = documents.find(
    (document) => asString(document.doc_type) === "overview",
  );
  const vision = asString(project.description, asString(overviewDoc?.content, projectName));
  const agents = mapAgents(projectId, roles);
  const agentByName = new Map(agents.map((agent) => [agent.name, agent.id]));

  for (const task of taskRecords) {
    if (task.ownerAgentId && agentByName.has(task.ownerAgentId)) {
      task.ownerAgentId = agentByName.get(task.ownerAgentId);
    }
  }

  const events: EventRecord[] = runs.map((run, index) => ({
    id: `${projectId}-event-${index + 1}`,
    createdAt: asString(run.created_at, nowIso()),
    type: "agent",
    summary: asString(run.agent_role_name, "Imported run"),
    reason: asString(run.summary, "Imported from ai-project-navigator."),
  }));

  return {
    id: projectId,
    slug,
    name: projectName,
    summary: asString(project.description, "Imported from ai-project-navigator."),
    status: "Planning" as ProjectStatus,
    currentFocus: phases[0]?.title ?? "Imported project",
    vision,
    plannerState: "manual",
    plannerMessage: "Imported from ai-project-navigator Supabase export.",
    targetUser: asString(project.target_user, "Imported target user"),
    ideaPrompt: asString(project.description, projectName),
    stackPreferences: ["Appwrite", "Next.js"],
    constraints: ["Imported from ai-project-navigator"],
    definitionOfDone: [
      "Imported MVP boundary is reviewed.",
      "Imported tasks use the canonical policy states.",
      "Appwrite and local runtime stay in sync.",
    ],
    mvp: {
      goalStatement: asString(project.name, "Imported project"),
      summary: asString(project.description, "Imported from ai-project-navigator."),
      successDefinition: "Stabilize the imported project under Clonable's task policy.",
      laterScope: [],
      boundaryReasoning: "Imported from ai-project-navigator and converted into the Clonable policy model.",
      constraints: ["Imported from ai-project-navigator"],
    },
    phases,
    features,
    tasks: taskRecords,
    agents,
    events,
    agentRuns: runs.map((run, index) => ({
      id: asString(run.id, `${projectId}-run-${index + 1}`),
      agentId: agentByName.get(asString(run.agent_role_name, "")) ?? agents[0]?.id ?? `${projectId}-agent-1`,
      taskId: undefined,
      status: asString(run.status, "Succeeded") as "Queued" | "Running" | "Succeeded" | "Failed" | "Cancelled",
      trigger: "manual",
      summary: asString(run.summary, "Imported run"),
      reason: asString(run.summary, "Imported from ai-project-navigator."),
      changedFiles: [],
      artifacts: [],
      createdAt: asString(run.created_at, nowIso()),
      endedAt: asString(run.completed_at) || undefined,
    })),
    runtime: {
      orchestrationEnabled: false,
      runnerStatus: "idle",
    },
    workspace: buildWorkspaceState(slug),
    preview: buildPreviewState(),
  };
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error("Usage: npm run appwrite:import-supabase -- <export.json>");
  }

  const raw = fs.readFileSync(path.resolve(filePath), "utf8");
  const payload = JSON.parse(raw) as SupabaseExport;
  const projects = payload.projects ?? [];

  for (const project of projects) {
    const record = mapProjectRecord(project, payload);
    await sqliteProjectRepository.seedDemoProject(record);
    await syncProjectMetadataToAppwrite(record);
    console.info(`Imported ${record.name} (${record.id}).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
