# 6. Agent and Orchestration Design

## Default agents

### Product Planner

- converts idea into vision, MVP, later scope
- proposes phases, features, and tasks
- writes acceptance criteria

### Project Manager

- keeps tasks flowing
- identifies blockers
- recommends next best tasks
- maintains current phase focus

### UI/UX Agent

- protects clarity and ADHD-friendly structure
- proposes information architecture and interaction patterns

### Frontend Builder

- implements frontend tasks
- updates task file links and artifacts

### Backend Builder

- implements backend and integration tasks
- manages persistence and runtime flows

### Reviewer

- reviews output against acceptance criteria and regressions
- decides pass/rework with a clear reason

### Fixer

- responds to failed builds, tests, or regressions
- can create subtasks or patch tasks

### Documentation Agent

- keeps docs, architecture notes, and task context aligned

## Orchestration model

V1 orchestration should be state-driven, not fully autonomous. Agents respond to tasks and workflow rules instead of freely editing the project.

## Core loops

### Planning loop

Idea -> MVP proposal -> user confirmation -> phases/features/tasks

### Execution loop

Ready task -> assigned agent run -> output logged -> review -> done or fix

### Recovery loop

failure/blocker -> fixer or manager intervention -> retry or split task

## Routing rules

- Planner runs on project creation and major scope changes
- Manager runs on schedule or after meaningful task transitions
- Builder agents require a Ready or In Progress task
- Reviewer runs before Done
- Fixer runs only when review/build/runtime fails

## Safety rules

- one active write-capable agent per branch
- all automatic actions need a reason
- escalation required when acceptance criteria are ambiguous
- blocked tasks cannot silently disappear from the queue

## Agent configuration model

Each agent stores:

- identity
- role
- model
- instructions
- permissions
- boundaries
- escalation rules
- enabled/disabled state

## Why this design is right for V1

It preserves momentum and visible automation while avoiding the instability of unrestricted multi-agent editing.
