import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AppwriteAuthPanel } from "@/features/settings/components/appwrite-auth-panel";
import { PageIntro } from "@/components/ui/page-intro";
import { getProjectProviderConfig } from "@/server/services/project-service";
import { getOpenClawCatalog } from "@/server/services/openclaw-service";
import { appwriteAuthGateway } from "@/server/infrastructure/appwrite/auth-gateway";
import { getDeploymentSurface } from "@/server/services/deployment-service";

export default async function SettingsPage() {
  const [providers, openclaw] = await Promise.all([
    getProjectProviderConfig(),
    getOpenClawCatalog(),
  ]);
  const authConfig = appwriteAuthGateway.getClientConfig();
  const deployment = getDeploymentSurface();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)] px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <PageIntro
          eyebrow="Settings"
          title="Global controls should stay practical"
          description="Clonable keeps provider, workspace, and safety controls centralized so projects inherit stable defaults without becoming opaque."
        />

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardTitle>Hosted auth</CardTitle>
            <AppwriteAuthPanel
              configured={appwriteAuthGateway.isConfigured()}
              endpoint={authConfig?.endpoint}
              projectId={authConfig?.projectId}
              siteUrl={deployment.siteUrl}
            />
          </Card>

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
            <CardTitle>First-time AI defaults</CardTitle>
            <CardDescription className="mt-3">
              The planner uses the configured provider router with OpenAI as the default.
              Built-in project chat is OpenClaw-only. Project Manager and Reviewer default to
              OpenClaw, while write-capable builders stay on direct providers unless changed.
            </CardDescription>
          </Card>

          <Card>
            <CardTitle>Git and safety defaults</CardTitle>
            <CardDescription className="mt-3">
              Clonable uses local Git workspaces and user-owned remotes only. No Lovable-created repo,
              Supabase runtime path, or hidden credit gate is part of the builder loop.
            </CardDescription>
          </Card>

          <Card>
            <CardTitle>Deployment mode</CardTitle>
            <CardDescription className="mt-3">
              Current mode: {deployment.mode}. Workspace execution is{" "}
              {deployment.capabilities.workspaceExecution ? "enabled" : "disabled"} and preview control
              is {deployment.capabilities.previewControl ? "enabled" : "disabled"}.
            </CardDescription>
          </Card>
        </div>
      </div>
    </main>
  );
}
