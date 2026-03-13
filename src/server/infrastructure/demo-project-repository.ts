import type { ProjectRecord } from "@/server/domain/project";

export const demoProjects: ProjectRecord[] = [
  {
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
        "Visual page editor"
      ],
      boundaryReasoning:
        "V1 keeps a tight loop around planning, visible progress, serialized workspace writes, and understandable failures so the product is reusable rather than flashy.",
      constraints: [
        "Prefer boring, stable technologies",
        "Keep local-first and self-hostable",
        "Avoid token-gating product behavior",
        "Optimize for ADHD-friendly clarity"
      ]
    },
    phases: [
      {
        id: "phase-foundation",
        title: "Foundation",
        goal: "Define the product contract and deliver a stable shell.",
        status: "In Progress",
        sortOrder: 1
      },
      {
        id: "phase-planning-core",
        title: "Planning Core",
        goal: "Capture idea, define MVP, and manage structured planning.",
        status: "Planned",
        sortOrder: 2
      },
      {
        id: "phase-execution-core",
        title: "Execution Core",
        goal: "Run tasks through agents, review, and recovery loops.",
        status: "Planned",
        sortOrder: 3
      },
      {
        id: "phase-workspace-preview",
        title: "Workspace + Preview",
        goal: "Bridge local Git workspaces, runtime control, and observability.",
        status: "Planned",
        sortOrder: 4
      }
    ],
    features: [
      {
        id: "feature-mvp-contract",
        phaseId: "phase-foundation",
        title: "Product contract and MVP boundary",
        summary: "Turn the big idea into a credible V1 contract and scope edge.",
        status: "Done",
        priority: "P0"
      },
      {
        id: "feature-dashboard-shell",
        phaseId: "phase-foundation",
        title: "ADHD-friendly dashboard shell",
        summary: "Show goal, MVP, phase focus, momentum, and blockers at a glance.",
        status: "In Progress",
        priority: "P0"
      },
      {
        id: "feature-planning-views",
        phaseId: "phase-planning-core",
        title: "Planning and task views",
        summary: "Expose phases, features, tasks, dependencies, and acceptance criteria.",
        status: "Planned",
        priority: "P0"
      },
      {
        id: "feature-agent-registry",
        phaseId: "phase-execution-core",
        title: "Agent registry and configuration",
        summary: "Configure system and user agents with clear permissions and boundaries.",
        status: "Planned",
        priority: "P1"
      },
      {
        id: "feature-workspace-bridge",
        phaseId: "phase-workspace-preview",
        title: "Workspace bridge",
        summary: "Connect tasks to branches, diffs, files, and commit traceability.",
        status: "Planned",
        priority: "P1"
      },
      {
        id: "feature-preview-logs",
        phaseId: "phase-workspace-preview",
        title: "Preview and observability",
        summary: "Run the project locally and expose runtime status, logs, and retries.",
        status: "Planned",
        priority: "P1"
      }
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
          "Success criteria are visible and testable"
        ],
        relatedFiles: ["docs/foundation/01-product-definition.md", "docs/foundation/02-v1-prd.md"],
        artifacts: ["foundation docs"],
        history: [
          {
            at: "2026-03-13 21:58",
            summary: "Task created",
            reason: "Foundation work needed before implementation."
          },
          {
            at: "2026-03-13 22:10",
            summary: "Marked done",
            reason: "Core product contract documented."
          }
        ],
        completedAt: "2026-03-13 22:10"
      },
      {
        id: "task-architecture",
        phaseId: "phase-foundation",
        featureId: "feature-mvp-contract",
        title: "Model architecture, schema, orchestration, and task lifecycle",
        description:
          "Define the modular monolith boundaries, schema shape, orchestration rules, and lifecycle constraints.",
        status: "Done",
        priority: "P0",
        assigneeAgentId: "agent-planner",
        dependencies: ["task-prd"],
        blockers: [],
        acceptanceCriteria: [
          "Architecture favors stability and local-first setup",
          "DB schema covers MVP planning and execution needs",
          "Task lifecycle is explicit and state-driven"
        ],
        relatedFiles: [
          "docs/foundation/03-architecture.md",
          "docs/foundation/05-db-schema.md",
          "docs/foundation/06-agents-and-orchestration.md",
          "docs/foundation/07-task-lifecycle.md"
        ],
        artifacts: ["architecture docs"],
        history: [
          {
            at: "2026-03-13 22:02",
            summary: "Task started",
            reason: "Need implementation contract before UI scaffold."
          },
          {
            at: "2026-03-13 22:10",
            summary: "Marked done",
            reason: "Architecture and lifecycle docs completed."
          }
        ],
        completedAt: "2026-03-13 22:10"
      },
      {
        id: "task-scaffold",
        phaseId: "phase-foundation",
        featureId: "feature-dashboard-shell",
        title: "Scaffold Next.js app shell and project navigation",
        description:
          "Create the executable app shell, global layout, route structure, and stable UI primitives.",
        status: "In Progress",
        priority: "P0",
        assigneeAgentId: "agent-frontend",
        dependencies: ["task-architecture"],
        blockers: [],
        acceptanceCriteria: [
          "Project routes match the V1 information architecture",
          "App shell runs locally with a coherent navigation model",
          "UI primitives are reusable and stable"
        ],
        relatedFiles: ["src/app", "src/components", "src/features"],
        artifacts: ["app shell"],
        history: [
          {
            at: "2026-03-13 22:11",
            summary: "Task started",
            reason: "Foundation docs are done and UI shell is the next unblocker."
          }
        ]
      },
      {
        id: "task-dashboard",
        phaseId: "phase-foundation",
        featureId: "feature-dashboard-shell",
        title: "Build the ADHD-friendly project dashboard",
        description:
          "Implement the dashboard with goal, MVP boundary, phase focus, next tasks, active agents, completed work, and blockers.",
        status: "Ready",
        priority: "P0",
        assigneeAgentId: "agent-ui",
        dependencies: ["task-scaffold"],
        blockers: [],
        acceptanceCriteria: [
          "Current goal and MVP boundary are visible above the fold",
          "Next 3 recommended tasks are visible",
          "Progress feels tangible and recent work is easy to scan"
        ],
        relatedFiles: ["src/app/projects/[projectId]/page.tsx"],
        artifacts: ["dashboard"],
        history: [
          {
            at: "2026-03-13 22:12",
            summary: "Ready for pickup",
            reason: "Navigation structure defined."
          }
        ]
      },
      {
        id: "task-planning-views",
        phaseId: "phase-planning-core",
        featureId: "feature-planning-views",
        title: "Add phases, features, tasks, and kanban views",
        description:
          "Expose planning entities with progress slices, dependencies, acceptance criteria, and status grouping.",
        status: "Ready",
        priority: "P1",
        assigneeAgentId: "agent-frontend",
        dependencies: ["task-scaffold"],
        blockers: [],
        acceptanceCriteria: [
          "Users can inspect phases, features, and tasks from dedicated screens",
          "Kanban remains secondary to the planning hierarchy",
          "Task cards surface acceptance criteria and related files"
        ],
        relatedFiles: [
          "src/app/projects/[projectId]/phases/page.tsx",
          "src/app/projects/[projectId]/features/page.tsx",
          "src/app/projects/[projectId]/tasks/page.tsx",
          "src/app/projects/[projectId]/kanban/page.tsx"
        ],
        artifacts: ["planning views"],
        history: [
          {
            at: "2026-03-13 22:12",
            summary: "Ready for pickup",
            reason: "Same shell can host all primary planning routes."
          }
        ]
      },
      {
        id: "task-agent-registry",
        phaseId: "phase-execution-core",
        featureId: "feature-agent-registry",
        title: "Implement agent registry screen and per-agent controls",
        description:
          "Show default agents, models, instructions, permissions, and escalation rules with enable/disable controls.",
        status: "Planned",
        priority: "P1",
        assigneeAgentId: "agent-backend",
        dependencies: ["task-scaffold"],
        blockers: [],
        acceptanceCriteria: [
          "Default agents are visible and explainable",
          "Config fields map to the orchestration design",
          "Per-project enablement is supported"
        ],
        relatedFiles: ["src/app/projects/[projectId]/agents/page.tsx"],
        artifacts: ["agent registry"],
        history: [
          {
            at: "2026-03-13 22:12",
            summary: "Planned",
            reason: "Follows directly after the shell and planning views."
          }
        ]
      },
      {
        id: "task-repository-abstraction",
        phaseId: "phase-execution-core",
        featureId: "feature-agent-registry",
        title: "Add repository abstraction and SQLite-backed persistence layer",
        description:
          "Replace demo data with repositories that can store projects, tasks, agents, and events in SQLite.",
        status: "Planned",
        priority: "P0",
        assigneeAgentId: "agent-backend",
        dependencies: ["task-architecture"],
        blockers: [],
        acceptanceCriteria: [
          "Repository interfaces cover current dashboard and planning needs",
          "SQLite schema mirrors V1 data contracts",
          "UI routes can transition away from hard-coded demo data"
        ],
        relatedFiles: ["src/server/services", "src/server/infrastructure"],
        artifacts: ["repository layer"],
        history: [
          {
            at: "2026-03-13 22:12",
            summary: "Planned",
            reason: "Needed before real project creation and persistence."
          }
        ]
      },
      {
        id: "task-workspace-bridge",
        phaseId: "phase-workspace-preview",
        featureId: "feature-workspace-bridge",
        title: "Bridge tasks to local Git workspace state",
        description:
          "Connect workspace root, branch, diffs, and changed files to task context.",
        status: "Blocked",
        priority: "P1",
        assigneeAgentId: "agent-backend",
        dependencies: ["task-repository-abstraction"],
        blockers: [
          "Waiting for repository abstraction and task-to-file trace model before wiring live Git status."
        ],
        acceptanceCriteria: [
          "Workspace metadata is project-specific",
          "Changed files can be tied back to tasks",
          "Write operations stay serialized per branch"
        ],
        relatedFiles: ["src/app/projects/[projectId]/workspace/page.tsx"],
        artifacts: ["workspace bridge"],
        history: [
          {
            at: "2026-03-13 22:12",
            summary: "Blocked",
            reason: "Persistence and task traceability contract not implemented yet."
          }
        ]
      },
      {
        id: "task-preview-controls",
        phaseId: "phase-workspace-preview",
        featureId: "feature-preview-logs",
        title: "Add preview process controls and runtime logs",
        description:
          "Expose start, stop, restart, URL, and recent logs for the managed project preview.",
        status: "Blocked",
        priority: "P1",
        assigneeAgentId: "agent-fixer",
        dependencies: ["task-workspace-bridge"],
        blockers: [
          "Preview should follow workspace ownership rules and use real process metadata."
        ],
        acceptanceCriteria: [
          "Preview state is understandable",
          "Errors are visible with reasons",
          "Retry path is obvious"
        ],
        relatedFiles: ["src/app/projects/[projectId]/preview/page.tsx"],
        artifacts: ["preview controls"],
        history: [
          {
            at: "2026-03-13 22:12",
            summary: "Blocked",
            reason: "Depends on workspace bridge implementation."
          }
        ]
      },
      {
        id: "task-logs",
        phaseId: "phase-execution-core",
        featureId: "feature-agent-registry",
        title: "Persist agent runs and event history",
        description:
          "Store task history, agent runs, and platform events so automation is inspectable and recoverable.",
        status: "Planned",
        priority: "P1",
        assigneeAgentId: "agent-docs",
        dependencies: ["task-repository-abstraction"],
        blockers: [],
        acceptanceCriteria: [
          "Automatic changes always show a reason",
          "Task history is queryable",
          "Agent activity can be inspected per task and project"
        ],
        relatedFiles: ["src/app/projects/[projectId]/logs/page.tsx"],
        artifacts: ["event persistence"],
        history: [
          {
            at: "2026-03-13 22:12",
            summary: "Planned",
            reason: "Observability should arrive before orchestration becomes deeper."
          }
        ]
      }
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
        boundaries: ["does not edit code", "must separate MVP from later scope"],
        escalationRules: ["escalate broad or conflicting scope"]
      },
      {
        id: "agent-manager",
        name: "Project Manager",
        role: "Keep flow visible, steady, and unblocked.",
        model: "GPT-5.4",
        status: "active",
        instructionsSummary:
          "Maintain status flow, surface blockers, and recommend the next best tasks.",
        permissions: ["move tasks", "block tasks", "comment on tasks"],
        boundaries: ["cannot mark tasks done without review evidence"],
        escalationRules: ["escalate stalled critical path tasks"]
      },
      {
        id: "agent-ui",
        name: "UI/UX Agent",
        role: "Protect clarity, hierarchy, and ADHD-approachable UX.",
        model: "GPT-5.4",
        status: "ready",
        instructionsSummary:
          "Keep the current goal, MVP boundary, and momentum visually obvious without clutter.",
        permissions: ["propose IA", "edit UX copy", "implement interface tasks"],
        boundaries: ["avoid enterprise overload", "keep kanban secondary"],
        escalationRules: ["escalate when UX increases hidden complexity"],
        currentTaskId: "task-dashboard"
      },
      {
        id: "agent-frontend",
        name: "Frontend Builder",
        role: "Implement the product shell and UI features.",
        model: "GPT-5.3-Codex",
        status: "active",
        instructionsSummary:
          "Ship stable frontend slices that map directly to planning and task contracts.",
        permissions: ["edit app files", "update related files", "attach artifacts"],
        boundaries: ["one write task at a time", "respect task acceptance criteria"],
        escalationRules: ["escalate when backend contract is missing"],
        currentTaskId: "task-scaffold"
      },
      {
        id: "agent-backend",
        name: "Backend Builder",
        role: "Implement persistence, orchestration, and local integrations.",
        model: "GPT-5.3-Codex",
        status: "ready",
        instructionsSummary:
          "Own repository abstractions, task services, and local runtime control.",
        permissions: ["edit server files", "define repositories", "attach logs"],
        boundaries: ["no uncontrolled concurrent edits", "keep local-first defaults"],
        escalationRules: ["escalate risky infra additions"]
      },
      {
        id: "agent-reviewer",
        name: "Reviewer",
        role: "Validate output against acceptance criteria.",
        model: "Gemini 3.1",
        status: "ready",
        instructionsSummary:
          "Review for regressions, scope drift, and missing task acceptance evidence.",
        permissions: ["review tasks", "request rework", "log findings"],
        boundaries: ["does not directly edit code in normal flow"],
        escalationRules: ["escalate ambiguous acceptance criteria"]
      },
      {
        id: "agent-fixer",
        name: "Fixer",
        role: "Recover from build failures and regressions.",
        model: "GPT-5.3-Codex",
        status: "paused",
        instructionsSummary:
          "Respond to failures with minimal, traceable corrections.",
        permissions: ["edit failing files", "create child tasks", "retry runs"],
        boundaries: ["acts only after failure or review request"],
        escalationRules: ["escalate repeated failures"]
      },
      {
        id: "agent-docs",
        name: "Documentation Agent",
        role: "Keep docs and implementation aligned.",
        model: "GPT-5.4",
        status: "active",
        instructionsSummary:
          "Capture architecture, planning, and delivery context so progress stays understandable.",
        permissions: ["edit docs", "attach summaries", "comment on tasks"],
        boundaries: ["does not silently change scope"],
        escalationRules: ["escalate when code and docs diverge"],
        currentTaskId: "task-prd"
      }
    ],
    events: [
      {
        id: "event-1",
        createdAt: "2026-03-13 22:10",
        type: "task",
        summary: "Foundation product docs completed",
        reason: "Clonable now has a documented V1 product contract."
      },
      {
        id: "event-2",
        createdAt: "2026-03-13 22:11",
        type: "workspace",
        summary: "Local Git repository initialized",
        reason: "The workspace is ready for real repo-based iteration."
      },
      {
        id: "event-3",
        createdAt: "2026-03-13 22:11",
        type: "agent",
        summary: "Frontend Builder started shell scaffold",
        reason: "Dashboard and planning views depend on a working app shell."
      },
      {
        id: "event-4",
        createdAt: "2026-03-13 22:12",
        type: "system",
        summary: "Next best tasks recalculated",
        reason: "Task states changed after foundation work completed."
      }
    ],
    agentRuns: [
      {
        id: "run-1",
        agentId: "agent-planner",
        taskId: "task-architecture",
        status: "Succeeded",
        summary: "Defined the modular monolith, schema, and orchestration baseline.",
        startedAt: "2026-03-13 22:02",
        endedAt: "2026-03-13 22:10"
      },
      {
        id: "run-2",
        agentId: "agent-docs",
        taskId: "task-prd",
        status: "Succeeded",
        summary: "Captured the product definition and V1 PRD.",
        startedAt: "2026-03-13 21:58",
        endedAt: "2026-03-13 22:10"
      },
      {
        id: "run-3",
        agentId: "agent-frontend",
        taskId: "task-scaffold",
        status: "Running",
        summary: "Scaffolding the dashboard shell and navigation structure.",
        startedAt: "2026-03-13 22:11"
      }
    ],
    workspace: {
      rootPath: "C:\\Users\\jimmi\\Documents\\GitHub\\Clonable.dev",
      repoProvider: "Local Git",
      branch: "master",
      lastCommit: "No commits yet",
      dirtyFiles: [
        "docs/foundation/01-product-definition.md",
        "docs/foundation/02-v1-prd.md",
        "src/app/page.tsx"
      ],
      files: [
        { path: "docs", kind: "dir" },
        { path: "docs/foundation", kind: "dir" },
        { path: "src", kind: "dir" },
        { path: "src/app", kind: "dir" },
        { path: "src/features", kind: "dir" },
        { path: "src/server", kind: "dir" },
        { path: "src/app/page.tsx", kind: "file", changed: true },
        { path: "src/app/projects/[projectId]/page.tsx", kind: "file", changed: true }
      ]
    },
    preview: {
      status: "Stopped",
      command: "npm run dev",
      port: 3000,
      url: "http://localhost:3000",
      recentLogs: [
        {
          at: "2026-03-13 22:12",
          line: "Preview runner not started yet. Start after the shell scaffold is complete."
        },
        {
          at: "2026-03-13 22:12",
          line: "Runtime controls are blocked behind the workspace bridge."
        }
      ]
    }
  }
];

export function findDemoProject(projectId: string) {
  return demoProjects.find((project) => project.id === projectId);
}
