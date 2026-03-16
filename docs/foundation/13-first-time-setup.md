# Clonable First-Time Setup

## Goal

Get Clonable into a working state quickly with sensible default AI behavior:

- planner uses a direct provider API
- built-in chat uses a configured AI provider by default
- OpenClaw is optional
- orchestration stays visible and policy-driven
- GitHub remotes can be carried from project creation
- local and hosted modes stay explicit

## Default AI Behavior

Clonable uses AI in two different ways by default.

Planner:

- Purpose: turn a project idea into an MVP draft with phases, features, and tasks
- Default route: `openai`
- Default model: `gpt-5.4`
- Config vars:
  - `OPENAI_API_KEY`
  - `CLONABLE_PLANNER_PROVIDER`
  - `CLONABLE_PLANNER_MODEL`

Built-in chat:

- Purpose: project chat inside the Build surface
- Default route: configured provider API
- Optional route: OpenClaw
- Config vars:
  - `OPENAI_API_KEY` or another provider key
  - `CLONABLE_CHAT_PROVIDER`
  - `CLONABLE_CHAT_MODEL`
  - `OPENCLAW_BASE_URL`
  - `OPENCLAW_API_KEY`
  - `OPENCLAW_DEFAULT_BOT_ID`

Agents:

- `Product Planner`: provider-backed by default
- `Project Manager`: provider-backed by default
- `Reviewer`: provider-backed by default
- `Frontend Builder`: provider-backed by default
- `Backend Builder`: provider-backed by default
- `Fixer`: provider-backed by default
- `Documentation Agent`: provider-backed by default

Every project agent can be changed later to either:

- `openclaw`
- `provider`

## Minimum Local Setup

Add a local `.env.local` with the basics:

```env
CLONABLE_DB_PATH=./data/clonable.db
CLONABLE_PROJECTS_ROOT=./projects
CLONABLE_DEPLOYMENT_MODE=local
CLONABLE_ALLOW_LOCAL_EXECUTION=true

OPENAI_API_KEY=your_openai_key
CLONABLE_PLANNER_PROVIDER=openai
CLONABLE_PLANNER_MODEL=gpt-5.4
CLONABLE_CHAT_PROVIDER=openai
CLONABLE_CHAT_MODEL=gpt-5.4
CLONABLE_PLANNER_TIMEOUT_MS=10000
CLONABLE_GITHUB_OWNER=your-github-user-or-org

# Optional only:
# OPENCLAW_BASE_URL=https://your-openclaw-host
# OPENCLAW_API_KEY=your_openclaw_key
# OPENCLAW_DEFAULT_BOT_ID=mvp-guide
```

Then run:

```bash
npm install
npm run dev
```

## Hosted Setup

Hosted mode should be explicit about what it can and cannot do.

Recommended hosted env:

```env
CLONABLE_DEPLOYMENT_MODE=hosted
CLONABLE_ALLOW_LOCAL_EXECUTION=false
CLONABLE_SITE_URL=https://cloneable.sites.friborg.uk
```

In hosted mode:

- project planning works
- project/build/task/agent/log views work
- provider-backed chat works if at least one provider is configured
- OpenClaw chat works if configured
- provider-backed planning works if configured
- local workspace sync and local preview controls should stay disabled

## Appwrite

Appwrite is used for hosted auth and metadata sync, not as the policy engine and not as the local execution layer.

Core Appwrite env:

```env
CLONABLE_APPWRITE_ENDPOINT=https://appwrite.friborg.uk/v1
CLONABLE_APPWRITE_PROJECT_ID=cloneable
CLONABLE_APPWRITE_API_KEY=your_admin_key
CLONABLE_APPWRITE_DATABASE_ID=cloneableDB

NEXT_PUBLIC_APPWRITE_ENDPOINT=https://appwrite.friborg.uk/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=cloneable
NEXT_PUBLIC_CLONABLE_SITE_URL=https://cloneable.sites.friborg.uk
```

## Recommended Default Models

Starter defaults:

- Planner: `openai` + `gpt-5.4`
- Built-in chat: `openai` + `gpt-5.4`
- Frontend Builder: `openai` + `GPT-5.3-Codex`
- Backend Builder: `openai` + `GPT-5.3-Codex`
- Reviewer: `openai` + `gpt-5.4`
- Project Manager: `openai` + `gpt-5.4`

If you want fallback provider coverage, add:

- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

## Safe Offline and Test Mode

For offline QA, demos, or end-to-end tests, Clonable supports a fixture planner mode:

```env
CLONABLE_PLANNER_USE_FIXTURE=true
```

That mode:

- skips external planner API calls
- creates a deterministic MVP/phase/feature/task draft
- is intended for testing and smoke checks, not real production planning

Hosted project creation should also keep a planner timeout:

- `CLONABLE_PLANNER_TIMEOUT_MS=10000` makes the hosted intake flow fall back to a manual MVP draft instead of timing out the whole request

## First Checks After Setup

After the app starts, verify these flows:

1. Open `/`
2. Create a project
3. Confirm the app redirects to `/projects/<id>/build`
4. Open `Goal & MVP` and save an edit
5. Open `Tasks` and inspect task detail
6. Open `Agents` and confirm runtime choices show `openclaw` and `provider`
7. Open `Workspace` and confirm the GitHub remote is visible or editable
8. Open `Preview` and confirm the hosted/local capability messaging matches the deployment mode

## Test Commands

Unit and service coverage:

```bash
npm test
```

End-to-end browser coverage:

```bash
npm run e2e:install
npm run test:e2e
```
