# Clonable Deployment Plan

## Target

The first always-online hosted Clonable target is:

- product repo: `https://github.com/JimmiFriborg/clonable`
- public site: `https://cloneable.sites.friborg.uk`
- backend/auth project: existing AgentBoard Appwrite project

This is intentionally a practical first hosted target, not the final infrastructure shape.

## Deployment principle

Clonable should always have a working hosted build online, even while local-first execution remains the product's long-term differentiator.

That means the hosted app should prioritize:

- stable login and project UI
- MVP planning and chat
- task and agent visibility
- Appwrite-backed durable metadata
- safe degradation for local-only capabilities

The hosted build must not pretend that local preview or local repo execution is available if the server cannot actually perform it.

## Domain plan

Use the wildcard domain you already control:

- production candidate: `cloneable.sites.friborg.uk`

Reserve room for later split environments:

- preview/staging candidate: `cloneable-preview.sites.friborg.uk`
- future app split candidate: `app.clonable.dev`

For now, the operational target is simply `cloneable.sites.friborg.uk`.

## Infrastructure plan

### App tier

Run the Next.js app as a long-lived Node process behind a reverse proxy.

Recommended first deployment shape:

1. Linux VPS or existing self-hosted box
2. Node 22 LTS
3. `npm ci`
4. `npm run build`
5. `npm run start`
6. reverse proxy with HTTPS on `cloneable.sites.friborg.uk`

This can sit behind:

- Nginx
- Caddy
- Coolify
- or another simple self-hosted process manager

The important point is not which panel we use first. The important point is:

- Clonable runs as a normal Node app
- HTTPS is always on
- health checks exist
- restarts are predictable

### Data tier

Use the existing AgentBoard Appwrite project for the first hosted phase:

- auth/session handling
- project membership
- synced durable metadata
- optional remote documents and artifacts later

Keep SQLite for machine-local runtime state where needed:

- local preview process tracking
- local workspace root paths
- runner leases
- active write run state

Hosted Clonable should not depend on Supabase or Lovable services.

## Environment plan

### Required hosted env

- `CLONABLE_SITE_URL=https://cloneable.sites.friborg.uk`
- `CLONABLE_APPWRITE_ENDPOINT=...`
- `CLONABLE_APPWRITE_PROJECT_ID=...`
- `CLONABLE_APPWRITE_API_KEY=...`
- `CLONABLE_APPWRITE_DATABASE_ID=...`
- `NEXT_PUBLIC_APPWRITE_ENDPOINT=...`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID=...`
- `OPENCLAW_BASE_URL=...`
- `OPENCLAW_API_KEY=...`
- `OPENCLAW_DEFAULT_BOT_ID=mvp-guide`

### AI provider env

At least one of these should be configured in the hosted build:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

OpenClaw remains the built-in chat backend, while provider APIs remain available for planner and provider-backed agents.

## Hosted capability policy

### Phase 1: online working build

The first online build should support:

- project creation
- MVP definition
- OpenClaw chat
- phases/features/tasks
- agent configuration
- logs and activity visibility
- Appwrite-backed auth and shared metadata

### Phase 1 limits

These may be hidden, disabled, or marked local-only in the hosted build until remote execution exists:

- local repo mutations
- task-branch workspace writes
- local preview process control
- machine-local file tree browsing

This is not drift. It is honest capability shaping.

The hosted build should remain useful and stable without faking local workstation powers on a remote server.

## Rollout order

### Step 1. Deployment baseline

Add and use:

- `CLONABLE_SITE_URL`
- `/api/health`
- production env file/secret setup
- reverse proxy config

### Step 2. Appwrite as hosted identity layer

Finish:

- Appwrite auth wiring
- project membership checks
- hosted session flow

### Step 3. Hosted-safe UI gating

Introduce a small deployment capability layer that can mark routes/features as:

- available
- read-only
- local-only

Workspace and preview routes should respect this.

### Step 4. Online MVP loop

Ensure the hosted path from:

`idea -> MVP -> chat -> tasks -> agents -> logs`

is complete and stable on `cloneable.sites.friborg.uk`.

### Step 5. Optional remote execution later

Only after the hosted control plane is solid:

- remote workspace runners
- remote preview sandboxes
- remote Git execution

## Acceptance criteria for first hosted milestone

The first hosted milestone is successful when:

- `cloneable.sites.friborg.uk` serves a working Clonable build over HTTPS
- `/api/health` returns healthy status
- login/auth works against the AgentBoard Appwrite project
- a user can create/open a project and use the Build route
- OpenClaw chat works online
- task and agent state are visible and persistent
- local-only capabilities are either disabled or clearly explained

## Recommendation

Treat `cloneable.sites.friborg.uk` as the first stable hosted control plane for Clonable.

Do not wait for full remote execution before putting Clonable online.

Ship the useful hosted loop first, then deepen execution capability in later slices.
