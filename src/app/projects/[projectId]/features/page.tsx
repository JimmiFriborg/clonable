import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { createProjectFeatureAction } from "@/features/projects/actions";
import { PageIntro } from "@/features/projects/components/page-intro";
import { PriorityBadge } from "@/features/projects/components/status-badge";
import { taskPriorityOrder } from "@/server/domain/project";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const createFeatureFormAction = createProjectFeatureAction.bind(
    null,
    projectId,
    `/projects/${projectId}/features`,
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Features"
        title="Feature groups keep the MVP structured"
        description="Each feature belongs to a phase, has clear priority, and rolls up visible task progress."
      />

      <Card>
        <div className="max-w-2xl space-y-2">
          <CardTitle>Add a feature</CardTitle>
          <CardDescription>
            Features should stay meaningfully scoped. If a feature feels broad, it usually
            wants to become several smaller features instead.
          </CardDescription>
        </div>

        <form action={createFeatureFormAction} className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Phase</span>
            <select
              name="phaseId"
              required
              disabled={dashboard.project.phases.length === 0}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100"
              defaultValue={dashboard.project.phases[0]?.id ?? ""}
            >
              {dashboard.project.phases.length === 0 ? (
                <option value="">Add a phase first</option>
              ) : (
                dashboard.project.phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.title}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Priority</span>
            <select
              name="priority"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              defaultValue="normal"
            >
              {taskPriorityOrder.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Feature title</span>
            <input
              name="title"
              required
              placeholder="Project intake and MVP drafting"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Summary</span>
            <textarea
              name="summary"
              required
              rows={4}
              placeholder="Capture the user input, persist it, and produce a first MVP draft with a safe manual fallback."
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={dashboard.project.phases.length === 0}
              className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add feature
            </button>
          </div>
        </form>
      </Card>

      {dashboard.featureProgress.length === 0 ? (
        <Card>
          <CardTitle>No features yet</CardTitle>
          <CardDescription className="mt-3">
            Add the first feature inside a phase to make the MVP more legible and create a
            natural place for tasks to live.
          </CardDescription>
        </Card>
      ) : null}

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
