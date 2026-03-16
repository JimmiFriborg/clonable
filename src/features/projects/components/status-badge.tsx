import { Badge } from "@/components/ui/badge";
import type {
  AgentPolicyRole,
  AgentStatus,
  ProjectStatus,
  TaskPriority,
  TaskState,
} from "@/server/domain/project";

const taskTone: Record<TaskState, "neutral" | "accent" | "warm" | "danger" | "info"> = {
  Backlog: "neutral",
  Ready: "accent",
  In_Progress: "warm",
  Blocked: "danger",
  Waiting: "info",
  QA_Review: "info",
  Done: "accent",
  Split_Pending: "warm",
};

const priorityTone: Record<TaskPriority, "neutral" | "accent" | "warm" | "danger" | "info"> = {
  blocker: "danger",
  high: "warm",
  normal: "info",
  low: "neutral",
};

const projectTone: Record<ProjectStatus, "neutral" | "accent" | "warm" | "danger" | "info"> = {
  Discovery: "info",
  Planning: "info",
  Building: "warm",
  Review: "accent",
  Complete: "accent",
};

const agentTone: Record<AgentStatus, "neutral" | "accent" | "warm" | "danger" | "info"> = {
  active: "warm",
  ready: "accent",
  paused: "neutral",
};

const agentRoleTone: Record<AgentPolicyRole, "neutral" | "accent" | "warm" | "danger" | "info"> = {
  planner: "info",
  orchestrator: "warm",
  advisory: "neutral",
  builder: "accent",
  tester: "info",
  fixer: "danger",
  documentation: "neutral",
};

export function TaskStatusBadge({ status }: { status: TaskState }) {
  return <Badge tone={taskTone[status]}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge tone={priorityTone[priority]}>{priority}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={projectTone[status]}>{status}</Badge>;
}

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return <Badge tone={agentTone[status]}>{status}</Badge>;
}

export function AgentRoleBadge({ role }: { role: AgentPolicyRole }) {
  return <Badge tone={agentRoleTone[role]}>{role}</Badge>;
}
