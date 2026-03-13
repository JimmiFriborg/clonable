import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";
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

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Logs"
        title="Automation stays trustable when the reasons are visible"
        description="Event history and agent run summaries make task movement, failures, and orchestration behavior inspectable instead of magical."
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
            {dashboard.project.agentRuns.map((run) => (
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
                <p className="mt-2 text-sm text-slate-600">
                  Agent: {run.agentId}
                  {run.taskId ? ` · Task: ${run.taskId}` : ""}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                  {run.startedAt}
                  {run.endedAt ? ` -> ${run.endedAt}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
