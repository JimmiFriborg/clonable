import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageIntro } from "@/features/projects/components/page-intro";
import { PriorityBadge } from "@/features/projects/components/status-badge";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function FeaturesPage({
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
        eyebrow="Features"
        title="Feature groups keep the MVP structured"
        description="Each feature belongs to a phase, has clear priority, and rolls up visible task progress."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {dashboard.featureProgress.map((feature) => {
          const featureRecord = dashboard.project.features.find((item) => item.id === feature.id);
          const phase = dashboard.project.phases.find((item) => item.id === featureRecord?.phaseId);

          return (
            <Card key={feature.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{feature.title}</CardTitle>
                    {featureRecord ? <PriorityBadge priority={featureRecord.priority} /> : null}
                  </div>
                  <CardDescription>{featureRecord?.summary}</CardDescription>
                </div>
                <div className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  {feature.status}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] bg-slate-950/[0.03] p-4">
                <div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                  <span>{phase?.title ?? "No phase"}</span>
                  <span>{feature.progressPercent}%</span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={feature.progressPercent} />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {feature.completedTasks} of {feature.totalTasks} tasks complete
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
