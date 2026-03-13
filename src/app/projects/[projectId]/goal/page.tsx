import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function GoalPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const { project } = dashboard;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Goal & MVP"
        title="Define the real MVP before building"
        description="Clonable starts by separating the larger vision from the smallest credible MVP so execution stays finishable."
      />

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Larger vision
          </p>
          <CardTitle className="mt-3 text-2xl">{project.vision}</CardTitle>
          <CardDescription className="mt-4 text-base">{project.summary}</CardDescription>
        </Card>

        <Card className="bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,118,110,0.92))] text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-100/80">
            MVP success definition
          </p>
          <CardTitle className="mt-3 text-2xl text-white">
            {project.mvp.successDefinition}
          </CardTitle>
          <CardDescription className="mt-4 text-white/75">
            {project.mvp.boundaryReasoning}
          </CardDescription>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Current MVP
          </p>
          <CardTitle className="mt-3">{project.mvp.summary}</CardTitle>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <p>{project.mvp.goalStatement}</p>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Constraints
          </p>
          <div className="mt-4 space-y-3">
            {project.mvp.constraints.map((constraint) => (
              <div
                key={constraint}
                className="rounded-[22px] bg-slate-950/[0.03] px-4 py-3 text-sm text-slate-700"
              >
                {constraint}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
          Post-MVP
        </p>
        <CardTitle className="mt-3">Ideas deliberately held for later</CardTitle>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {project.mvp.laterScope.map((item) => (
            <div
              key={item}
              className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
