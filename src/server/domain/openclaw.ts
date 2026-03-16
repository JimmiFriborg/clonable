import type { TaskPriority } from "@/server/domain/project";

export type ChatBackend = "openclaw";
export const projectChatRoleOrder = ["system", "user", "assistant"] as const;
export const projectChatSuggestionKindOrder = ["mvp", "task"] as const;
export type ProjectChatRole = (typeof projectChatRoleOrder)[number];
export type ProjectChatSuggestionKind = (typeof projectChatSuggestionKindOrder)[number];

export interface OpenClawBotProfile {
  id: string;
  name: string;
  description: string;
  defaultProjectRole?: string;
}

export interface ProjectChatSuggestion {
  id: string;
  kind: ProjectChatSuggestionKind;
  title: string;
  summary: string;
  details: string;
  priority?: TaskPriority;
  featureTitle?: string;
  acceptanceCriteria: string[];
}

export interface ProjectChatSession {
  id: string;
  projectId: string;
  botId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectChatMessage {
  id: string;
  projectId: string;
  sessionId: string;
  botId: string;
  role: ProjectChatRole;
  content: string;
  suggestions: ProjectChatSuggestion[];
  createdAt: string;
}

export interface ProjectChatSurface {
  backend: ChatBackend;
  configured: boolean;
  defaultBotId: string;
  bots: OpenClawBotProfile[];
  sessions: ProjectChatSession[];
  activeSession?: ProjectChatSession;
  messages: ProjectChatMessage[];
  warning?: string;
}

export interface OpenClawCatalogResponse {
  configured: boolean;
  defaultBotId: string;
  bots: OpenClawBotProfile[];
  warning?: string;
}

export interface CreateProjectChatSessionInput {
  botId: string;
  title?: string;
}

export interface SendProjectChatMessageInput {
  sessionId?: string;
  botId: string;
  content: string;
}

export interface CreateTaskFromChatSuggestionInput {
  sessionId: string;
  messageId: string;
  suggestionId: string;
  featureId: string;
}

export const defaultOpenClawBotProfiles: OpenClawBotProfile[] = [
  {
    id: "mvp-guide",
    name: "MVP Guide",
    description: "Clarifies the smallest credible MVP, trims scope, and keeps momentum grounded.",
    defaultProjectRole: "chat",
  },
  {
    id: "delivery-orchestrator",
    name: "Delivery Orchestrator",
    description: "Turns broad ideas into explicit next tasks, unblock plans, and practical sequencing.",
    defaultProjectRole: "orchestrator",
  },
  {
    id: "quality-guardian",
    name: "Quality Guardian",
    description: "Stress-tests acceptance criteria, regression risk, and MVP boundary discipline.",
    defaultProjectRole: "tester",
  },
  {
    id: "ux-coach",
    name: "UX Coach",
    description: "Keeps the builder loop clear, low-friction, and ADHD-approachable.",
    defaultProjectRole: "advisory",
  },
];

export function resolveOpenClawDefaultBotId(
  preferredBotId?: string,
  bots: OpenClawBotProfile[] = defaultOpenClawBotProfiles,
) {
  if (preferredBotId && bots.some((bot) => bot.id === preferredBotId)) {
    return preferredBotId;
  }

  return bots[0]?.id ?? "mvp-guide";
}
