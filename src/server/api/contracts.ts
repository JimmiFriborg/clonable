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

export type ProjectListResponse = ProjectListItem[];
export type ProjectDashboardResponse = ProjectDashboardModel;
export type ProjectDetailResponse = ProjectRecord;
export type TaskDetailResponse = TaskRecord;
export type AgentListResponse = AgentRecord[];
export type ProjectLogsResponse = Pick<ProjectRecord, "events" | "agentRuns" | "tasks">;
export type ProviderConfigsResponse = ProviderConfigResponse;

export const createProjectRequestSchema = z.object({
  name: z.string().min(1),
  ideaPrompt: z.string().min(1),
  targetUser: z.string().min(1),
  constraints: z.array(z.string()).default([]),
  stackPreferences: z.array(z.string()).default([]),
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
  model: z.string().min(1),
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
