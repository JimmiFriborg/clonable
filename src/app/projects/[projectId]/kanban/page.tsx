import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { updateTaskStatusAction } from "@/features/projects/actions";
import { PageIntro } from "@/features/projects/components/page-intro";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/features/projects/components/status-badge";
import { taskStatusOrder } from "@/server/domain/project";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Kanban"
        title="Status sorting is useful, but it is not the whole product"
        description="Kanban exists as a secondary view for flow management. The primary mental model remains goal -> MVP -> phase -> feature -> task."
      />

      <div className="grid gap-5 xl:grid-cols-7">
        {dashboard.taskColumns.map((column) => (
          <Card key={column.status} className="xl:min-h-[420px]">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{column.status}</CardTitle>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                {column.tasks.length}
              </span>
            </div>
            <CardDescription className="mt-2">
              {column.status === "Ready"
                ? "Best place to look for the next meaningful task."
                : "Flow visibility without overwhelming the user."}
            </CardDescription>

            <div className="mt-4 space-y-4">
              {column.tasks.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-950/[0.02] p-4 text-sm text-slate-500">
                  No tasks in this column yet.
                </div>
              ) : null}

              {column.tasks.map((task) => (
                <div key={task.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <TaskStatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <h3 className="mt-3 font-medium text-slate-950">{task.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>

                  <form
                    action={updateTaskStatusAction.bind(
                      null,
                      projectId,
                      task.id,
                      `/projects/${projectId}/kanban`,
                    )}
                    className="mt-4 grid gap-3"
                  >
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Move task
                      </span>
                      <select
                        name="status"
                        defaultValue={task.status}
                        className="rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                      >
                        {taskStatusOrder.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                    >
                      Update status
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
