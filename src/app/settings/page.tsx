import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";
import { getProjectProviderConfig } from "@/server/services/project-service";
import { getOpenClawCatalog } from "@/server/services/openclaw-service";

export default async function SettingsPage() {
  const [providers, openclaw] = await Promise.all([
    getProjectProviderConfig(),
    getOpenClawCatalog(),
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)] px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <PageIntro
          eyebrow="Settings"
          title="Global controls should stay practical"
          description="Clonable keeps provider, workspace, and safety controls centralized so projects inherit stable defaults without becoming opaque."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardTitle>OpenClaw chat</CardTitle>
            <CardDescription className="mt-3">
              Built-in project chat is OpenClaw-only and currently sees {openclaw.bots.length} named
              bot profiles. {openclaw.configured ? "Live HTTP access is configured." : openclaw.warning}
            </CardDescription>
          </Card>

          <Card>
            <CardTitle>Provider routing</CardTitle>
            <CardDescription className="mt-3">
              Agents can still use direct providers per role.
            </CardDescription>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {providers.providers.map((provider) => (
                <p key={provider.provider}>
                  {provider.provider}: {provider.configured ? provider.defaultModel : "not configured"}
                </p>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Git and safety defaults</CardTitle>
            <CardDescription className="mt-3">
              Clonable uses local Git workspaces and user-owned remotes only. No Lovable-created repo,
              Supabase runtime path, or hidden credit gate is part of the builder loop.
            </CardDescription>
          </Card>
        </div>
      </div>
    </main>
  );
}
