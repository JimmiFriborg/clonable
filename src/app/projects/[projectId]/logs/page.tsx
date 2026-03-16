import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function LogsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const rejections = dashboard.project.tasks.flatMap((task) =>
    task.rejectionLog.map((entry) => ({
      taskId: task.id,
      taskTitle: task.title,
      ...entry,
    })),
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Logs"
        title="Automation stays trustable when the reasons are visible"
        description="Events, agent runs, and policy rejections make ownership changes, failures, and automation behavior inspectable instead of magical."
      />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Event timeline
          </p>
          <div className="mt-4 space-y-4">
            {dashboard.project.events.map((event) => (
              <div key={event.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{event.summary}</p>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                    {event.type}
                  </span>
                </div>
                <CardDescription className="mt-2">{event.reason}</CardDescription>
                <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                  {event.createdAt}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Agent runs
          </p>
          <div className="mt-4 space-y-4">
            {dashboard.project.agentRuns.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-950/[0.02] p-4 text-sm text-slate-500">
                No agent runs recorded yet.
              </div>
            ) : (
              dashboard.project.agentRuns
                .slice()
                .reverse()
                .map((run) => (
                  <div
                    key={run.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{run.summary}</CardTitle>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{run.reason}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                      Trigger: {run.trigger}
                    </p>
                    {run.outputSummary ? (
                      <p className="mt-2 text-sm text-slate-700">{run.outputSummary}</p>
                    ) : null}
                    {run.errorMessage ? (
                      <p className="mt-2 text-sm text-rose-700">{run.errorMessage}</p>
                    ) : null}
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                      {run.createdAt}
                      {run.endedAt ? ` -> ${run.endedAt}` : ""}
                    </p>
                  </div>
                ))
            )}
          </div>
        </Card>
      </section>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
          Policy rejections
        </p>
        <div className="mt-4 space-y-4">
          {rejections.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-950/[0.02] p-4 text-sm text-slate-500">
              No rejected transitions or field changes so far.
            </div>
          ) : (
            rejections
              .slice()
              .reverse()
              .map((entry) => (
                <div
                  key={`${entry.taskId}-${entry.timestamp}-${entry.rejectionReasonCode}`}
                  className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{entry.rejectionReasonCode}</p>
                    <span className="rounded-full bg-rose-900 px-3 py-1 text-xs font-semibold text-white">
                      {entry.taskTitle}
                    </span>
                  </div>
                  <p className="mt-2">{entry.rejectionNote}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-rose-700">
                    {entry.agentId} at {entry.timestamp}
                  </p>
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  );
}
