import {
  taskPriorityOrder,
  taskStateOrder,
  type ProgressSlice,
  type ProjectDashboardModel,
  type ProjectListItem,
  type ProjectRecord,
  type TaskRecord,
} from "@/server/domain/project";

function isDone(task: TaskRecord) {
  return task.state === "Done";
}

function dependenciesSatisfied(task: TaskRecord, project: ProjectRecord) {
  const byId = new Map(project.tasks.map((candidate) => [candidate.id, candidate]));
  return task.dependencies
    .filter((dependencyId) => !task.optionalDependencies.includes(dependencyId))
    .every((dependencyId) => byId.get(dependencyId)?.state === "Done");
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

    return {
      id: group.id,
      title: group.title,
      status: group.status,
      completedTasks,
      totalTasks,
      progressPercent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    };
  });
}

function taskStateRank(state: TaskRecord["state"]) {
  return ["Ready", "In_Progress", "QA_Review", "Backlog", "Waiting", "Blocked", "Split_Pending", "Done"].indexOf(
    state,
  );
}

function sortTasksForRecommendation(project: ProjectRecord, left: TaskRecord, right: TaskRecord) {
  const priorityRank = (priority: TaskRecord["priority"]) => taskPriorityOrder.indexOf(priority);
  const dependencyUnlockCount = (task: TaskRecord) =>
    project.tasks.filter((candidate) => candidate.dependencies.includes(task.id)).length;

  return (
    taskStateRank(left.state) - taskStateRank(right.state) ||
    priorityRank(left.priority) - priorityRank(right.priority) ||
    dependencyUnlockCount(right) - dependencyUnlockCount(left) ||
    left.title.localeCompare(right.title)
  );
}

export function buildProjectListItem(project: ProjectRecord): ProjectListItem {
  const doneTasks = project.tasks.filter(isDone).length;
  const totalTasks = project.tasks.length;

  return {
    id: project.id,
    name: project.name,
    summary: project.summary,
    status: project.status,
    progressPercent: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
    blockedTasks: project.tasks.filter((task) => task.state === "Blocked").length,
    currentFocus: project.currentFocus,
    plannerState: project.plannerState,
  };
}

export function buildProjectDashboardModel(project: ProjectRecord): ProjectDashboardModel {
  const phaseProgress = buildProgressSlices(project, "phaseId");
  const featureProgress = buildProgressSlices(project, "featureId");
  const currentPhase =
    project.phases.find((phase) => phase.status === "In Progress") ??
    project.phases.find((phase) => phase.status === "Planned");

  const nextTasks = project.tasks
    .filter(
      (task) =>
        ["Ready", "In_Progress", "Backlog"].includes(task.state) &&
        !task.blockerReason &&
        dependenciesSatisfied(task, project),
    )
    .sort((left, right) => sortTasksForRecommendation(project, left, right))
    .slice(0, 3);

  const blockers = project.tasks.filter((task) => task.state === "Blocked");
  const recentCompletedTasks = [...project.tasks]
    .filter((task) => task.completedAt)
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))
    .slice(0, 4);

  const activeAgents = project.agents.filter(
    (agent) => agent.enabled && (agent.status === "active" || agent.status === "ready"),
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
    taskColumns: taskStateOrder.map((state) => ({
      state,
      tasks: project.tasks
        .filter((task) => task.state === state)
        .sort((left, right) => sortTasksForRecommendation(project, left, right)),
    })),
    counts: {
      totalTasks: project.tasks.length,
      doneTasks: project.tasks.filter(isDone).length,
      blockedTasks: blockers.length,
      activeAgents: activeAgents.length,
    },
  };
}
