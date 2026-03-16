# 2. V1 PRD

## Summary

Clonable V1 is a local-first builder workspace that guides a user from idea to MVP plan, then coordinates agent-driven implementation in a real Git-based project folder with visible progress and recoverable execution.

## Problem

Current AI builder tools are strong at fast generation but weak at:

- defining a realistic MVP before building
- showing clear task-level progress
- supporting local Git-based workflows
- letting users configure agents in a stable way
- helping users keep momentum after the first generation pass

## Goals

- turn a broad idea into a concrete MVP
- separate MVP from post-MVP ideas
- create a usable execution structure: phases, features, tasks
- make progress obvious and motivating
- let agents work with clear roles and boundaries
- generate and modify code in a local repo with traceability
- provide understandable logs, blockers, and retries

## Non-goals

- visual no-code page editor
- fully autonomous concurrent coding swarm
- team collaboration suite
- billing and marketplace systems
- advanced deployment control plane

## Primary user flow

1. User creates a project from a prompt.
2. Product Planner extracts the larger vision and proposes the smallest credible MVP.
3. User confirms or edits the MVP boundary.
4. Planner creates phases, features, and tasks with acceptance criteria.
5. Project Manager surfaces the next best tasks.
6. User runs or approves agents to execute tasks in a real workspace.
7. Reviewer validates output against acceptance criteria.
8. User sees progress, blockers, logs, and completed work.
9. The cycle repeats until the MVP is complete.

## Functional requirements

### A. Project setup

- create project from prompt
- store project goal, audience, constraints, stack, and notes
- define vision, MVP, and later ideas separately

### B. Planning

- phases
- features
- tasks
- dependencies
- blockers
- acceptance criteria
- priorities
- recommended next tasks

### C. Visual progress

- phase progress
- feature progress
- completed tasks
- blocker visibility
- next-best-task panel
- light kanban support

### D. Agent management

- create/edit/disable agents
- set role, model, instructions, permissions, and escalation rules
- configure project-specific agent activation

### E. Orchestration

- planner, manager, builder, reviewer, fixer, documentation roles
- assign tasks
- move tasks through lifecycle
- capture reasons for automatic actions

### F. Workspace

- real local project folder
- Git-based changes
- file tree
- diffs
- commits
- trace code changes back to tasks

### G. Preview/runtime

- start/stop/restart local preview
- basic logs
- runtime status

### H. Observability

- event history
- agent run history
- task history
- clear failure reasons
- retry path

## UX requirements

- always show current goal
- always show current MVP boundary
- visually emphasize what matters now
- keep completed work satisfying and visible
- allow collapse of complexity
- avoid dense enterprise layouts

## Success metrics for V1

- user can define an MVP in less than 10 minutes
- system always has a visible current phase and next task recommendation
- every code change can be tied to a task
- blocked tasks always show a reason
- local preview can be launched from within the product
- the product remains usable after multiple iteration cycles

## Risks

- overbuilding orchestration before task foundations are stable
- hiding too much logic behind agents
- introducing uncontrolled parallel file editing
- choosing infra that is heavy for local-first first run

## V1 decisions

- modular monolith first
- SQLite first for simplicity
- one active code-writing task per workspace branch
- human-visible approvals at major transitions
- deterministic task and event logging before autonomy increases
