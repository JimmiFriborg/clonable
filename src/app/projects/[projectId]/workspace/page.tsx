import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const { workspace } = dashboard.project;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Workspace"
        title="A real repo-based workspace, not an AI sandbox"
        description="The workspace view will eventually bridge branches, diffs, files, and task traceability. This scaffold already reserves the place where that local-first behavior belongs."
      />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Workspace status
              </p>
              <CardTitle className="mt-2">{workspace.rootPath}</CardTitle>
              <CardDescription className="mt-3">
                {workspace.repoProvider} with serialized write-capable task execution per branch.
              </CardDescription>
            </div>
            <div className="rounded-[24px] bg-slate-950 px-4 py-3 text-sm font-medium text-white">
              Branch: {workspace.branch}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Provider</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{workspace.repoProvider}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Dirty files</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{workspace.dirtyFiles.length}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Last commit</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{workspace.lastCommit}</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Dirty files
          </p>
          <div className="mt-4 space-y-3">
            {workspace.dirtyFiles.map((file) => (
              <div
                key={file}
                className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                {file}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Tracked structure
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workspace.files.map((file) => (
            <div
              key={file.path}
              className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-700"
            >
              <p className="font-medium text-slate-950">{file.path}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                {file.kind}
                {file.changed ? " · changed" : ""}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
