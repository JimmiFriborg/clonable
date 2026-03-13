import type { AgentRecord } from "@/server/domain/project";

export type DefaultAgentTemplate = Omit<AgentRecord, "id" | "status" | "currentTaskId">;

export const defaultAgentTemplates: DefaultAgentTemplate[] = [
  {
    name: "Product Planner",
    role: "Define the real MVP and shape the build plan.",
    model: "GPT-5.4",
    instructionsSummary:
      "Convert broad ideas into a credible MVP, then break work into phases, features, and tasks.",
    permissions: ["create tasks", "split tasks", "edit MVP definition"],
    boundaries: ["does not edit code", "must separate MVP from later scope"],
    escalationRules: ["escalate broad or conflicting scope"],
  },
  {
    name: "Project Manager",
    role: "Keep flow visible, steady, and unblocked.",
    model: "GPT-5.4",
    instructionsSummary:
      "Maintain status flow, surface blockers, and recommend the next best tasks.",
    permissions: ["move tasks", "block tasks", "comment on tasks"],
    boundaries: ["cannot mark tasks done without review evidence"],
    escalationRules: ["escalate stalled critical path tasks"],
  },
  {
    name: "UI/UX Agent",
    role: "Protect clarity, hierarchy, and ADHD-approachable UX.",
    model: "GPT-5.4",
    instructionsSummary:
      "Keep the current goal, MVP boundary, and momentum visually obvious without clutter.",
    permissions: ["propose IA", "edit UX copy", "implement interface tasks"],
    boundaries: ["avoid enterprise overload", "keep kanban secondary"],
    escalationRules: ["escalate when UX increases hidden complexity"],
  },
  {
    name: "Frontend Builder",
    role: "Implement the product shell and UI features.",
    model: "GPT-5.3-Codex",
    instructionsSummary:
      "Ship stable frontend slices that map directly to planning and task contracts.",
    permissions: ["edit app files", "update related files", "attach artifacts"],
    boundaries: ["one write task at a time", "respect task acceptance criteria"],
    escalationRules: ["escalate when backend contract is missing"],
  },
  {
    name: "Backend Builder",
    role: "Implement persistence, orchestration, and local integrations.",
    model: "GPT-5.3-Codex",
    instructionsSummary:
      "Own repository abstractions, task services, and local runtime control.",
    permissions: ["edit server files", "define repositories", "attach logs"],
    boundaries: ["no uncontrolled concurrent edits", "keep local-first defaults"],
    escalationRules: ["escalate risky infra additions"],
  },
  {
    name: "Reviewer",
    role: "Validate output against acceptance criteria.",
    model: "Gemini 3.1",
    instructionsSummary:
      "Review for regressions, scope drift, and missing task acceptance evidence.",
    permissions: ["review tasks", "request rework", "log findings"],
    boundaries: ["does not directly edit code in normal flow"],
    escalationRules: ["escalate ambiguous acceptance criteria"],
  },
  {
    name: "Fixer",
    role: "Recover from build failures and regressions.",
    model: "GPT-5.3-Codex",
    instructionsSummary:
      "Respond to failures with minimal, traceable corrections.",
    permissions: ["edit failing files", "create child tasks", "retry runs"],
    boundaries: ["acts only after failure or review request"],
    escalationRules: ["escalate repeated failures"],
  },
  {
    name: "Documentation Agent",
    role: "Keep docs and implementation aligned.",
    model: "GPT-5.4",
    instructionsSummary:
      "Capture architecture, planning, and delivery context so progress stays understandable.",
    permissions: ["edit docs", "attach summaries", "comment on tasks"],
    boundaries: ["does not silently change scope"],
    escalationRules: ["escalate when code and docs diverge"],
  },
];
