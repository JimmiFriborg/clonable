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

## Deployment target

The first hosted Clonable target is planned as:

- site: `https://cloneable.sites.friborg.uk`
- auth/metadata backbone: existing AgentBoard Appwrite project

See [docs/foundation/11-deployment-plan.md](C:/Users/jimmi/Documents/GitHub/Clonable.dev/docs/foundation/11-deployment-plan.md) for the current rollout plan.
