import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  GitBranch,
  PlayCircle,
  Workflow,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  createProjectChatSessionAction,
  createTaskFromChatSuggestionAction,
  sendProjectChatMessageAction,
  setProjectDefaultChatBotAction,
} from "@/features/projects/actions";
import { PageIntro } from "@/components/ui/page-intro";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/features/projects/components/status-badge";
import { getProjectDashboard } from "@/server/services/project-service";
import { getProjectChatSurface } from "@/server/services/openclaw-service";

function normalizePlannerText(value: string | undefined, fallback: string) {
  const source = value?.trim() ? value : fallback;

  return source
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeLongformText(value: string | undefined) {
  return (value ?? "")
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function buildMessagePreview(value: string) {
  const normalized = normalizeLongformText(value);
  const segments = normalized
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const preview = truncateText(segments.slice(0, 3).join("\n\n"), 520);
  const isLong = normalized.length > preview.length || segments.length > 3;

  return {
    preview,
    full: normalized,
    isLong,
  };
}

export default async function ProjectBuildPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { projectId } = await params;
  const { session } = await searchParams;
  const dashboard = await getProjectDashboard(projectId);
  const chat = await getProjectChatSurface(projectId, session);

  if (!dashboard || !chat) {
    notFound();
  }

  const activeRun = [...dashboard.project.agentRuns]
    .reverse()
    .find((run) => run.status === "Running" || run.status === "Queued");
  const recentRuns = [...dashboard.project.agentRuns].reverse().slice(0, 4);
  const activeTask =
    dashboard.project.tasks.find((task) => task.id === activeRun?.taskId) ??
    dashboard.nextTasks[0] ??
    dashboard.project.tasks.find((task) => task.state === "In_Progress");
  const activeAgent = dashboard.activeAgents.find(
    (agent) => agent.id === activeRun?.agentId || agent.currentTaskId === activeTask?.id,
  );
  const returnPath = `/projects/${projectId}/build`;
  const projectGoal = truncateText(
    normalizePlannerText(dashboard.project.mvp.goalStatement, dashboard.project.summary),
    140,
  );
  const projectSummary = truncateText(
    normalizePlannerText(dashboard.project.mvp.summary, dashboard.project.summary),
    240,
  );
  const boundaryReasoning = truncateText(
    normalizePlannerText(
      dashboard.project.mvp.boundaryReasoning,
      "Clarify the MVP boundary before expanding scope.",
    ),
    220,
  );
  const currentFocus = truncateText(
    normalizePlannerText(dashboard.project.currentFocus, "Choose the smallest next step."),
    140,
  );
  const laterScope = dashboard.project.mvp.laterScope
    .map((item) => normalizePlannerText(item, item))
    .filter(Boolean)
    .slice(0, 4);
  const definitionOfDone = dashboard.project.definitionOfDone
    .map((item) => normalizePlannerText(item, item))
    .filter(Boolean)
    .slice(0, 3);
  const visibleMessages = chat.messages.slice(-4);
  const hiddenMessageCount = Math.max(chat.messages.length - visibleMessages.length, 0);
  const totalTasks = Math.max(dashboard.counts.totalTasks, 1);
  const completionPercent = Math.round(
    (dashboard.counts.doneTasks / totalTasks) * 100,
  );
  const summaryCards = [
    {
      label: "MVP progress",
      value: `${completionPercent}%`,
      detail: `${dashboard.counts.doneTasks}/${dashboard.counts.totalTasks} tasks done`,
      icon: CheckCircle2,
      tone: "text-emerald-700",
    },
    {
      label: "Next up",
      value: dashboard.nextTasks.length.toString(),
      detail: "Ready or recommended tasks",
      icon: Workflow,
      tone: "text-teal-700",
    },
    {
      label: "Current blockers",
      value: dashboard.counts.blockedTasks.toString(),
      detail: "Visible, not hidden",
      icon: CircleAlert,
      tone: "text-rose-700",
    },
    {
      label: "Active agents",
      value: dashboard.counts.activeAgents.toString(),
      detail: "Enabled and available",
      icon: Activity,
      tone: "text-amber-700",
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Build"
        title="Build loop"
        description="Goal, MVP boundary, next tasks, and chat in one place."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label} className="bg-white/88">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{card.detail}</p>
                </div>
                <div className={`rounded-2xl bg-slate-950/6 p-3 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              {card.label === "MVP progress" ? (
                <div className="mt-4">
                  <ProgressBar value={completionPercent} />
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.86))]">
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="warm">{dashboard.project.status}</Badge>
                <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {chat.backend === "openclaw" ? "OpenClaw chat" : "Provider chat"}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Current goal
                </p>
                <CardTitle className="text-2xl">{projectGoal}</CardTitle>
                <CardDescription className="max-w-3xl text-base">{projectSummary}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/projects/${projectId}/goal`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                >
                  Refine MVP
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/projects/${projectId}/tasks`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                >
                  Review tasks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2 font-semibold text-slate-950">
                <GitBranch className="h-4 w-4" />
                {dashboard.project.workspace.branch}
              </div>
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Preview {dashboard.project.preview.status}
              </div>
              <div>{dashboard.project.workspace.dirtyFiles.length} dirty files visible</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                MVP boundary
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{boundaryReasoning}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-100/80">
                What matters now
              </p>
              <p className="mt-3 text-sm leading-6 text-white/80">{currentFocus}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Later, not now
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {laterScope.length > 0 ? (
                  laterScope.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    Keep expansion ideas parked here until the first MVP slice is done.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.34fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Assistant mode
                </p>
                <form
                  action={setProjectDefaultChatBotAction.bind(null, projectId, returnPath)}
                  className="mt-4 space-y-3"
                >
                  <select
                    name="botId"
                    defaultValue={chat.defaultBotId}
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                  >
                    {chat.bots.map((bot) => (
                      <option key={bot.id} value={bot.id}>
                        {bot.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                  >
                    Use this mode
                  </button>
                </form>
                <form
                  action={createProjectChatSessionAction.bind(null, projectId, returnPath)}
                  className="mt-3"
                >
                  <input type="hidden" name="botId" value={chat.defaultBotId} />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    New thread
                  </button>
                </form>
                {chat.warning ? (
                  <p className="mt-3 text-sm leading-6 text-amber-800">{chat.warning}</p>
                ) : null}
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Threads
                </p>
                <div className="mt-4 space-y-3">
                  {chat.sessions.length > 0 ? (
                    chat.sessions.map((sessionItem) => (
                      <Link
                        key={sessionItem.id}
                        href={`${returnPath}?session=${sessionItem.id}`}
                        className={`block rounded-[20px] border px-4 py-3 text-sm transition ${
                          chat.activeSession?.id === sessionItem.id
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-950"
                        }`}
                      >
                        <p className="font-semibold">{sessionItem.title}</p>
                        <p className="mt-1 text-xs opacity-75">
                          {chat.bots.find((bot) => bot.id === sessionItem.botId)?.name ??
                            sessionItem.botId}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-slate-600">
                      No thread yet. Start one and keep the iteration history inside the project.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                    Built-in chat
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    {chat.bots.find((bot) => bot.id === chat.defaultBotId)?.name ??
                      chat.assistantLabel}
                  </h2>
                </div>
                <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                  {chat.configured ? chat.assistantLabel : "Setup needed"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Target user
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {dashboard.project.targetUser || "Define the user in Goal & MVP."}
                  </p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Done means
                  </p>
                  <div className="mt-2 space-y-2">
                    {definitionOfDone.length > 0 ? (
                      definitionOfDone.map((item) => (
                        <p key={item} className="text-sm leading-6 text-slate-700">
                          {item}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-slate-600">
                        Add project definition of done in Goal &amp; MVP.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {hiddenMessageCount > 0 ? (
                <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Showing the latest {visibleMessages.length} messages in this thread. Older context
                  stays attached to the session.
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                {visibleMessages.length > 0 ? (
                  visibleMessages.map((message) => {
                    const messageBody =
                      message.role === "assistant"
                        ? buildMessagePreview(message.content)
                        : {
                            preview: message.content,
                            full: message.content,
                            isLong: false,
                          };

                    return (
                      <div
                        key={message.id}
                        className={`rounded-[24px] border p-4 ${
                          message.role === "assistant"
                            ? "border-teal-200 bg-teal-50/70"
                            : message.role === "user"
                              ? "border-slate-200 bg-slate-950 text-white"
                              : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                          <Bot className="h-4 w-4" />
                          {message.role === "assistant" ? chat.assistantLabel : "You"}
                        </div>
                          <span className="text-xs opacity-70">{message.createdAt}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                          {messageBody.preview}
                        </p>

                        {messageBody.isLong ? (
                          <details className="mt-4 rounded-[18px] border border-current/10 bg-white/70 p-4 text-slate-700">
                            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                              Open full response
                            </summary>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                              {messageBody.full}
                            </p>
                          </details>
                        ) : null}

                        {message.suggestions.length > 0 ? (
                          <div className="mt-4 space-y-3 border-t border-current/10 pt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-75">
                              Explicit suggestions
                            </p>
                            {message.suggestions.map((suggestion) => (
                              <div
                                key={suggestion.id}
                                className="rounded-[20px] border border-slate-200 bg-white p-4 text-slate-900"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                                    {suggestion.kind}
                                  </span>
                                  {suggestion.priority ? (
                                    <PriorityBadge priority={suggestion.priority} />
                                  ) : null}
                                </div>
                                <h3 className="mt-3 font-semibold text-slate-950">
                                  {suggestion.title}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                  {suggestion.summary}
                                </p>
                                {suggestion.kind === "task" ? (
                                  dashboard.project.features.length > 0 ? (
                                    <form
                                      action={createTaskFromChatSuggestionAction.bind(
                                        null,
                                        projectId,
                                        returnPath,
                                      )}
                                      className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
                                    >
                                      <input
                                        type="hidden"
                                        name="sessionId"
                                        value={message.sessionId}
                                      />
                                      <input type="hidden" name="messageId" value={message.id} />
                                      <input
                                        type="hidden"
                                        name="suggestionId"
                                        value={suggestion.id}
                                      />
                                      <select
                                        name="featureId"
                                        defaultValue={
                                          dashboard.project.features.find(
                                            (feature) => feature.title === suggestion.featureTitle,
                                          )?.id ?? dashboard.project.features[0]?.id
                                        }
                                        className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
                                      >
                                        {dashboard.project.features.map((feature) => (
                                          <option key={feature.id} value={feature.id}>
                                            {feature.title}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="submit"
                                        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                      >
                                        Create task
                                      </button>
                                    </form>
                                  ) : (
                                    <div className="mt-4">
                                      <Link
                                        href={`/projects/${projectId}/features`}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                                      >
                                        Create a feature first
                                        <ArrowRight className="h-4 w-4" />
                                      </Link>
                                    </div>
                                  )
                                ) : (
                                  <div className="mt-4">
                                    <Link
                                      href={`/projects/${projectId}/goal`}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                                    >
                                      Review in Goal & MVP
                                      <ArrowRight className="h-4 w-4" />
                                    </Link>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                    Start a thread and turn good suggestions into explicit work instead of hidden scope changes.
                  </div>
                )}
              </div>

              <form
                action={sendProjectChatMessageAction.bind(null, projectId, returnPath)}
                className="mt-5 space-y-3 border-t border-slate-200 pt-5"
              >
                <input type="hidden" name="sessionId" value={chat.activeSession?.id ?? ""} />
                <input type="hidden" name="botId" value={chat.defaultBotId} />
                <textarea
                  name="content"
                  rows={4}
                  required
                  placeholder="Ask the project chat to refine the MVP, propose next tasks, or challenge the current plan."
                  className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Chat can suggest MVP and task changes, but the task policy still controls actual state changes.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Send
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Card>

        <div className="grid gap-5">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Next recommended tasks
            </p>
            <div className="mt-4 space-y-4">
              {dashboard.nextTasks.length > 0 ? (
                dashboard.nextTasks.map((task) => (
                  <div key={task.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <TaskStatusBadge status={task.state} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-950">{task.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>
                    <div className="mt-4">
                      <Link
                        href={`/projects/${projectId}/tasks/${task.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
                      >
                        Open task
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  No task is ready yet. Tighten the MVP in Goal &amp; MVP or open Tasks to route the first slice.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Active execution
                </p>
                <CardTitle className="mt-2">
                  {activeTask ? activeTask.title : "No task running right now"}
                </CardTitle>
              </div>
              <Workflow className="h-5 w-5 text-teal-700" />
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>{activeTask?.description ?? "Route the next task to start visible progress."}</p>
              <div className="flex flex-wrap gap-2">
                {activeTask ? <TaskStatusBadge status={activeTask.state} /> : null}
                {activeTask ? <PriorityBadge priority={activeTask.priority} /> : null}
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">
                  {activeAgent ? activeAgent.name : "No active agent"}
                </p>
                <p className="mt-1">{activeAgent?.role ?? "Assign ownership to begin execution."}</p>
                {activeRun ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {activeRun.status} via {activeRun.trigger}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Momentum
                </p>
                <CardTitle className="mt-2">Recent completions and runs</CardTitle>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Completed lately
                </p>
                <div className="mt-3 space-y-3">
                  {dashboard.recentCompletedTasks.length > 0 ? (
                    dashboard.recentCompletedTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="rounded-[18px] border border-emerald-200 bg-white/90 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-emerald-950">{task.title}</p>
                          <TaskStatusBadge status={task.state} />
                        </div>
                        <p className="mt-1 text-xs text-emerald-800/80">
                          {task.completedAt ?? "Completed"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-emerald-900/80">
                      Nothing is marked done yet. Push a task through review to start the streak.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Latest run history
                </p>
                <div className="mt-3 space-y-3">
                  {recentRuns.length > 0 ? (
                    recentRuns.map((run) => (
                      <div
                        key={run.id}
                        className="rounded-[18px] border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-950">{run.summary}</p>
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                            {run.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{run.reason}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {run.trigger} at {run.createdAt}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">
                      No runs yet. Queue work from tasks or orchestration to start a visible run
                      history.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Workspace and preview
            </p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-950">
                  <GitBranch className="h-4 w-4" />
                  {dashboard.project.workspace.branch}
                </div>
                <p className="mt-2">{dashboard.project.workspace.lastCommit}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-950">
                  <PlayCircle className="h-4 w-4" />
                  {dashboard.project.preview.status}
                </div>
                <p className="mt-2">{dashboard.project.preview.url}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/projects/${projectId}/workspace`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                >
                  Workspace
                </Link>
                <Link
                  href={`/projects/${projectId}/preview`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                >
                  Preview
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
