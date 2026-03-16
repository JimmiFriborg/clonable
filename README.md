# Clonable

Clonable is a local-first hybrid AI product builder focused on helping a user turn an idea into a credible MVP, ship it in a real Git workspace, and continue building with visible, structured progress.

This repository starts with a V1 foundation:

- product and architecture docs
- a stable modular-monolith app scaffold
- an ADHD-friendly dashboard shell
- seed data that demonstrates the core planning and progress model
- deployment planning for a hosted build on `cloneable.sites.friborg.uk`

## Run locally

```bash
npm install
npm run dev
```

See the foundation docs in `docs/foundation/`.

First-time setup:

- [docs/foundation/13-first-time-setup.md](docs/foundation/13-first-time-setup.md)
- Hosted builds should keep `CLONABLE_PLANNER_TIMEOUT_MS=10000` so project creation falls back quickly instead of timing out the request.
- The minimum useful AI setup is one provider key such as `OPENAI_API_KEY`. OpenClaw is optional.
- Set `CLONABLE_GITHUB_OWNER` if you want new projects to derive a GitHub remote automatically.

## Test coverage

Unit and service tests:

```bash
npm test
```

End-to-end tests:

```bash
npm run e2e:install
npm run test:e2e
```

## Deployment target

The first hosted Clonable target is planned as:

- site: `https://cloneable.sites.friborg.uk`
- auth/metadata backbone: existing AgentBoard Appwrite project

See [docs/foundation/11-deployment-plan.md](docs/foundation/11-deployment-plan.md) for the current rollout plan.

## Container Release

Clonable now includes a production Docker path and standalone Next.js output for the first hosted deployment target.

Runbook:

- [docs/foundation/12-hosted-deploy-runbook.md](docs/foundation/12-hosted-deploy-runbook.md)
