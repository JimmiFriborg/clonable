# 4. Information Architecture

## Primary navigation

- Projects
- Goal & MVP
- Phases
- Features
- Tasks
- Kanban
- Agents
- Workspace
- Preview
- Logs
- Settings

## Primary screen: Project dashboard

The dashboard should answer four questions immediately:

1. What are we building?
2. What counts as the MVP?
3. What matters right now?
4. What has already moved forward?

## Dashboard sections

- Project Goal
- MVP Definition
- Current Phase
- Next 3 Recommended Tasks
- Active Agents
- Recently Completed Tasks
- Current Blockers
- Progress summary by MVP / phase / feature

## ADHD-friendly design rules

- keep one top priority visible above the fold
- reduce low-priority detail until expanded
- use status color sparingly but consistently
- make completion feel rewarding
- group by meaning, not database structure
- keep logs inspectable but not dominant

## View responsibilities

### Projects

List projects and show health, stage, and last activity.

### Goal & MVP

Capture idea, constraints, MVP boundary, and post-MVP list.

### Phases

Show the execution sequence and per-phase progress.

### Features

Show feature groups within phases with acceptance targets.

### Tasks

Show actionable work with dependencies, assignees, and artifacts.

### Kanban

Support status-based sorting, but remain secondary to goal/MVP-driven views.

### Agents

Manage default and custom agents, models, permissions, and boundaries.

### Workspace

Show file tree, diffs, task-linked changes, and Git status.

### Preview

Show run controls, status, URL, and recent runtime logs.

### Logs

Show agent events, retries, failures, and reasons.

### Settings

Configure providers, workspace roots, defaults, and safety controls.

## Initial page hierarchy

- `/`
- `/projects/[projectId]`
- `/projects/[projectId]/goal`
- `/projects/[projectId]/phases`
- `/projects/[projectId]/features`
- `/projects/[projectId]/tasks`
- `/projects/[projectId]/kanban`
- `/projects/[projectId]/agents`
- `/projects/[projectId]/workspace`
- `/projects/[projectId]/preview`
- `/projects/[projectId]/logs`
- `/settings`
