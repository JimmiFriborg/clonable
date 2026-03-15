import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { createProjectTaskAction } from "@/features/projects/actions";
import { PageIntro } from "@/features/projects/components/page-intro";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/features/projects/components/status-badge";
import { taskPriorityOrder } from "@/server/domain/project";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const createTaskFormAction = createProjectTaskAction.bind(
    null,
    projectId,
    `/projects/${projectId}/tasks`,
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Tasks"
        title="Actionable work with visible policy state"
        description="Tasks are the execution unit. They carry ownership, dependencies, change logs, rejection logs, related files, and artifacts so agent flow stays understandable."
      />

      <Card>
        <div className="max-w-2xl space-y-2">
          <CardTitle>Add a task</CardTitle>
          <CardDescription>
            New tasks begin in Backlog and pick up ownership through the policy flow so work
            does not quietly skip routing.
          </CardDescription>
        </div>

        <form action={createTaskFormAction} className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Feature</span>
            <select
              name="featureId"
              required
              disabled={dashboard.project.features.length === 0}
              defaultValue={dashboard.project.features[0]?.id ?? ""}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {dashboard.project.features.length === 0 ? (
                <option value="">Add a feature first</option>
              ) : (
                dashboard.project.features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.title}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Priority</span>
            <select
              name="priority"
              defaultValue="normal"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            >
              {taskPriorityOrder.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Task title</span>
            <input
              name="title"
              required
              placeholder="Route intake-created tasks through policy ownership"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Dependencies</span>
            <select
              name="dependencies"
              multiple
              size={Math.min(Math.max(dashboard.project.tasks.length, 3), 6)}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            >
              {dashboard.project.tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Description</span>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Implement a policy-safe task detail experience with ownership, transitions, and clear rejection reasons."
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Acceptance criteria</span>
            <textarea
              name="acceptanceCriteria"
              required
              rows={5}
              placeholder={"One line per criterion\nTask state is visible\nOwner is visible\nPolicy rejections are inspectable"}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="flex items-center gap-3 lg:col-span-2">
            <input type="hidden" name="requiresUser" value="false" />
            <input
              type="checkbox"
              name="requiresUser"
              value="true"
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <span className="text-sm text-slate-700">
              This task may require user input or approval.
            </span>
          </label>

          <div className="flex justify-end lg:col-span-2">
            <button
              type="submit"
              disabled={dashboard.project.features.length === 0}
              className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add task
            </button>
          </div>
        </form>
      </Card>

      {dashboard.project.tasks.length === 0 ? (
        <Card>
          <CardTitle>No tasks yet</CardTitle>
          <CardDescription className="mt-3">
            Once features are defined, tasks become the source of the &quot;what matters now&quot;
            view and the policy-controlled execution flow.
          </CardDescription>
        </Card>
      ) : null}

      <div className="grid gap-5">
        {dashboard.project.tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <TaskStatusBadge status={task.state} />
                  <PriorityBadge priority={task.priority} />
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                    {task.id}
                  </span>
                </div>
                <div>
                  <CardTitle>{task.title}</CardTitle>
                  <CardDescription className="mt-2">{task.description}</CardDescription>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                <div className="rounded-[22px] border border-slate-200 bg-slate-950/[0.03] p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Owner</p>
                  <p className="mt-2 font-medium">{task.ownerAgentId ?? "Unassigned"}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-950/[0.03] p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Dependencies</p>
                  <p className="mt-2 font-medium">{task.dependencies.length || "None"}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-950/[0.03] p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rejections</p>
                  <p className="mt-2 font-medium">{task.rejectionLog.length || "None"}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Acceptance criteria
                </p>
                <div className="mt-3 space-y-3">
                  {task.acceptanceCriteria.map((criterion) => (
                    <div
                      key={criterion}
                      className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      {criterion}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                    Latest change log
                  </p>
                  <div className="mt-3 space-y-3">
                    {task.changeLog.slice(-2).map((entry) => (
                      <div
                        key={`${task.id}-${entry.timestamp}-${entry.field}`}
                        className="rounded-[22px] border border-slate-200 bg-slate-950/[0.03] px-4 py-3 text-sm text-slate-700"
                      >
                        <p className="font-medium text-slate-900">{entry.field}</p>
                        <p className="mt-1">
                          {entry.from ?? "empty"}
                          {" -> "}
                          {entry.to ?? "empty"}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                          {entry.timestamp}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    href={`/projects/${projectId}/tasks/${task.id}`}
                    className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                  >
                    Open task detail
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
