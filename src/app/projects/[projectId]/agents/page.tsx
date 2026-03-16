import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  createProjectAgentAction,
  toggleProjectOrchestrationAction,
  updateProjectAgentAction,
} from "@/features/projects/actions";
import { AgentForm } from "@/features/projects/components/agent-form";
import { PageIntro } from "@/components/ui/page-intro";
import {
  AgentRoleBadge,
  AgentStatusBadge,
} from "@/features/projects/components/status-badge";
import { getProjectDashboard } from "@/server/services/project-service";
import { getOpenClawCatalog } from "@/server/services/openclaw-service";

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);
  const openclaw = await getOpenClawCatalog();

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Agents"
        title="Specialized agents with visible policy roles"
        description="Agents are useful when their role, model, WIP limit, permissions, and orchestration behavior are editable and inspectable."
      />

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Project runtime
            </p>
            <CardTitle className="mt-2">Orchestration control center</CardTitle>
            <CardDescription className="mt-3">
              Orchestration stays opt-in per project so existing work never becomes
              unexpectedly autonomous.
            </CardDescription>
          </div>
          <form
            action={toggleProjectOrchestrationAction.bind(
              null,
              projectId,
              `/projects/${projectId}/agents`,
            )}
            className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3"
          >
            <input
              type="hidden"
              name="orchestrationEnabled"
              value={dashboard.project.runtime.orchestrationEnabled ? "false" : "true"}
            />
            <span className="text-sm font-medium text-slate-700">
              {dashboard.project.runtime.orchestrationEnabled ? "Enabled" : "Disabled"}
            </span>
            <button
              type="submit"
              className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {dashboard.project.runtime.orchestrationEnabled ? "Disable" : "Enable"}
            </button>
          </form>
        </div>
      </Card>

      <Card>
        <CardTitle>Create a custom agent</CardTitle>
        <CardDescription className="mt-3">
          Custom agents stay project-scoped and explicit about role, permissions, boundaries,
          and write capability.
        </CardDescription>

        <AgentForm
          action={createProjectAgentAction.bind(null, projectId, `/projects/${projectId}/agents`)}
          bots={openclaw.bots}
          submitLabel="Create agent"
        />
      </Card>

      <div className="grid gap-5">
        {dashboard.project.agents.map((agent) => (
          <Card key={agent.id}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>{agent.name}</CardTitle>
                  <AgentStatusBadge status={agent.status} />
                  <AgentRoleBadge role={agent.policyRole} />
                </div>
                <CardDescription className="mt-2">{agent.role}</CardDescription>
              </div>
              <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                {agent.runtimeBackend === "openclaw"
                  ? `OpenClaw · ${agent.openclawBotId ?? "bot"}`
                  : `${agent.provider ?? "provider"} · ${agent.model}`}
              </div>
            </div>

            <AgentForm
              action={updateProjectAgentAction.bind(
                null,
                projectId,
                agent.id,
                `/projects/${projectId}/agents`,
              )}
              bots={openclaw.bots}
              initial={agent}
              submitLabel="Save agent"
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
