import type { ProjectRecord } from "@/server/domain/project";

export const demoProjectFixture: ProjectRecord = {
  id: "clonable-v1",
  slug: "clonable-v1",
  name: "Clonable V1 Foundation",
  summary:
    "A planning-first local AI builder focused on defining the MVP, showing progress clearly, and executing inside a real Git workspace.",
  status: "Building",
  currentFocus:
    "Ship the planning dashboard and codebase foundation before expanding into background orchestration and runtime controls.",
  vision:
    "Build a serious local-first hybrid AI product that turns ideas into working MVPs and keeps building momentum visible after the first generation pass.",
  plannerState: "succeeded",
  plannerMessage: "Planner draft ready for review.",
  targetUser: "Solo founders and indie builders",
  ideaPrompt:
    "Create a local-first hybrid AI builder that helps a user define an MVP, plan the work, and continue shipping inside a real Git workspace.",
  stackPreferences: ["Next.js", "TypeScript", "Tailwind", "SQLite"],
  constraints: [
    "Prefer boring, stable technologies",
    "Keep local-first and self-hostable",
    "Avoid token-gating product behavior",
    "Optimize for ADHD-friendly clarity",
  ],
  mvp: {
    goalStatement:
      "Help a user turn an idea into a working MVP through structured planning, task orchestration, and local repo-based execution.",
    summary:
      "A user can create a project from a prompt, define a realistic MVP, review phases, features, and tasks, configure agents, track progress, and work in a local Git-backed workspace.",
    successDefinition:
      "The MVP is successful when the user always knows the goal, current MVP boundary, current phase, next best tasks, active agents, recent progress, and blockers.",
    laterScope: [
      "Advanced deployment matrix",
      "Deep concurrent multi-agent editing",
      "Multi-user collaboration",
      "Visual page editor",
    ],
    boundaryReasoning:
      "V1 keeps a tight loop around planning, visible progress, serialized workspace writes, and understandable failures so the product is reusable rather than flashy.",
    constraints: [
      "Prefer boring, stable technologies",
      "Keep local-first and self-hostable",
      "Avoid token-gating product behavior",
      "Optimize for ADHD-friendly clarity",
    ],
  },
  phases: [
    {
      id: "phase-foundation",
      title: "Foundation",
      goal: "Define the product contract and deliver a stable shell.",
      status: "In Progress",
      sortOrder: 1,
    },
    {
      id: "phase-planning-core",
      title: "Planning Core",
      goal: "Capture idea, define MVP, and manage structured planning.",
      status: "Planned",
      sortOrder: 2,
    },
  ],
  features: [
    {
      id: "feature-mvp-contract",
      phaseId: "phase-foundation",
      title: "Product contract and MVP boundary",
      summary: "Turn the big idea into a credible V1 contract and scope edge.",
      status: "Done",
      priority: "P0",
      sortOrder: 1,
    },
    {
      id: "feature-dashboard-shell",
      phaseId: "phase-foundation",
      title: "ADHD-friendly dashboard shell",
      summary: "Show goal, MVP, phase focus, momentum, and blockers at a glance.",
      status: "In Progress",
      priority: "P0",
      sortOrder: 2,
    },
  ],
  tasks: [
    {
      id: "task-prd",
      phaseId: "phase-foundation",
      featureId: "feature-mvp-contract",
      title: "Write concise product definition and V1 PRD",
      description:
        "Capture the product promise, V1 scope, goals, non-goals, and success criteria.",
      status: "Done",
      priority: "P0",
      assigneeAgentId: "agent-docs",
      dependencies: [],
      blockers: [],
      acceptanceCriteria: [
        "Product definition is concise and clear",
        "V1 scope is separated from non-goals",
      ],
      relatedFiles: ["docs/foundation/01-product-definition.md"],
      artifacts: ["foundation docs"],
      history: [
        {
          at: "2026-03-13T22:10:00.000Z",
          summary: "Marked done",
          reason: "Core product contract documented.",
        },
      ],
      completedAt: "2026-03-13T22:10:00.000Z",
    },
    {
      id: "task-persistence",
      phaseId: "phase-planning-core",
      featureId: "feature-dashboard-shell",
      title: "Replace demo data with SQLite persistence",
      description: "Move the app from hard-coded state to a real local database.",
      status: "Ready",
      priority: "P0",
      dependencies: [],
      blockers: [],
      acceptanceCriteria: ["Projects persist across restarts"],
      relatedFiles: ["src/server/infrastructure"],
      artifacts: ["repository layer"],
      history: [
        {
          at: "2026-03-14T00:00:00.000Z",
          summary: "Ready for pickup",
          reason: "Foundation branch is in place.",
        },
      ],
    },
  ],
  agents: [
    {
      id: "agent-planner",
      name: "Product Planner",
      role: "Define the real MVP and shape the build plan.",
      model: "GPT-5.4",
      status: "active",
      instructionsSummary:
        "Convert broad ideas into a credible MVP, then break work into phases, features, and tasks.",
      permissions: ["create tasks", "split tasks", "edit MVP definition"],
      boundaries: ["does not edit code"],
      escalationRules: ["escalate broad or conflicting scope"],
    },
    {
      id: "agent-frontend",
      name: "Frontend Builder",
      role: "Implement the product shell and UI features.",
      model: "GPT-5.3-Codex",
      status: "ready",
      instructionsSummary:
        "Ship stable frontend slices that map directly to planning and task contracts.",
      permissions: ["edit app files", "update related files"],
      boundaries: ["one write task at a time"],
      escalationRules: ["escalate when backend contract is missing"],
    },
  ],
  events: [
    {
      id: "event-foundation",
      createdAt: "2026-03-13T22:11:00.000Z",
      type: "system",
      summary: "Foundation scaffold created",
      reason: "Clonable has a working shell and documented V1 contract.",
    },
  ],
  agentRuns: [],
  workspace: {
    rootPath: "C:\\Users\\jimmi\\Documents\\GitHub\\Clonable.dev",
    repoProvider: "Local Git",
    branch: "main",
    lastCommit: "Bootstrap Clonable foundation",
    dirtyFiles: [],
    files: [],
  },
  preview: {
    status: "Stopped",
    command: "npm run dev",
    port: 3000,
    url: "http://localhost:3000",
    recentLogs: [
      {
        at: "2026-03-13T22:12:00.000Z",
        line: "Preview not started yet.",
      },
    ],
  },
};
