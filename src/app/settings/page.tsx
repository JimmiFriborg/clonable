import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { AppwriteAuthPanel } from "@/features/settings/components/appwrite-auth-panel";
import { appwriteAuthGateway } from "@/server/infrastructure/appwrite/auth-gateway";
import { getOpenClawCatalog } from "@/server/services/openclaw-service";
import { getProjectProviderConfig } from "@/server/services/project-service";
import { getChatProviderSelection } from "@/server/services/provider-gateway";
import { getDeploymentSurface } from "@/server/services/deployment-service";

function StatusPill({
  tone,
  children,
}: {
  tone: "good" | "warn" | "neutral";
  children: string;
}) {
  const styles =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

export default async function SettingsPage() {
  const [providers, openclaw] = await Promise.all([
    getProjectProviderConfig(),
    getOpenClawCatalog(),
  ]);
  const authConfig = appwriteAuthGateway.getClientConfig();
  const deployment = getDeploymentSurface();
  const chatProvider = getChatProviderSelection();
  const configuredProviders = providers.providers.filter((provider) => provider.configured);
  const githubOwner = process.env.CLONABLE_GITHUB_OWNER?.trim();
  const projectsRoot = process.env.CLONABLE_PROJECTS_ROOT ?? "./projects";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)] px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <PageIntro
          eyebrow="Settings"
          title="Set the defaults once, then let projects inherit them"
          description="Clonable should feel ready-to-use: provider-backed agents, optional OpenClaw, and a GitHub-linked workspace model without mystery setup."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.86))]">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill tone={configuredProviders.length > 0 ? "good" : "warn"}>
                {configuredProviders.length > 0 ? "AI ready" : "AI setup needed"}
              </StatusPill>
              <StatusPill tone={githubOwner ? "good" : "neutral"}>
                {githubOwner ? "GitHub default ready" : "GitHub default optional"}
              </StatusPill>
              <StatusPill tone={openclaw.configured ? "good" : "neutral"}>
                {openclaw.configured ? "OpenClaw available" : "OpenClaw optional"}
              </StatusPill>
            </div>

            <CardTitle className="mt-4">First run in three practical steps</CardTitle>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
              <p>
                1. Add one provider API key such as <code>OPENAI_API_KEY</code>. That is enough to
                make planning, provider-backed agents, and built-in chat usable.
              </p>
              <p>
                2. Optionally set <code>CLONABLE_GITHUB_OWNER</code> so new projects can derive a
                GitHub remote automatically. You can still paste a repo URL project-by-project.
              </p>
              <p>
                3. Treat OpenClaw as optional. If <code>OPENCLAW_BASE_URL</code> and{" "}
                <code>OPENCLAW_API_KEY</code> are missing, Clonable will use your configured AI
                provider for built-in chat instead.
              </p>
            </div>
          </Card>

          <Card>
            <CardTitle>Hosted auth</CardTitle>
            <AppwriteAuthPanel
              configured={appwriteAuthGateway.isConfigured()}
              endpoint={authConfig?.endpoint}
              projectId={authConfig?.projectId}
              siteUrl={deployment.siteUrl}
            />
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardTitle>Provider-backed defaults</CardTitle>
            <CardDescription className="mt-3">
              Default agents are now provider-first. Project Manager and Reviewer no longer require
              OpenClaw to be useful.
            </CardDescription>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {providers.providers.map((provider) => (
                <p key={provider.provider}>
                  <code>{provider.provider}</code>:{" "}
                  {provider.configured ? provider.defaultModel : "not configured"}
                </p>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Built-in chat</CardTitle>
            <CardDescription className="mt-3">
              {openclaw.configured
                ? "OpenClaw is configured, so project chat can use OpenClaw-backed assistant modes."
                : configuredProviders.length > 0
                  ? "OpenClaw is not configured, so project chat will use your configured AI provider instead."
                  : "No AI backend is configured yet, so built-in chat will stay saved but won’t generate live replies."}
            </CardDescription>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                Default chat provider: <code>{chatProvider.provider}</code>
              </p>
              <p>
                Default chat model: <code>{chatProvider.model}</code>
              </p>
              <p>
                OpenClaw status: {openclaw.configured ? "configured" : "optional and currently off"}
              </p>
            </div>
          </Card>

          <Card>
            <CardTitle>Workspace and GitHub</CardTitle>
            <CardDescription className="mt-3">
              Projects keep a local Git workspace, but they can now carry a GitHub remote from the
              moment they are created.
            </CardDescription>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                Projects root: <code>{projectsRoot}</code>
              </p>
              <p>
                Default GitHub owner:{" "}
                <code>{githubOwner || "not set"}</code>
              </p>
              <p>
                Workspace execution:{" "}
                {deployment.capabilities.workspaceExecution ? "enabled here" : "local-only"}
              </p>
            </div>
          </Card>

          <Card>
            <CardTitle>What is optional</CardTitle>
            <CardDescription className="mt-3">
              These integrations can improve the experience, but Clonable should not block on them.
            </CardDescription>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                <code>OPENCLAW_BASE_URL</code> and <code>OPENCLAW_API_KEY</code>
              </p>
              <p>
                <code>CLONABLE_GITHUB_OWNER</code> for auto-derived remotes
              </p>
              <p>
                Local preview and filesystem execution on hosted deployments
              </p>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
