import { CheckCircle2, CircleAlert, Flag, Workflow } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageIntro } from "@/features/projects/components/page-intro";
import {
  AgentStatusBadge,
  PriorityBadge,
  TaskStatusBadge,
} from "@/features/projects/components/status-badge";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  const { project, currentPhase } = dashboard;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Dashboard"
        title="Build the MVP with visible momentum"
        description="The dashboard keeps the goal, MVP boundary, current phase, next tasks, active agents, completed work, and blockers visible in one place."
      />

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(236,253,245,0.75))]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Project goal
                </p>
                <CardTitle className="mt-2 text-2xl">{project.mvp.goalStatement}</CardTitle>
              </div>
              <CardDescription className="max-w-3xl text-base">
                {project.summary}
              </CardDescription>
            </div>
            <div className="rounded-[24px] bg-slate-950 px-4 py-3 text-sm font-medium text-white">
              {project.status}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: "Total tasks", value: dashboard.counts.totalTasks, icon: Workflow },
              { label: "Done so far", value: dashboard.counts.doneTasks, icon: CheckCircle2 },
              { label: "Current blockers", value: dashboard.counts.blockedTasks, icon: CircleAlert },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/70 bg-white/80 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-slate-950">
                        {item.value}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,118,110,0.92))] text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-100/80">
            Current MVP
          </p>
          <CardTitle className="mt-3 text-2xl text-white">{project.mvp.summary}</CardTitle>
          <CardDescription className="mt-3 text-white/75">
            {project.mvp.successDefinition}
          </CardDescription>

          <div className="mt-6 rounded-[24px] bg-white/8 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Flag className="h-4 w-4" />
              MVP boundary reasoning
            </div>
            <p className="mt-3 text-sm leading-6 text-white/78">
              {project.mvp.boundaryReasoning}
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Current phase
              </p>
              <CardTitle className="mt-2">
                {currentPhase ? currentPhase.title : "No active phase"}
              </CardTitle>
            </div>
            {currentPhase ? (
              <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                {currentPhase.status}
              </div>
            ) : null}
          </div>

          {currentPhase ? (
            <>
              <CardDescription className="mt-3">{currentPhase.goal}</CardDescription>
              <div className="mt-6 space-y-4">
                {dashboard.phaseProgress.map((phase) => (
                  <div key={phase.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                      <span>{phase.title}</span>
                      <span>
                        {phase.completedTasks}/{phase.totalTasks}
                      </span>
                    </div>
                    <ProgressBar value={phase.progressPercent} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Next 3 recommended tasks
              </p>
              <CardTitle className="mt-2">What matters now</CardTitle>
            </div>
            <div className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
              Task flow stays explicit
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {dashboard.nextTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <TaskStatusBadge status={task.state} />
                  <PriorityBadge priority={task.priority} />
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-slate-950">
                  {task.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  {task.relatedFiles.map((file) => (
                    <span key={file} className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Active agents
              </p>
              <CardTitle className="mt-2">Specialized roles, visible work</CardTitle>
            </div>
            <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
              {dashboard.counts.activeAgents} active or ready
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {dashboard.activeAgents.map((agent) => (
              <div key={agent.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold tracking-tight text-slate-950">
                      {agent.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{agent.role}</p>
                  </div>
                  <AgentStatusBadge status={agent.status} />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {agent.instructionsSummary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                    {agent.runtimeBackend === "openclaw"
                      ? `OpenClaw · ${agent.openclawBotId ?? "bot"}`
                      : `${agent.provider ?? "provider"} · ${agent.model}`}
                  </span>
                  {agent.currentTaskId ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                      Current task: {agent.currentTaskId}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Recently completed
            </p>
            <div className="mt-4 space-y-4">
              {dashboard.recentCompletedTasks.map((task) => (
                <div key={task.id} className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium text-emerald-950">{task.title}</h3>
                    <TaskStatusBadge status={task.state} />
                  </div>
                  <p className="mt-2 text-sm text-emerald-800/80">{task.completedAt}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
                  Current blockers
                </p>
                <CardTitle className="mt-2">Nothing hidden</CardTitle>
              </div>
              <CircleAlert className="h-5 w-5 text-rose-600" />
            </div>

            <div className="mt-4 space-y-4">
              {dashboard.blockers.map((task) => (
                <div key={task.id} className="rounded-[24px] border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium text-rose-950">{task.title}</h3>
                    <TaskStatusBadge status={task.state} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-rose-900/80">
                    {task.blockerReason || task.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
