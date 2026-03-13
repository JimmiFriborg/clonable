import { Badge } from "@/components/ui/badge";
import type { AgentStatus, Priority, ProjectStatus, TaskStatus } from "@/server/domain/project";

const taskTone: Record<TaskStatus, "neutral" | "accent" | "warm" | "danger" | "info"> = {
  Inbox: "neutral",
  Planned: "info",
  Ready: "accent",
  "In Progress": "warm",
  Review: "info",
  Blocked: "danger",
  Done: "accent",
};

const priorityTone: Record<Priority, "neutral" | "accent" | "warm" | "danger" | "info"> = {
  P0: "danger",
  P1: "warm",
  P2: "info",
  P3: "neutral",
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

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={taskTone[status]}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priorityTone[priority]}>{priority}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={projectTone[status]}>{status}</Badge>;
}

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return <Badge tone={agentTone[status]}>{status}</Badge>;
}
