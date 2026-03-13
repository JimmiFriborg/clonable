# 9. Scaffolded Codebase Structure

## Intended repo structure

```text
docs/
  foundation/
src/
  app/
  components/
  features/
  lib/
  server/
    domain/
    services/
    infrastructure/
public/
```

## Structure principles

- `src/app/` owns routes and route composition
- `src/features/` owns user-facing slices such as dashboard, tasks, agents
- `src/components/` owns reusable presentation primitives
- `src/server/domain/` owns types and policies
- `src/server/services/` owns use-case orchestration
- `src/server/infrastructure/` owns adapters and persistence boundaries

## Current implementation target

This initial scaffold implements the dashboard shell, navigation, domain seed data, and reusable UI sections that map directly to the V1 IA.
