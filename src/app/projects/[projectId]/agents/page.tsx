import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";
import { AgentStatusBadge } from "@/features/projects/components/status-badge";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Agents"
        title="Specialized agents with explicit boundaries"
        description="Agents are useful when their role, model, permissions, and escalation rules are visible. Clonable keeps those contracts first-class."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {dashboard.project.agents.map((agent) => (
          <Card key={agent.id}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>{agent.name}</CardTitle>
                  <AgentStatusBadge status={agent.status} />
                </div>
                <CardDescription className="mt-2">{agent.role}</CardDescription>
              </div>
              <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                {agent.model}
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-700">{agent.instructionsSummary}</p>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Permissions
                </p>
                <div className="mt-3 space-y-2">
                  {agent.permissions.map((permission) => (
                    <div
                      key={permission}
                      className="rounded-[20px] bg-slate-950/[0.03] px-3 py-2 text-sm text-slate-700"
                    >
                      {permission}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Boundaries
                </p>
                <div className="mt-3 space-y-2">
                  {agent.boundaries.map((boundary) => (
                    <div key={boundary} className="rounded-[20px] bg-orange-50 px-3 py-2 text-sm text-orange-900">
                      {boundary}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Escalation
                </p>
                <div className="mt-3 space-y-2">
                  {agent.escalationRules.map((rule) => (
                    <div key={rule} className="rounded-[20px] bg-rose-50 px-3 py-2 text-sm text-rose-900">
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
