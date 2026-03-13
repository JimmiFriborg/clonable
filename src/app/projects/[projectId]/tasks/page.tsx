import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/features/projects/components/status-badge";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Tasks"
        title="Actionable work with acceptance criteria"
        description="Tasks are the execution unit. They carry dependencies, blockers, related files, artifacts, and history so agents do useful work without becoming opaque."
      />

      <div className="grid gap-5">
        {dashboard.project.tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <TaskStatusBadge status={task.status} />
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
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Dependencies</p>
                  <p className="mt-2 font-medium">{task.dependencies.length || "None"}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-950/[0.03] p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Artifacts</p>
                  <p className="mt-2 font-medium">{task.artifacts.length || "None"}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-950/[0.03] p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Assignee</p>
                  <p className="mt-2 font-medium">{task.assigneeAgentId ?? "Unassigned"}</p>
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
                    Related files
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.relatedFiles.map((file) => (
                      <span
                        key={file}
                        className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                    Latest history
                  </p>
                  <div className="mt-3 space-y-3">
                    {task.history.slice(-2).map((entry) => (
                      <div
                        key={`${task.id}-${entry.at}`}
                        className="rounded-[22px] border border-slate-200 bg-slate-950/[0.03] px-4 py-3 text-sm text-slate-700"
                      >
                        <p className="font-medium text-slate-900">{entry.summary}</p>
                        <p className="mt-1">{entry.reason}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                          {entry.at}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
