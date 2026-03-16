import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  refreshPreviewAction,
  restartPreviewAction,
  startPreviewAction,
  stopPreviewAction,
  updatePreviewSettingsAction,
} from "@/features/projects/actions";
import { PageIntro } from "@/components/ui/page-intro";
import { getDeploymentSurface } from "@/server/services/deployment-service";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function PreviewPage({
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

  const { preview } = dashboard.project;
  const previewControlEnabled = deployment.capabilities.previewControl;
  const returnPath = `/projects/${projectId}/preview`;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Preview"
        title="Runtime controls stay understandable"
        description="Preview management now runs against a persisted local process record so start, restart, stop, and logs stay attached to the project."
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
          <div className="mt-6 space-y-3 rounded-[24px] bg-white/8 p-4 text-sm text-white/78">
            <p>URL: {preview.url}</p>
            <p>PID: {preview.pid ?? "Not running"}</p>
            <p>Log path: {preview.logPath ?? "Will be created on first start"}</p>
          </div>
        </Card>

        <Card>
          <CardTitle>Preview controls</CardTitle>
          <CardDescription className="mt-3">
            Configure the command once, then control the local preview without leaving the
            project view.
          </CardDescription>

          {!previewControlEnabled ? (
            <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              This hosted deployment can show preview state, but it does not control machine-local
              preview processes. Use your local Clonable instance for start, restart, stop, and
              filesystem-bound runtime actions.
            </div>
          ) : null}

          <form
            action={updatePreviewSettingsAction.bind(null, projectId, returnPath)}
            className="mt-6 grid gap-4"
          >
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Command</span>
              <input
                name="command"
                defaultValue={preview.command}
                disabled={!previewControlEnabled}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Port</span>
              <input
                name="port"
                type="number"
                min={1}
                defaultValue={preview.port}
                disabled={!previewControlEnabled}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!previewControlEnabled}
                className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
              >
                Save preview settings
              </button>
            </div>
          </form>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <form action={startPreviewAction.bind(null, projectId, returnPath)}>
              <button
                type="submit"
                disabled={!previewControlEnabled}
                className="inline-flex w-full justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Start
              </button>
            </form>
            <form action={restartPreviewAction.bind(null, projectId, returnPath)}>
              <button
                type="submit"
                disabled={!previewControlEnabled}
                className="inline-flex w-full justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
              >
                Restart
              </button>
            </form>
            <form action={stopPreviewAction.bind(null, projectId, returnPath)}>
              <button
                type="submit"
                disabled={!previewControlEnabled}
                className="inline-flex w-full justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
              >
                Stop
              </button>
            </form>
            <form action={refreshPreviewAction.bind(null, projectId, returnPath)}>
              <button
                type="submit"
                disabled={!previewControlEnabled}
                className="inline-flex w-full justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
              >
                Refresh
              </button>
            </form>
          </div>
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
