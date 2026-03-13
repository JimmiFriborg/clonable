import {
  priorityOrder,
  taskStatusOrder,
  type ProgressSlice,
  type ProjectDashboardModel,
  type ProjectRecord,
  type TaskRecord,
} from "@/server/domain/project";
import { demoProjects, findDemoProject } from "@/server/infrastructure/demo-project-repository";

function isDone(task: TaskRecord) {
  return task.status === "Done";
}

function buildProgressSlices(
  project: ProjectRecord,
  groupBy: "phaseId" | "featureId",
): ProgressSlice[] {
  const groups =
    groupBy === "phaseId"
      ? project.phases.map((phase) => ({
          id: phase.id,
          title: phase.title,
          status: phase.status,
        }))
      : project.features.map((feature) => ({
          id: feature.id,
          title: feature.title,
          status: feature.status,
        }));

  return groups.map((group) => {
    const tasks = project.tasks.filter((task) => task[groupBy] === group.id);
    const completedTasks = tasks.filter(isDone).length;
    const totalTasks = tasks.length;
    const progressPercent =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      id: group.id,
      title: group.title,
      status: group.status,
      completedTasks,
      totalTasks,
      progressPercent,
    };
  });
}

function dependenciesSatisfied(task: TaskRecord, project: ProjectRecord) {
  const byId = new Map(project.tasks.map((candidate) => [candidate.id, candidate]));
  return task.dependencies.every((dependencyId) => byId.get(dependencyId)?.status === "Done");
}

function sortTasksForRecommendation(project: ProjectRecord, left: TaskRecord, right: TaskRecord) {
  const statusRank = (status: TaskRecord["status"]) =>
    ["Ready", "In Progress", "Planned", "Inbox", "Review", "Blocked", "Done"].indexOf(status);

  const dependencyUnlockCount = (task: TaskRecord) =>
    project.tasks.filter((candidate) => candidate.dependencies.includes(task.id)).length;

  const priorityRank = (priority: TaskRecord["priority"]) => priorityOrder.indexOf(priority);

  return (
    statusRank(left.status) - statusRank(right.status) ||
    priorityRank(left.priority) - priorityRank(right.priority) ||
    dependencyUnlockCount(right) - dependencyUnlockCount(left) ||
    left.title.localeCompare(right.title)
  );
}

function buildTaskColumns(project: ProjectRecord) {
  return taskStatusOrder.map((status) => ({
    status,
    tasks: project.tasks
      .filter((task) => task.status === status)
      .sort((left, right) => sortTasksForRecommendation(project, left, right)),
  }));
}

export function listProjects() {
  return demoProjects.map((project) => {
    const doneTasks = project.tasks.filter(isDone).length;
    const totalTasks = project.tasks.length;
    const progressPercent = Math.round((doneTasks / totalTasks) * 100);
    const blockedTasks = project.tasks.filter((task) => task.status === "Blocked").length;

    return {
      id: project.id,
      name: project.name,
      summary: project.summary,
      status: project.status,
      progressPercent,
      blockedTasks,
      currentFocus: project.currentFocus,
    };
  });
}

export function getProjectDashboard(projectId: string): ProjectDashboardModel | undefined {
  const project = findDemoProject(projectId);

  if (!project) {
    return undefined;
  }

  const phaseProgress = buildProgressSlices(project, "phaseId");
  const featureProgress = buildProgressSlices(project, "featureId");
  const currentPhase =
    project.phases.find((phase) => phase.status === "In Progress") ??
    project.phases.find((phase) => phase.status === "Planned");

  const nextTasks = project.tasks
    .filter(
      (task) =>
        ["Ready", "In Progress", "Planned"].includes(task.status) &&
        task.blockers.length === 0 &&
        dependenciesSatisfied(task, project),
    )
    .sort((left, right) => sortTasksForRecommendation(project, left, right))
    .slice(0, 3);

  const blockers = project.tasks.filter((task) => task.status === "Blocked");
  const recentCompletedTasks = [...project.tasks]
    .filter((task) => task.completedAt)
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))
    .slice(0, 4);

  const activeAgents = project.agents.filter(
    (agent) => agent.status === "active" || agent.status === "ready",
  );

  return {
    project,
    currentPhase,
    nextTasks,
    blockers,
    recentCompletedTasks,
    activeAgents,
    phaseProgress,
    featureProgress,
    taskColumns: buildTaskColumns(project),
    counts: {
      totalTasks: project.tasks.length,
      doneTasks: project.tasks.filter(isDone).length,
      blockedTasks: blockers.length,
      activeAgents: activeAgents.length,
    },
  };
}
