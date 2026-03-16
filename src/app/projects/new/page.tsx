import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { CreateProjectForm } from "@/features/projects/components/create-project-form";
import { getProjectProviderConfig } from "@/server/services/project-service";
import { getOpenClawCatalog } from "@/server/services/openclaw-service";

export default async function NewProjectPage() {
  const [providers, openclaw] = await Promise.all([
    getProjectProviderConfig(),
    getOpenClawCatalog(),
  ]);
  const configuredProviders = providers.providers.filter((provider) => provider.configured);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)] px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <PageIntro
          eyebrow="Create Project"
          title="Start with the idea, then define the real MVP"
          description="This flow captures the idea, the audience, the constraints, and the repo intent, then asks the planner to propose the smallest credible MVP."
          action={
            <Link
              href="/"
              className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
            >
              Back to projects
            </Link>
          }
        />

        <Card>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                AI status
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {configuredProviders.length > 0
                  ? `Provider-backed planning is ready via ${configuredProviders
                      .map((provider) => provider.provider)
                      .join(", ")}.`
                  : "No provider key detected yet. You can still create the project and fill in the MVP manually."}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Chat mode
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {openclaw.configured
                  ? "OpenClaw is available, but it is optional."
                  : "Built-in chat will use your configured provider if available. OpenClaw is optional."}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Repo model
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Add a GitHub repo now if you already know it, or let Clonable carry a local workspace
                until you connect one.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CreateProjectForm />
        </Card>
      </div>
    </main>
  );
}
