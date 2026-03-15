import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  assignTaskOwnerAction,
  transitionTaskAction,
} from "@/features/projects/actions";
import { PageIntro } from "@/features/projects/components/page-intro";
import {
  AgentRoleBadge,
  PriorityBadge,
  TaskStatusBadge,
} from "@/features/projects/components/status-badge";
import { taskStateOrder } from "@/server/domain/project";
import { getProject } from "@/server/services/project-service";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  const task = project.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    notFound();
  }

  const orchestratorId =
    project.agents.find((agent) => agent.policyRole === "orchestrator")?.id ?? "";
  const taskRuns = project.agentRuns.filter((run) => run.taskId === task.id);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Task Detail"
        title={task.title}
        description="Task detail shows the canonical policy fields: owner, next role, transition controls, change log, rejection log, runs, and child-task relationships."
      />

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.state} />
            <PriorityBadge priority={task.priority} />
            {task.nextRole ? <AgentRoleBadge role={task.nextRole} /> : null}
          </div>
          <CardDescription className="mt-4 text-base">{task.description}</CardDescription>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Owner</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {task.ownerAgentId ?? "Unassigned"}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Requires user</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {task.requiresUser ? "Yes" : "No"}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Last updated</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{task.lastUpdated}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Parent task</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {task.parentTaskId ?? "None"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Routing controls</CardTitle>
          <CardDescription className="mt-3">
            Ownership and transitions stay explicit. The Orchestrator handles owner changes,
            while transitions record notes and policy reasons.
          </CardDescription>

          <form
            action={assignTaskOwnerAction.bind(
              null,
              projectId,
              task.id,
              `/projects/${projectId}/tasks/${task.id}`,
            )}
            className="mt-6 grid gap-4"
          >
            <input type="hidden" name="agentId" value={orchestratorId} />
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Assign owner</span>
              <select
                name="ownerAgentId"
                defaultValue={task.ownerAgentId ?? ""}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              >
                <option value="">Unassigned</option>
                {project.agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
            >
              Save owner
            </button>
          </form>

          <form
            action={transitionTaskAction.bind(
              null,
              projectId,
              task.id,
              `/projects/${projectId}/tasks/${task.id}`,
            )}
            className="mt-6 grid gap-4"
          >
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Acting agent</span>
              <select
                name="agentId"
                defaultValue={task.ownerAgentId ?? orchestratorId}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              >
                {project.agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Next state</span>
              <select
                name="state"
                defaultValue={task.state}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              >
                {taskStateOrder.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Note</span>
              <textarea
                name="note"
                rows={3}
                placeholder="Why this transition happened"
                className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Blocker reason</span>
              <input
                name="blockerReason"
                defaultValue={task.blockerReason ?? ""}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Waiting reason</span>
              <input
                name="waitingReason"
                defaultValue={task.waitingReason ?? ""}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Review date</span>
              <input
                name="reviewDate"
                defaultValue={task.reviewDate ?? ""}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>

            <button
              type="submit"
              className="inline-flex justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Apply transition
            </button>
          </form>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Change log
          </p>
          <div className="mt-4 space-y-3">
            {task.changeLog.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-950/[0.02] p-4 text-sm text-slate-500">
                No policy changes recorded yet.
              </div>
            ) : (
              task.changeLog
                .slice()
                .reverse()
                .map((entry) => (
                  <div
                    key={`${entry.timestamp}-${entry.field}`}
                    className="rounded-[22px] border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <p className="font-medium text-slate-950">{entry.field}</p>
                    <p className="mt-1">
                      {entry.from ?? "empty"} {"->"} {entry.to ?? "empty"}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                      {entry.agentId} at {entry.timestamp}
                    </p>
                  </div>
                ))
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
            Rejection log
          </p>
          <div className="mt-4 space-y-3">
            {task.rejectionLog.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-950/[0.02] p-4 text-sm text-slate-500">
                No rejected transitions or field changes.
              </div>
            ) : (
              task.rejectionLog
                .slice()
                .reverse()
                .map((entry) => (
                  <div
                    key={`${entry.timestamp}-${entry.rejectionReasonCode}`}
                    className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
                  >
                    <p className="font-medium">{entry.rejectionReasonCode}</p>
                    <p className="mt-1">{entry.rejectionNote}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-rose-700">
                      {entry.agentId} at {entry.timestamp}
                    </p>
                  </div>
                ))
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Evidence
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-950">Related files</p>
              <p className="mt-2">{task.relatedFiles.join(", ") || "None yet"}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-950">Artifacts</p>
              <p className="mt-2">{task.artifacts.join(", ") || "None yet"}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-950">Notes</p>
              <p className="mt-2 whitespace-pre-wrap">{task.notes || "No notes yet"}</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Agent runs
          </p>
          <div className="mt-4 space-y-3">
            {taskRuns.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-950/[0.02] p-4 text-sm text-slate-500">
                No agent runs are attached to this task yet.
              </div>
            ) : (
              taskRuns
                .slice()
                .reverse()
                .map((run) => (
                  <div
                    key={run.id}
                    className="rounded-[22px] border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{run.summary}</p>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-2">{run.reason}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                      {run.createdAt}
                    </p>
                  </div>
                ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
