# 7. Task Lifecycle and State Model

## Statuses

- Inbox
- Planned
- Ready
- In Progress
- Review
- Blocked
- Done

## Lifecycle rules

### Inbox

Captured but not yet normalized into a committed plan.

### Planned

Scoped and defined, but not yet actionable because of missing dependencies, ordering, or approval.

### Ready

Fully actionable with acceptance criteria and no unresolved blockers.

### In Progress

Currently assigned to one primary owner or active agent run.

### Review

Implementation exists and needs validation against acceptance criteria.

### Blocked

Cannot progress due to dependency, missing input, failing runtime, or policy restriction.

### Done

Accepted, logged, and complete for the current MVP scope.

## State transitions

- `Inbox -> Planned`
- `Planned -> Ready`
- `Ready -> In Progress`
- `In Progress -> Review`
- `Review -> Done`
- `Review -> In Progress`
- `Any active state -> Blocked`
- `Blocked -> Planned`
- `Blocked -> Ready`

## Required transition metadata

Each transition should record:

- actor
- timestamp
- reason
- evidence or artifacts when relevant

## Task decomposition rules

- large tasks should be split before agent execution
- blockers may create child tasks
- reviewer can request split/redo instead of reopening blindly

## Prioritization model

Priority is a combination of:

- MVP criticality
- dependency unlock value
- user-visible momentum
- risk reduction

## Recommendation logic for next tasks

Prefer tasks that are:

- unblocked
- high MVP value
- dependency unlocking
- likely to create visible progress quickly

This keeps the system productive and ADHD-friendly.
