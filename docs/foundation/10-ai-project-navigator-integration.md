# AI Project Navigator Integration

## Bottom line

`ai-project-navigator` is worth using as a **UI reference and partial component donor**, not as the foundation of Clonable.

Clonable already has the stronger core:

- the canonical policy-driven task model
- explicit ownership and rejection logging
- server-side orchestration
- local workspace and preview control
- a local-first service/repository boundary

`ai-project-navigator` has the stronger web-facing presentation in a few areas:

- overview widgets
- kanban ergonomics
- mobile kanban treatment
- agent cards, wizards, and run-history presentation

The correct move is:

1. keep Clonable's domain, policy, orchestration, workspace, and preview engine
2. port selected navigator UI patterns into the Next.js app
3. replace Supabase and Lovable-specific assumptions with Appwrite plus provider adapters

Do **not** merge the navigator repo wholesale.

## Current repo health of `ai-project-navigator`

As inspected on March 15, 2026:

- `main` has a single commit: `6494473` (`Save plan in Lovable`)
- `npm ci` fails because `package-lock.json` is out of sync with `package.json`
- `.env` is tracked in git and `.gitignore` does not exclude it
- `npm run lint` fails heavily
- `npm run build` passes, but with CSS ordering warnings and a large bundle
- tests pass, but only with a placeholder-level test

Conclusion:

- useful design reference
- not safe to adopt as-is
- not stable enough to become the backend or source of truth

## What Clonable should keep

These are already stronger in Clonable and should remain authoritative.

### 1. Canonical task policy

Clonable already models the policy directly:

- `Backlog | Ready | In_Progress | Blocked | Waiting | QA_Review | Done | Split_Pending`
- explicit `ownerAgentId`
- `changeLog[]`
- `rejectionLog[]`
- `definitionOfDone`
- orchestrator/tester authority and runtime state

This is the right backbone for AgentBoard.

### 2. Server-side service boundaries

Clonable routes work through:

- `project-service.ts`
- `orchestration-service.ts`
- `workspace-service.ts`
- `preview-service.ts`
- server actions in `src/features/projects/actions.ts`

That boundary is exactly what we need if we want to support:

- Appwrite
- local-first persistence
- multiple AI providers
- safe workspace execution

### 3. Local workspace and preview ownership

Clonable already treats the repo and preview process as first-class product primitives.

That is a major differentiator, and it is missing from navigator in a stable form.

### 4. ADHD-friendly information hierarchy

Clonable's dashboard and project IA already match the product intent better:

- Goal
- MVP
- Current phase
- Next tasks
- Active agents
- Completed work
- Blockers

Navigator is visually useful, but it is still more kanban-centric than the intended Clonable mental model.

## What to port from `ai-project-navigator`

These are the strongest parts to reuse or reinterpret.

### 1. Overview widgets

Good candidates:

- `src/components/overview/StatsCards.tsx`
- `src/components/overview/TaskCompletionChart.tsx`
- `src/components/overview/MilestoneProgress.tsx`
- `src/components/overview/GanttTimeline.tsx`
- `src/components/overview/HealthSummary.tsx`
- `src/components/overview/AutoPilotPanel.tsx`

Port these as presentational components only.

They should consume Clonable dashboard/view-model data, not query storage directly.

### 2. Kanban ergonomics

Good candidates:

- `src/components/kanban/KanbanColumn.tsx`
- `src/components/kanban/KanbanCard.tsx`
- `src/components/kanban/MobileKanbanView.tsx`
- `src/components/kanban/MobileKanbanCard.tsx`
- `src/components/kanban/TaskDetailModal.tsx`
- `src/components/kanban/GeneratedFilesView.tsx`
- `src/components/kanban/TaskAgentLog.tsx`

These are strong UI ingredients for a secondary kanban surface inside Clonable.

They should be adapted to policy states and Clonable's task detail route.

### 3. Agent UX patterns

Good candidates:

- `src/components/agents/AgentCard.tsx`
- `src/components/agents/AgentRunHistory.tsx`
- `src/components/agents/AgentWizard.tsx`
- `src/components/agents/CreateAgentDialog.tsx`
- `src/components/ai/ModelSelector.tsx`

These fit Clonable well if they are bound to:

- `policyRole`
- WIP limits
- boundaries
- permissions
- escalation rules
- provider/model configuration

### 4. Navigation polish

Navigator's side navigation and project layout are visually clearer than its backend is stable.

The shell ideas are reusable, but the route system should stay in Next.js, not React Router.

## What must be rejected or rewritten

### 1. Supabase as the main application contract

Navigator currently depends on:

- client-side Supabase queries
- direct writes from the browser
- Supabase Edge Functions
- realtime subscriptions coupled to Postgres changes

That should not be imported into Clonable.

Clonable should keep:

- server actions
- service layer orchestration
- repository interfaces
- backend-owned execution

### 2. Lovable-specific assumptions

Reject:

- Lovable project metadata
- Lovable cloud workflow assumptions
- Lovable README/bootstrap expectations

Clonable must remain self-hostable and provider-configurable.

### 3. Navigator's task-state model

Navigator's states include:

- `needs_clarification`
- `self_check`

Those should **not** become persisted canonical states in Clonable.

Map them instead as:

- `needs_clarification` -> `Blocked` if internal resolution is required
- `needs_clarification` -> `Waiting` with `requiresUser=true` if user input is actually required
- `self_check` -> a run phase or internal validation step while the task remains `In_Progress`

`QA_Review` remains the only persisted review state.

### 4. Direct agent action execution from the client

Navigator's agent execution path is too loose for Clonable:

- client requests agent run
- model proposes actions
- client auto-executes actions
- DB updates happen from the same surface

Clonable should instead:

- enqueue runs on the server
- validate against policy
- execute through server-side services
- record all outputs, reasons, diffs, and failures

## Target merged architecture

The target stack should be:

- Next.js frontend and server routes
- Clonable domain and policy model as source of truth
- repository abstraction for persistence
- Appwrite-backed auth/settings/project metadata where appropriate
- local workspace execution through the existing services
- AI through provider adapters, never through Lovable or Supabase

### Source of truth split

Use this split:

- task policy, orchestration, workspace state, preview state:
  Clonable backend domain
- user accounts, sessions, optional remote project metadata, optional synced artifacts:
  Appwrite
- AI calls:
  provider adapter layer

### Important rule

Appwrite should be an infrastructure dependency, not the policy engine.

The policy engine must remain in Clonable application code.

## Appwrite migration shape

Introduce these abstractions before any large UI port:

### `AuthGateway`

Responsibilities:

- current user
- session handling
- project membership

First implementation:

- `AppwriteAuthGateway`

### `ProjectRepository`

Clonable already has this shape conceptually.

Add or evolve:

- `SQLiteProjectRepository` for local-first default
- `AppwriteProjectRepository` only if we decide to store project/task data remotely

Recommendation for V1:

- keep SQLite as the runtime and orchestration store
- use Appwrite first for auth, remote settings, and optional sync

That keeps local-first behavior intact.

### `AiProviderGateway`

Replace navigator's `ai-proxy` pattern with:

- `OpenAIProvider`
- `AnthropicProvider`
- `GoogleProvider`
- future `OpenRouterProvider`

All agent configs should store:

- provider
- model
- fallback providers/models
- temperature or structured-output mode if needed

### `ExecutionGateway`

Replace navigator's `git-operations` and `ai-dev-agent` coupling with Clonable services:

- `workspace-service.ts`
- `preview-service.ts`
- future structured builder/fixer execution service

## Mapping navigator features into Clonable

### Projects / dashboard

Keep:

- Clonable's project dashboard hierarchy

Port:

- overview cards and charts
- health summary presentation

### Definition / goal

Keep:

- Clonable's goal + MVP + definition of done structure

Port:

- richer document presentation where useful

Do not port:

- freeform Supabase document assumptions as primary structure

### Plan / phases / features / tasks

Keep:

- Clonable's phase/feature/task hierarchy
- policy-bound task lifecycle

Port:

- timeline visual treatment
- milestone progress visuals

### Kanban

Keep:

- policy states and allowed transitions
- explicit owner and reason fields

Port:

- drag/drop UI
- mobile kanban
- task detail modal visual patterns
- generated files and agent log panels

### Agents

Keep:

- Clonable's policy roles
- WIP limits
- orchestration toggle
- instructions, permissions, boundaries, escalation rules

Port:

- agent cards
- creation wizard
- model selector UX
- run history presentation

### Logs

Keep:

- Clonable's event timeline
- run history
- rejection logs

Port:

- richer filter and presentation patterns

## Policy alignment decisions

The policy remains authoritative.

### State mapping

Use this mapping for navigator-derived ideas:

| Navigator idea | Clonable canonical handling |
| --- | --- |
| `backlog` | `Backlog` |
| `ready` | `Ready` |
| `in_progress` | `In_Progress` |
| `qa_review` | `QA_Review` |
| `blocked` | `Blocked` |
| `waiting` | `Waiting` |
| `done` | `Done` |
| `needs_clarification` | `Blocked` or `Waiting`, depending on whether user input is required |
| `self_check` | internal run step, not persisted task state |

### Assignment model

Navigator uses column-to-agent assignment.

Clonable should not use column assignment as the canonical routing rule.

Instead:

- owner is per task
- orchestrator assigns owner
- `nextRole` is a hint
- agent queues are policy-driven

Column defaults can exist as UI shortcuts only.

### Auto-run behavior

Navigator's auto-run should be retained only in a safer form:

- enqueue run on server
- validate policy first
- one write-capable run at a time per project
- full logging of reasons and outputs

## Recommended implementation order

### Phase 1. UI extraction

Port presentational components from navigator into `src/features/projects/components/navigator-ui/`.

No Supabase code comes with them.

### Phase 2. View-model adapters

Create adapter functions that convert `ProjectDashboardModel` and `ProjectRecord` into the props expected by those ported components.

### Phase 3. Provider and Appwrite seams

Add:

- `AuthGateway`
- `AiProviderGateway`
- `ProviderSettingsService`

Appwrite enters here first.

### Phase 4. Agent execution hardening

Finish the builder/fixer execution slice using:

- structured model outputs
- task branches
- workspace service application
- reviewer/fixer loop

### Phase 5. Optional remote sync

Only after the above is stable:

- decide whether project/task metadata should also gain an Appwrite-backed repository or sync layer

## Recommendation

Proceed with a **selective transplant**, not a merger.

The winning combination is:

- Clonable backend, policy, orchestration, and local repo workflow
- navigator-inspired UI for overview, kanban, and agent surfaces
- Appwrite for auth and remote support
- provider-based AI routing under our control

That gets us the stronger visual product without regressing into:

- Supabase lock-in
- Lovable coupling
- client-driven unsafe automation
- weaker task-policy guarantees
