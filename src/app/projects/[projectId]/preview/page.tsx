import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const { preview } = dashboard.project;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Preview"
        title="Runtime controls stay understandable"
        description="Preview management is a V1 requirement, but it should arrive on top of real workspace ownership and observable process metadata."
      />

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,47,73,0.94))] text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-100/80">
            Preview status
          </p>
          <CardTitle className="mt-3 text-2xl text-white">{preview.status}</CardTitle>
          <CardDescription className="mt-3 text-white/75">
            Command: {preview.command} on port {preview.port}
          </CardDescription>
          <div className="mt-6 rounded-[24px] bg-white/8 p-4">
            <p className="text-sm text-white/78">
              Runtime controls are intentionally held behind the workspace bridge so process state
              remains tied to a project and not a loose terminal session.
            </p>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Planned controls
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {["Start", "Restart", "Stop"].map((label) => (
              <div
                key={label}
                className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] px-4 py-8 text-center text-sm font-semibold text-slate-700"
              >
                {label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">URL: {preview.url}</p>
        </Card>
      </section>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Recent preview logs
        </p>
        <div className="mt-4 space-y-3">
          {preview.recentLogs.map((entry) => (
            <div
              key={`${entry.at}-${entry.line}`}
              className="rounded-[22px] border border-slate-200 bg-slate-950/[0.03] px-4 py-3 text-sm text-slate-700"
            >
              <p>{entry.line}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                {entry.at}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
