import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { commitWorkspaceAction, syncWorkspaceAction } from "@/features/projects/actions";
import { PageIntro } from "@/features/projects/components/page-intro";
import { getDeploymentSurface } from "@/server/services/deployment-service";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [dashboard, deployment] = await Promise.all([
    getProjectDashboard(projectId),
    Promise.resolve(getDeploymentSurface()),
  ]);

  if (!dashboard) {
    notFound();
  }

  const { workspace } = dashboard.project;
  const workspaceExecutionEnabled = deployment.capabilities.workspaceExecution;
  const syncAction = syncWorkspaceAction.bind(null, projectId, `/projects/${projectId}/workspace`);
  const commitAction = commitWorkspaceAction.bind(
    null,
    projectId,
    `/projects/${projectId}/workspace`,
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Workspace"
        title="A real repo-based workspace, not an AI sandbox"
        description="The workspace now syncs against a real project folder and local Git state so files, dirty changes, and commits stay visible."
      />

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <CardTitle>Workspace controls</CardTitle>
            <CardDescription>
              Sync the filesystem and Git state into the project record, then create a
              visible checkpoint commit when the workspace is in a good state.
            </CardDescription>
          </div>

          <form action={syncAction}>
            <button
              type="submit"
              disabled={!workspaceExecutionEnabled}
              className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
            >
              Sync workspace
            </button>
          </form>
        </div>

        {!workspaceExecutionEnabled ? (
          <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            This deployment is running in hosted mode, so local workspace execution is disabled
            here. Use a local Clonable instance when you need filesystem sync, Git writes, and
            checkpoint commits.
          </div>
        ) : null}

        <form action={commitAction} className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Commit message</span>
            <input
              name="message"
              placeholder="Checkpoint workspace state"
              disabled={!workspaceExecutionEnabled}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!workspaceExecutionEnabled}
              className="inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Commit changes
            </button>
          </div>
        </form>
      </Card>

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
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {workspace.dirtyFiles.length}
              </p>
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
            {workspace.dirtyFiles.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-950/[0.02] px-4 py-5 text-sm text-slate-500">
                No dirty files right now.
              </div>
            ) : (
              workspace.dirtyFiles.map((file) => (
                <div
                  key={file}
                  className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  {file}
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Tracked structure
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workspace.files.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-950/[0.02] p-4 text-sm text-slate-500">
              Sync the workspace to inspect the real file tree.
            </div>
          ) : (
            workspace.files.map((file) => (
              <div
                key={file.path}
                className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-700"
              >
                <p className="font-medium text-slate-950">{file.path}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                  {file.kind}
                  {file.changed ? " - changed" : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
