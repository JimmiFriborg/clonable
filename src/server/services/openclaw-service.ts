import crypto from "node:crypto";

import { z } from "zod";

import type { ProjectRepository } from "@/server/domain/project-repository";
import type { ProjectRecord } from "@/server/domain/project";
import type { ChatBackend } from "@/server/domain/ai-provider";
import type {
  CreateProjectChatSessionInput,
  CreateTaskFromChatSuggestionInput,
  OpenClawBotProfile,
  OpenClawCatalogResponse,
  ProjectChatMessage,
  ProjectChatSession,
  ProjectChatSuggestion,
  ProjectChatSurface,
  SendProjectChatMessageInput,
} from "@/server/domain/openclaw";
import {
  defaultOpenClawBotProfiles,
  resolveOpenClawDefaultBotId,
} from "@/server/domain/openclaw";
import { syncProjectMetadataToAppwrite } from "@/server/infrastructure/appwrite/metadata-sync";
import { sqliteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";
import {
  generateStructuredObject,
  getChatProviderSelection,
} from "@/server/services/provider-gateway";
import { runProjectOrchestrationCycle } from "@/server/services/orchestration-service";

interface OpenClawConfig {
  baseUrl?: string;
  apiKey?: string;
  defaultBotId: string;
}

interface OpenClawReply {
  reply: string;
  suggestions: ProjectChatSuggestion[];
  warning?: string;
}

interface ProjectChatRuntime {
  backend: ChatBackend;
  configured: boolean;
  assistantLabel: string;
  warning?: string;
}

const openClawBotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  defaultProjectRole: z.string().optional(),
});

const openClawSuggestionSchema = z.object({
  kind: z.enum(["mvp", "task"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  details: z.string().min(1),
  priority: z.enum(["blocker", "high", "normal", "low"]).optional(),
  featureTitle: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).default([]),
});

const openClawResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(openClawSuggestionSchema).default([]),
});

const providerChatResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(openClawSuggestionSchema).default([]),
});

function getOpenClawConfig(): OpenClawConfig {
  return {
    baseUrl: process.env.OPENCLAW_BASE_URL?.trim(),
    apiKey: process.env.OPENCLAW_API_KEY?.trim(),
    defaultBotId: process.env.OPENCLAW_DEFAULT_BOT_ID?.trim() || "mvp-guide",
  };
}

function getOpenClawHeaders(apiKey?: string) {
  return {
    "content-type": "application/json",
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  };
}

function buildFallbackBotCatalog(defaultBotId?: string): OpenClawCatalogResponse {
  const resolvedBotId = resolveOpenClawDefaultBotId(defaultBotId, defaultOpenClawBotProfiles);

  return {
    configured: Boolean(process.env.OPENCLAW_BASE_URL && process.env.OPENCLAW_API_KEY),
    defaultBotId: resolvedBotId,
    bots: defaultOpenClawBotProfiles,
  };
}

function getProjectChatRuntime(): ProjectChatRuntime {
  const openClawConfig = getOpenClawConfig();

  if (openClawConfig.baseUrl && openClawConfig.apiKey) {
    return {
      backend: "openclaw",
      configured: true,
      assistantLabel: "OpenClaw",
    };
  }

  const provider = getChatProviderSelection();
  if (provider.configured) {
    return {
      backend: "provider",
      configured: true,
      assistantLabel: `${provider.provider} chat`,
      warning: "OpenClaw is optional. Built-in chat is using your configured AI provider.",
    };
  }

  return {
    backend: "provider",
    configured: false,
    assistantLabel: "Project chat",
    warning:
      "Add at least one provider API key, such as OPENAI_API_KEY, to enable built-in project chat. OpenClaw is optional.",
  };
}

function createSuggestion(kind: ProjectChatSuggestion["kind"], seed: string): ProjectChatSuggestion {
  return {
    id: `suggestion-${crypto.randomUUID()}`,
    kind,
    title: seed.slice(0, 80) || "Suggestion",
    summary: seed,
    details: seed,
    priority: "normal",
    acceptanceCriteria: [],
  };
}

function normalizeOpenClawResponse(payload: unknown): OpenClawReply {
  const directResult = openClawResponseSchema.safeParse(payload);
  if (directResult.success) {
    return {
      reply: directResult.data.reply,
      suggestions: directResult.data.suggestions.map((suggestion) => ({
        id: `suggestion-${crypto.randomUUID()}`,
        kind: suggestion.kind,
        title: suggestion.title,
        summary: suggestion.summary,
        details: suggestion.details,
        priority: suggestion.priority,
        featureTitle: suggestion.featureTitle,
        acceptanceCriteria: suggestion.acceptanceCriteria,
      })),
    };
  }

  if (typeof payload === "object" && payload) {
    const record = payload as Record<string, unknown>;
    const reply =
      (typeof record.reply === "string" && record.reply) ||
      (typeof record.message === "string" && record.message) ||
      (typeof record.content === "string" && record.content) ||
      (typeof record.output === "string" && record.output) ||
      (typeof record.text === "string" && record.text) ||
      undefined;

    const rawSuggestions = Array.isArray(record.suggestions) ? record.suggestions : [];

    if (reply) {
      return {
        reply,
        suggestions: rawSuggestions.reduce<ProjectChatSuggestion[]>((accumulator, item) => {
            const parsed = openClawSuggestionSchema.safeParse(item);
            if (!parsed.success) {
              return accumulator;
            }

            accumulator.push({
              id: `suggestion-${crypto.randomUUID()}`,
              kind: parsed.data.kind,
              title: parsed.data.title,
              summary: parsed.data.summary,
              details: parsed.data.details,
              priority: parsed.data.priority,
              featureTitle: parsed.data.featureTitle,
              acceptanceCriteria: parsed.data.acceptanceCriteria,
            });

            return accumulator;
          }, []),
      };
    }
  }

  return {
    reply: "OpenClaw returned a response, but it was not in the expected format.",
    suggestions: [],
    warning: "OpenClaw response format was not recognized.",
  };
}

function buildProjectContext(project: ProjectRecord) {
  return {
    goal: project.mvp.goalStatement,
    mvpSummary: project.mvp.summary,
    boundaryReasoning: project.mvp.boundaryReasoning,
    currentFocus: project.currentFocus,
    definitionOfDone: project.definitionOfDone,
    nextTasks: project.tasks
      .filter((task) => ["Ready", "In_Progress", "Blocked", "Waiting", "QA_Review"].includes(task.state))
      .slice(0, 5)
      .map((task) => ({
        id: task.id,
        title: task.title,
        state: task.state,
        priority: task.priority,
      })),
    workspace: {
      branch: project.workspace.branch,
      dirtyFiles: project.workspace.dirtyFiles,
    },
    preview: {
      status: project.preview.status,
      url: project.preview.url,
    },
  };
}

async function fetchOpenClawBotCatalog(config: OpenClawConfig): Promise<OpenClawCatalogResponse> {
  const fallback = buildFallbackBotCatalog(config.defaultBotId);

  if (!config.baseUrl || !config.apiKey) {
    return {
      ...fallback,
      warning: "OpenClaw is optional. Add OPENCLAW_BASE_URL and OPENCLAW_API_KEY only if you want OpenClaw-backed chat.",
    };
  }

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/bots`, {
      headers: getOpenClawHeaders(config.apiKey),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ...fallback,
        warning: `OpenClaw bot catalog request failed with ${response.status}.`,
      };
    }

    const payload = (await response.json()) as unknown;
    const rawBots = Array.isArray(payload)
      ? payload
      : typeof payload === "object" && payload && Array.isArray((payload as { bots?: unknown[] }).bots)
        ? ((payload as { bots?: unknown[] }).bots ?? [])
        : [];
    const bots = rawBots
      .map((bot) => openClawBotSchema.safeParse(bot))
      .filter((result) => result.success)
      .map((result) => result.data);

    if (bots.length === 0) {
      return fallback;
    }

    return {
      configured: true,
      defaultBotId: resolveOpenClawDefaultBotId(config.defaultBotId, bots),
      bots,
    };
  } catch (error) {
    return {
      ...fallback,
      warning: error instanceof Error ? error.message : "Unable to reach OpenClaw.",
    };
  }
}

async function requestOpenClawReply(
  project: ProjectRecord,
  botId: string,
  messages: ProjectChatMessage[],
  config: OpenClawConfig,
): Promise<OpenClawReply> {
  if (!config.baseUrl || !config.apiKey) {
    return {
      reply:
        "OpenClaw is not configured for this install. Clonable can still use provider-backed chat if you configure any supported AI provider.",
      suggestions: [],
      warning: "OpenClaw configuration is missing.",
    };
  }

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat`, {
      method: "POST",
      headers: getOpenClawHeaders(config.apiKey),
      body: JSON.stringify({
        botId,
        projectContext: buildProjectContext(project),
        messages: messages.slice(-12).map((message) => ({
          role: message.role,
          content: message.content,
        })),
        responseFormat: "json",
        instructions:
          "Respond with JSON: { reply, suggestions[] }. Suggestions must be explicit and visible, never silent mutations.",
      }),
    });

    if (!response.ok) {
      return {
        reply: `OpenClaw returned ${response.status}. The project chat stayed intact, but no live assistant response was generated.`,
        suggestions: [],
        warning: `OpenClaw request failed with ${response.status}.`,
      };
    }

    return normalizeOpenClawResponse(await response.json());
  } catch (error) {
    return {
      reply: "OpenClaw could not be reached right now. The thread was saved so you can retry.",
      suggestions: [],
      warning: error instanceof Error ? error.message : "OpenClaw request failed.",
    };
  }
}

function buildSessionTitle(content: string, bot: OpenClawBotProfile | undefined) {
  const trimmed = content.trim();
  if (!trimmed) {
    return bot ? `${bot.name} thread` : "New chat thread";
  }

  return trimmed.slice(0, 64);
}

async function syncProjectMetadata(project: ProjectRecord | undefined) {
  if (!project) {
    return;
  }

  try {
    await syncProjectMetadataToAppwrite(project);
  } catch (error) {
    console.error("Appwrite metadata sync failed", error);
  }
}

async function requestProviderChatReply(
  project: ProjectRecord,
  bot: OpenClawBotProfile | undefined,
  messages: ProjectChatMessage[],
): Promise<OpenClawReply> {
  const providerSelection = getChatProviderSelection();

  if (!providerSelection.configured) {
    return {
      reply:
        "Built-in chat is not configured yet. Add a provider API key such as OPENAI_API_KEY in Settings or env, then retry. OpenClaw is optional.",
      suggestions: [],
      warning: "No AI provider is configured for project chat.",
    };
  }

  const transcript = messages
    .slice(-12)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  try {
    const payload = await generateStructuredObject({
      provider: providerSelection.provider,
      model: providerSelection.model,
      schema: providerChatResponseSchema,
      schemaName: "project_chat_response",
      instructions: [
        "You are Clonable's project chat assistant.",
        "Your job is to help the user refine the MVP, challenge scope drift, and suggest explicit next work.",
        "Never imply that tasks were changed silently. Suggestions must stay explicit and user-visible.",
        "Return concise useful prose plus optional suggestions.",
        bot
          ? `Adopt this assistant mode: ${bot.name}. ${bot.description}`
          : "Use a practical product-builder tone.",
      ].join(" "),
      input: [
        `Project context: ${JSON.stringify(buildProjectContext(project))}`,
        `Conversation:\n${transcript}`,
        "Respond with JSON containing { reply, suggestions[] }.",
      ].join("\n\n"),
    });

    return normalizeOpenClawResponse(payload);
  } catch (error) {
    return {
      reply:
        "The configured AI provider could not generate a chat response right now. The thread was saved, so you can retry without losing context.",
      suggestions: [],
      warning: error instanceof Error ? error.message : "Provider-backed chat failed.",
    };
  }
}

async function requestProjectChatReply(
  project: ProjectRecord,
  botId: string,
  messages: ProjectChatMessage[],
  catalog: OpenClawCatalogResponse,
): Promise<OpenClawReply> {
  const runtime = getProjectChatRuntime();
  const bot = catalog.bots.find((candidate) => candidate.id === botId);

  if (runtime.backend === "openclaw") {
    return requestOpenClawReply(project, botId, messages, getOpenClawConfig());
  }

  return requestProviderChatReply(project, bot, messages);
}

export async function getOpenClawCatalog(): Promise<OpenClawCatalogResponse> {
  return fetchOpenClawBotCatalog(getOpenClawConfig());
}

export async function getProjectChatSurface(
  projectId: string,
  sessionId?: string,
  repository: ProjectRepository = sqliteProjectRepository,
): Promise<ProjectChatSurface | undefined> {
  const project = await repository.getProject(projectId);
  if (!project) {
    return undefined;
  }

  const catalog = await getOpenClawCatalog();
  const runtime = getProjectChatRuntime();
  const defaultBotId = resolveOpenClawDefaultBotId(project.defaultChatBotId, catalog.bots);
  const sessions = [...(await repository.listProjectChatSessions(projectId))].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
  const activeSession =
    sessions.find((session) => session.id === sessionId) ??
    sessions.find((session) => session.botId === defaultBotId) ??
    sessions[0];
  const messages = activeSession
    ? await repository.listProjectChatMessages(projectId, activeSession.id)
    : [];

  return {
    backend: runtime.backend,
    configured: runtime.configured,
    assistantLabel: runtime.assistantLabel,
    defaultBotId,
    bots: catalog.bots,
    sessions,
    activeSession,
    messages,
    warning: runtime.warning ?? catalog.warning,
  };
}

export async function updateProjectDefaultChatBot(
  projectId: string,
  botId: string,
  repository: ProjectRepository = sqliteProjectRepository,
) {
  const catalog = await getOpenClawCatalog();
  const project = await repository.updateProjectDefaultChatBot(
    projectId,
    resolveOpenClawDefaultBotId(botId, catalog.bots),
  );

  await syncProjectMetadata(project);
  return project;
}

export async function createProjectChatSession(
  projectId: string,
  input: CreateProjectChatSessionInput,
  repository: ProjectRepository = sqliteProjectRepository,
) {
  const project = await repository.getProject(projectId);
  if (!project) {
    return undefined;
  }

  const catalog = await getOpenClawCatalog();
  const resolvedBotId = resolveOpenClawDefaultBotId(input.botId, catalog.bots);
  const bot = catalog.bots.find((candidate) => candidate.id === resolvedBotId);
  const createdAt = new Date().toISOString();
  const session: ProjectChatSession = {
    id: `session-${crypto.randomUUID()}`,
    projectId,
    botId: resolvedBotId,
    title: input.title?.trim() || `${bot?.name ?? "OpenClaw"} thread`,
    createdAt,
    updatedAt: createdAt,
  };

  const created = await repository.createProjectChatSession(projectId, session);
  if (!created) {
    return undefined;
  }

  await repository.recordEvent({
    projectId,
    type: "agent",
    summary: "Project chat thread created",
    reason: `A new ${bot?.name ?? resolvedBotId} chat thread was created for the project.`,
    payload: {
      botId: resolvedBotId,
      sessionId: created.id,
    },
  });

  const updatedProject = await repository.updateProjectDefaultChatBot(projectId, resolvedBotId);
  await syncProjectMetadata(updatedProject);
  return created;
}

export async function sendProjectChatMessage(
  projectId: string,
  input: SendProjectChatMessageInput,
  repository: ProjectRepository = sqliteProjectRepository,
) {
  const project = await repository.getProject(projectId);
  if (!project) {
    return undefined;
  }

  const catalog = await getOpenClawCatalog();
  const runtime = getProjectChatRuntime();
  const resolvedBotId = resolveOpenClawDefaultBotId(input.botId, catalog.bots);
  const bot = catalog.bots.find((candidate) => candidate.id === resolvedBotId);
  let session =
    (input.sessionId
      ? await repository.getProjectChatSession(projectId, input.sessionId)
      : undefined) ??
    undefined;

  if (!session) {
    session = await createProjectChatSession(
      projectId,
      {
        botId: resolvedBotId,
        title: buildSessionTitle(input.content, bot),
      },
      repository,
    );
  }

  if (!session) {
    return undefined;
  }

  const userMessage: ProjectChatMessage = {
    id: `message-${crypto.randomUUID()}`,
    projectId,
    sessionId: session.id,
    botId: resolvedBotId,
    role: "user",
    content: input.content.trim(),
    suggestions: [],
    createdAt: new Date().toISOString(),
  };

  await repository.createProjectChatMessage(projectId, userMessage);
  const history = await repository.listProjectChatMessages(projectId, session.id);
  const reply = await requestProjectChatReply(project, resolvedBotId, history, catalog);
  const assistantMessage: ProjectChatMessage = {
    id: `message-${crypto.randomUUID()}`,
    projectId,
    sessionId: session.id,
    botId: resolvedBotId,
    role: "assistant",
    content: reply.reply,
    suggestions: reply.suggestions,
    createdAt: new Date().toISOString(),
  };

  await repository.createProjectChatMessage(projectId, assistantMessage);
  await repository.recordEvent({
    projectId,
    type: "agent",
    summary: "Project chat replied",
    reason: reply.warning
      ? `${runtime.assistantLabel} reply stored with warning: ${reply.warning}`
      : `${runtime.assistantLabel} ${bot?.name ?? resolvedBotId} replied in project chat.`,
    payload: {
      botId: resolvedBotId,
      sessionId: session.id,
      suggestions: reply.suggestions.length,
    },
  });

  if (project.defaultChatBotId !== resolvedBotId) {
    const updatedProject = await repository.updateProjectDefaultChatBot(projectId, resolvedBotId);
    await syncProjectMetadata(updatedProject);
  }

  return {
    sessionId: session.id,
    userMessage,
    assistantMessage,
  };
}

export async function createTaskFromChatSuggestion(
  projectId: string,
  input: CreateTaskFromChatSuggestionInput,
  repository: ProjectRepository = sqliteProjectRepository,
) {
  const project = await repository.getProject(projectId);
  if (!project) {
    return undefined;
  }

  const feature = project.features.find((candidate) => candidate.id === input.featureId);
  if (!feature) {
    return undefined;
  }

  const message = (await repository.listProjectChatMessages(projectId, input.sessionId)).find(
    (candidate) => candidate.id === input.messageId,
  );
  const suggestion = message?.suggestions.find((candidate) => candidate.id === input.suggestionId);

  if (!suggestion || suggestion.kind !== "task") {
    return undefined;
  }

  const updatedProject = await repository.createTask(projectId, {
    featureId: feature.id,
    title: suggestion.title,
    description: suggestion.details,
    priority: suggestion.priority ?? "normal",
    acceptanceCriteria:
      suggestion.acceptanceCriteria.length > 0
        ? suggestion.acceptanceCriteria
        : [suggestion.summary],
    dependencies: [],
    requiresUser: false,
  });

  if (!updatedProject) {
    return undefined;
  }

  await repository.recordEvent({
    projectId,
    type: "task",
    summary: "Task created from chat suggestion",
    reason: `A chat suggestion from ${message?.botId ?? "OpenClaw"} was turned into an explicit task.`,
    payload: {
      sessionId: input.sessionId,
      messageId: input.messageId,
      suggestionId: input.suggestionId,
      featureId: input.featureId,
    },
  });

  if (updatedProject.runtime.orchestrationEnabled) {
    await runProjectOrchestrationCycle(projectId);
  }

  await syncProjectMetadata(updatedProject);
  return updatedProject;
}

export function buildChatSuggestionsFromText(seed: string) {
  return [createSuggestion("task", seed)];
}
