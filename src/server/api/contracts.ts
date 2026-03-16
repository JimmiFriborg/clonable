import { z } from "zod";

import {
  agentPolicyRoleOrder,
  agentRunTriggerOrder,
  agentStatusOrder,
  taskPriorityOrder,
  taskStateOrder,
  type AgentRecord,
  type ProjectDashboardModel,
  type ProjectListItem,
  type ProjectRecord,
  type TaskRecord,
} from "@/server/domain/project";
import type { ProviderConfigResponse } from "@/server/domain/ai-provider";
import { agentRuntimeBackendOrder, aiProviderOrder } from "@/server/domain/ai-provider";
import type {
  OpenClawCatalogResponse,
  ProjectChatSurface,
} from "@/server/domain/openclaw";

export type ProjectListResponse = ProjectListItem[];
export type ProjectDashboardResponse = ProjectDashboardModel;
export type ProjectDetailResponse = ProjectRecord;
export type TaskDetailResponse = TaskRecord;
export type AgentListResponse = AgentRecord[];
export type ProjectLogsResponse = Pick<ProjectRecord, "events" | "agentRuns" | "tasks">;
export type ProviderConfigsResponse = ProviderConfigResponse;
export type ProjectChatResponse = ProjectChatSurface;
export type OpenClawBotsResponse = OpenClawCatalogResponse;

export const createProjectRequestSchema = z.object({
  name: z.string().default(""),
  ideaPrompt: z.string().min(1),
  targetUser: z.string().default(""),
  constraints: z.array(z.string()).default([]),
  stackPreferences: z.array(z.string()).default([]),
  githubRepositoryUrl: z.string().trim().optional(),
});

export const createTaskRequestSchema = z.object({
  featureId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(taskPriorityOrder).default("normal"),
  acceptanceCriteria: z.array(z.string()).min(1),
  dependencies: z.array(z.string()).default([]),
  requiresUser: z.boolean().optional(),
});

export const taskTransitionRequestSchema = z.object({
  state: z.enum(taskStateOrder),
  agentId: z.string().min(1),
  note: z.string().optional(),
  blockerReason: z.string().optional(),
  waitingReason: z.string().optional(),
  reviewDate: z.string().optional(),
});

export const taskOwnerRequestSchema = z.object({
  ownerAgentId: z.string().optional(),
  agentId: z.string().min(1),
});

export const agentUpsertRequestSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  policyRole: z.enum(agentPolicyRoleOrder),
  runtimeBackend: z.enum(agentRuntimeBackendOrder).default("provider"),
  provider: z.enum(aiProviderOrder).optional(),
  model: z.string().min(1),
  fallbackProviders: z
    .array(
      z.object({
        provider: z.enum(aiProviderOrder),
        model: z.string().min(1),
      }),
    )
    .default([]),
  openclawBotId: z.string().optional(),
  status: z.enum(agentStatusOrder),
  enabled: z.boolean(),
  instructionsSummary: z.string().min(1),
  instructions: z.string().min(1),
  permissions: z.array(z.string()).default([]),
  boundaries: z.array(z.string()).default([]),
  escalationRules: z.array(z.string()).default([]),
  wipLimit: z.number().int().positive().optional(),
  canWriteWorkspace: z.boolean(),
});

export const agentRuntimeRequestSchema = z.object({
  runtimeBackend: z.enum(agentRuntimeBackendOrder),
  provider: z.enum(aiProviderOrder).optional(),
  model: z.string().min(1),
  fallbackProviders: z
    .array(
      z.object({
        provider: z.enum(aiProviderOrder),
        model: z.string().min(1),
      }),
    )
    .default([]),
  openclawBotId: z.string().optional(),
});

export const runtimeOrchestrationRequestSchema = z.object({
  orchestrationEnabled: z.boolean(),
});

export const agentRunEnqueueRequestSchema = z.object({
  agentId: z.string().min(1),
  taskId: z.string().optional(),
  trigger: z.enum(agentRunTriggerOrder),
  summary: z.string().min(1),
  reason: z.string().min(1),
  inputSummary: z.string().optional(),
});

export const projectChatSessionRequestSchema = z.object({
  botId: z.string().min(1),
  title: z.string().optional(),
});

export const projectChatMessageRequestSchema = z.object({
  sessionId: z.string().optional(),
  botId: z.string().min(1),
  content: z.string().min(1),
});
