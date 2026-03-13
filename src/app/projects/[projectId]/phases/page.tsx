import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageIntro } from "@/features/projects/components/page-intro";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function PhasesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const featureCountByPhase = new Map(
    dashboard.project.phases.map((phase) => [
      phase.id,
      dashboard.project.features.filter((feature) => feature.phaseId === phase.id).length,
    ]),
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Phases"
        title="Execution stays legible when phases are explicit"
        description="Phases create a visible sequence from product contract to planning, execution, and local runtime integration."
      />

      <div className="grid gap-5">
        {dashboard.phaseProgress.map((phase) => (
          <Card key={phase.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>{phase.title}</CardTitle>
                  <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                    {phase.status}
                  </div>
                </div>
                <CardDescription>
                  {
                    dashboard.project.phases.find((candidate) => candidate.id === phase.id)?.goal
                  }
                </CardDescription>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Progress</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">
                    {phase.progressPercent}%
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tasks</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{phase.totalTasks}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Features</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">
                    {featureCountByPhase.get(phase.id) ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span>
                  {phase.completedTasks} of {phase.totalTasks} tasks complete
                </span>
                <span>{phase.progressPercent}%</span>
              </div>
              <ProgressBar value={phase.progressPercent} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
