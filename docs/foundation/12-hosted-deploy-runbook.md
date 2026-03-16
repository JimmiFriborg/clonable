# Hosted Deploy Runbook

## Goal

Deploy Clonable to:

- `https://cloneable.sites.friborg.uk`

using:

- the existing AgentBoard Appwrite project
- a long-lived container or Node process
- HTTPS behind a reverse proxy

## Current release shape

Clonable now has:

- a production `next build`
- `/api/health` for uptime checks
- hosted/local capability gating
- a standalone Next.js output
- a Dockerfile for containerized release

This is the minimum honest release shape for a first hosted control plane.

## Required environment

At minimum set these in the deployed environment:

- `CLONABLE_DEPLOYMENT_MODE=hosted`
- `CLONABLE_ALLOW_LOCAL_EXECUTION=false`
- `CLONABLE_SITE_URL=https://cloneable.sites.friborg.uk`
- `CLONABLE_DB_PATH=./data/clonable.db`
- `CLONABLE_PROJECTS_ROOT=./projects`
- `CLONABLE_APPWRITE_ENDPOINT=...`
- `CLONABLE_APPWRITE_PROJECT_ID=...`
- `CLONABLE_APPWRITE_API_KEY=...`
- `CLONABLE_APPWRITE_DATABASE_ID=...`
- `NEXT_PUBLIC_APPWRITE_ENDPOINT=...`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID=...`
- `OPENCLAW_BASE_URL=...`
- `OPENCLAW_API_KEY=...`
- `OPENCLAW_DEFAULT_BOT_ID=mvp-guide`

Add one or more provider keys as needed:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

## Container build

Build the image from the repo root:

```bash
docker build -t clonable:latest .
```

## Container run

Run it with persistent storage for SQLite and local project state:

```bash
docker run -d \
  --name clonable \
  -p 3000:3000 \
  --restart unless-stopped \
  -v /srv/clonable/data:/app/data \
  -v /srv/clonable/projects:/app/projects \
  --env-file /srv/clonable/.env \
  clonable:latest
```

## Reverse proxy

Point `cloneable.sites.friborg.uk` at the server and proxy HTTPS traffic to `http://127.0.0.1:3000`.

Health check target:

- `GET /api/health`

Expected success payload includes:

- `status: "ok"`
- `service: "clonable"`
- deployment timestamp
- Appwrite configuration status

## Hosted-mode behavior

For the first hosted deployment:

- project creation, planning, chat, tasks, agents, logs, and settings should work
- Appwrite browser auth should work
- workspace and preview should show honest hosted-mode gating unless local execution is explicitly enabled

This prevents the hosted site from pretending it has access to a developer workstation it does not actually control.

## Release checklist

Before promoting a build:

1. `npm run lint`
2. `npm test`
3. `npm run build`
4. verify `/api/health`
5. verify Appwrite public config is present
6. verify OpenClaw config is present
7. verify hosted mode disables local-only execution unless explicitly allowed

## Recommendation

Use hosted mode for `cloneable.sites.friborg.uk` first.

Keep remote execution off until we intentionally add remote workers or runner infrastructure.
