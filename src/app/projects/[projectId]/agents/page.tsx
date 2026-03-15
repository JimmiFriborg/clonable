import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  createProjectAgentAction,
  toggleProjectOrchestrationAction,
  updateProjectAgentAction,
} from "@/features/projects/actions";
import { PageIntro } from "@/features/projects/components/page-intro";
import {
  AgentRoleBadge,
  AgentStatusBadge,
} from "@/features/projects/components/status-badge";
import { agentPolicyRoleOrder, agentStatusOrder } from "@/server/domain/project";
import { getProjectDashboard } from "@/server/services/project-service";

function formatLines(values: string[]) {
  return values.join("\n");
}

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

        <form
          action={createProjectAgentAction.bind(null, projectId, `/projects/${projectId}/agents`)}
          className="mt-6 grid gap-5 lg:grid-cols-2"
        >
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Name</span>
            <input
              name="name"
              required
              placeholder="Migration Agent"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Role</span>
            <input
              name="role"
              required
              placeholder="Handle schema and migration work."
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Policy role</span>
            <select
              name="policyRole"
              defaultValue="builder"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            >
              {agentPolicyRoleOrder.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Status</span>
            <select
              name="status"
              defaultValue="ready"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            >
              {agentStatusOrder.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Model</span>
            <input
              name="model"
              required
              placeholder="GPT-5.3-Codex"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">WIP limit</span>
            <input
              name="wipLimit"
              placeholder="1"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Instruction summary</span>
            <input
              name="instructionsSummary"
              required
              placeholder="Own schema migrations and task-safe persistence updates."
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Instructions</span>
            <textarea
              name="instructions"
              required
              rows={4}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Permissions</span>
            <textarea
              name="permissions"
              rows={4}
              placeholder={"One per line\nedit schema\nrun repository tests"}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Boundaries</span>
            <textarea
              name="boundaries"
              rows={4}
              placeholder={"One per line\nno scope expansion\nno direct user contact"}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Escalation rules</span>
            <textarea
              name="escalationRules"
              rows={3}
              placeholder={"One per line\nescalate data-loss risk\nescalate unresolved dependency chain"}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="flex items-center gap-3">
            <input type="hidden" name="enabled" value="false" />
            <input
              type="checkbox"
              name="enabled"
              value="true"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <span className="text-sm text-slate-700">Enabled</span>
          </label>

          <label className="flex items-center gap-3">
            <input type="hidden" name="canWriteWorkspace" value="false" />
            <input
              type="checkbox"
              name="canWriteWorkspace"
              value="true"
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <span className="text-sm text-slate-700">Can write workspace</span>
          </label>

          <div className="flex justify-end lg:col-span-2">
            <button
              type="submit"
              className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Create agent
            </button>
          </div>
        </form>
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
                {agent.model}
              </div>
            </div>

            <form
              action={updateProjectAgentAction.bind(
                null,
                projectId,
                agent.id,
                `/projects/${projectId}/agents`,
              )}
              className="mt-6 grid gap-5 lg:grid-cols-2"
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Name</span>
                <input
                  name="name"
                  defaultValue={agent.name}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Role</span>
                <input
                  name="role"
                  defaultValue={agent.role}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Policy role</span>
                <select
                  name="policyRole"
                  defaultValue={agent.policyRole}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                >
                  {agentPolicyRoleOrder.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Status</span>
                <select
                  name="status"
                  defaultValue={agent.status}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                >
                  {agentStatusOrder.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Model</span>
                <input
                  name="model"
                  defaultValue={agent.model}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">WIP limit</span>
                <input
                  name="wipLimit"
                  defaultValue={agent.wipLimit ?? ""}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-slate-900">Instruction summary</span>
                <input
                  name="instructionsSummary"
                  defaultValue={agent.instructionsSummary}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-slate-900">Instructions</span>
                <textarea
                  name="instructions"
                  rows={4}
                  defaultValue={agent.instructions}
                  className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Permissions</span>
                <textarea
                  name="permissions"
                  rows={4}
                  defaultValue={formatLines(agent.permissions)}
                  className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Boundaries</span>
                <textarea
                  name="boundaries"
                  rows={4}
                  defaultValue={formatLines(agent.boundaries)}
                  className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-slate-900">Escalation rules</span>
                <textarea
                  name="escalationRules"
                  rows={3}
                  defaultValue={formatLines(agent.escalationRules)}
                  className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="flex items-center gap-3">
                <input type="hidden" name="enabled" value="false" />
                <input
                  type="checkbox"
                  name="enabled"
                  value="true"
                  defaultChecked={agent.enabled}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                <span className="text-sm text-slate-700">Enabled</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="hidden" name="canWriteWorkspace" value="false" />
                <input
                  type="checkbox"
                  name="canWriteWorkspace"
                  value="true"
                  defaultChecked={agent.canWriteWorkspace}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                <span className="text-sm text-slate-700">Can write workspace</span>
              </label>

              <div className="flex justify-end lg:col-span-2">
                <button
                  type="submit"
                  className="inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                >
                  Save agent
                </button>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
