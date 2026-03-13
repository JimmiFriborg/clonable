# 3. Proposed Architecture

## Architecture stance

Clonable V1 should be a modular monolith, not a distributed system. The product needs reliability, local simplicity, and understandable behavior more than service separation.

## Core stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-compatible component layer
- Node.js runtime for server-side orchestration
- SQLite for local metadata and orchestration state
- Git for code workspace source of truth

## High-level modules

### UI shell

Owns project dashboard, planning views, tasks, agents, workspace, preview, logs, and settings.

### Application services

Owns workflows:

- project intake
- MVP definition
- planning
- task flow
- agent orchestration
- workspace operations
- preview control
- event logging

### Domain layer

Owns core entities and invariants:

- project
- MVP
- phase
- feature
- task
- agent
- run
- event

### Infrastructure layer

Owns:

- SQLite persistence
- local filesystem access
- Git commands
- model/provider adapters
- preview process management

## Runtime shape

- One web app process hosts UI and server endpoints.
- Long-running work is managed through job runners inside the same app boundary at first.
- Background execution can later move into a worker process without changing the domain model.

## Data ownership

- Git repo is the source of truth for generated code.
- SQLite is the source of truth for planning, tasks, agents, logs, and metadata.
- Runtime logs and artifacts are stored on disk and indexed in SQLite.

## Workspace strategy

- Each Clonable project maps to a local workspace directory.
- Code-writing tasks execute in isolated task branches or worktrees.
- Only one write-capable agent run should target a workspace branch at a time in V1.
- Reviewer/Fixer runs can inspect many tasks, but writes remain serialized per branch.

## AI routing strategy

- Planner default: GPT-5.4
- Code/edit default: GPT-5.3-Codex
- Validation fallback: Gemini 3.1
- Providers are configurable per agent

## Boundaries to preserve

- UI does not call providers directly
- orchestration does not mutate DB state without event logging
- file changes do not occur outside a task context
- tasks cannot move to Done without a completion reason and validation record

## Internal module map

- `src/app/`: routes and layout
- `src/features/`: feature-specific UI and server actions
- `src/server/domain/`: entities and policies
- `src/server/services/`: orchestrators and use cases
- `src/server/infrastructure/`: db, git, fs, ai, preview adapters
- `src/lib/`: shared utilities and presentation helpers

## Upgrade path after V1

- extract job runner into worker
- add provider queueing and rate control
- add per-project remote Git provider syncing
- support more advanced deployment targets
