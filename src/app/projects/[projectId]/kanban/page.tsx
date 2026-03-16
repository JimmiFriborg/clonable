import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { transitionTaskAction } from "@/features/projects/actions";
import { PageIntro } from "@/features/projects/components/page-intro";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/features/projects/components/status-badge";
import { taskStateOrder } from "@/server/domain/project";
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

  const orchestratorId =
    dashboard.project.agents.find((agent) => agent.policyRole === "orchestrator")?.id ?? "";

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Kanban"
        title="Policy state is visible, but it is not the whole product"
        description="Kanban stays secondary to goal, MVP, phase, and feature context. It is still useful for inspecting the canonical policy states and their transitions."
      />

      <div className="grid gap-5 xl:grid-cols-4 2xl:grid-cols-8">
        {dashboard.taskColumns.map((column) => (
          <Card key={column.state} className="xl:min-h-[420px]">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{column.state}</CardTitle>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                {column.tasks.length}
              </span>
            </div>
            <CardDescription className="mt-2">
              {column.state === "Ready"
                ? "Ready work should already have an owner and cleared dependencies."
                : "Flow visibility without hiding ownership or policy reasons."}
            </CardDescription>

            <div className="mt-4 space-y-4">
              {column.tasks.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-950/[0.02] p-4 text-sm text-slate-500">
                  No tasks in this state yet.
                </div>
              ) : null}

              {column.tasks.map((task) => (
                <div key={task.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <TaskStatusBadge status={task.state} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <h3 className="mt-3 font-medium text-slate-950">{task.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>

                  <form
                    action={transitionTaskAction.bind(
                      null,
                      projectId,
                      task.id,
                      `/projects/${projectId}/kanban`,
                    )}
                    className="mt-4 grid gap-3"
                  >
                    <input type="hidden" name="agentId" value={orchestratorId} />
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Move task
                      </span>
                      <select
                        name="state"
                        defaultValue={task.state}
                        className="rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                      >
                        {taskStateOrder.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </label>

                    {task.state === "Blocked" || task.state === "Waiting" ? (
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Reason
                        </span>
                        <input
                          name={task.state === "Blocked" ? "blockerReason" : "waitingReason"}
                          defaultValue={task.blockerReason ?? task.waitingReason ?? ""}
                          className="rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                        />
                      </label>
                    ) : null}

                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                    >
                      Update state
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
