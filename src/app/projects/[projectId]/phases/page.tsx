import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { createProjectPhaseAction } from "@/features/projects/actions";
import { PageIntro } from "@/features/projects/components/page-intro";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function PhasesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const featureCountByPhase = new Map(
    dashboard.project.phases.map((phase) => [
      phase.id,
      dashboard.project.features.filter((feature) => feature.phaseId === phase.id).length,
    ]),
  );
  const createPhaseFormAction = createProjectPhaseAction.bind(
    null,
    projectId,
    `/projects/${projectId}/phases`,
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Phases"
        title="Execution stays legible when phases are explicit"
        description="Phases create a visible sequence from product contract to planning, execution, and local runtime integration."
      />

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <CardTitle>Add a phase</CardTitle>
            <CardDescription>
              Phases keep the MVP finishable. Start with a small sequence and expand only
              when the current phase is genuinely clear.
            </CardDescription>
          </div>
        </div>

        <form action={createPhaseFormAction} className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr_auto]">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Phase title</span>
            <input
              name="title"
              required
              placeholder="Phase 2: Workspace execution"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Phase goal</span>
            <input
              name="goal"
              required
              placeholder="Turn the approved MVP plan into branch-safe implementation work."
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Add phase
            </button>
          </div>
        </form>
      </Card>

      {dashboard.phaseProgress.length === 0 ? (
        <Card>
          <CardTitle>No phases yet</CardTitle>
          <CardDescription className="mt-3">
            The project is ready for the first explicit phase. Once phases exist, Clonable
            can keep progress and next steps much clearer.
          </CardDescription>
        </Card>
      ) : null}

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
