import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { Client, Sites } from "node-appwrite";

import { loadLocalEnv } from "@/scripts/load-local-env";

const SITE_VARIABLE_KEYS = [
  "CLONABLE_DEPLOYMENT_MODE",
  "CLONABLE_ALLOW_LOCAL_EXECUTION",
  "CLONABLE_SITE_URL",
  "CLONABLE_APPWRITE_ENDPOINT",
  "CLONABLE_APPWRITE_PROJECT_ID",
  "CLONABLE_APPWRITE_API_KEY",
  "CLONABLE_APPWRITE_DATABASE_ID",
  "NEXT_PUBLIC_APPWRITE_ENDPOINT",
  "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  "NEXT_PUBLIC_CLONABLE_SITE_URL",
  "OPENCLAW_BASE_URL",
  "OPENCLAW_API_KEY",
  "OPENCLAW_DEFAULT_BOT_ID",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "CLONABLE_PLANNER_PROVIDER",
  "CLONABLE_PLANNER_MODEL",
  "CLONABLE_OPENAI_MODEL",
  "CLONABLE_ANTHROPIC_MODEL",
  "CLONABLE_GEMINI_MODEL",
] as const;

const TERMINAL_DEPLOYMENT_STATES = new Set(["ready", "failed", "canceled"]);
const DEPLOYMENT_POLL_INTERVAL_MS = 5_000;
const DEPLOYMENT_TIMEOUT_MS = 15 * 60 * 1_000;
const DEFAULT_HOSTED_SITE_URL = "https://cloneable.sites.friborg.uk";

function createSitesClient() {
  const endpoint = process.env.CLONABLE_APPWRITE_ENDPOINT;
  const projectId = process.env.CLONABLE_APPWRITE_PROJECT_ID;
  const apiKey = process.env.CLONABLE_APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Missing Appwrite endpoint, project ID, or API key in the current environment.",
    );
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Sites(client);
}

function getSiteId() {
  return process.env.CLONABLE_APPWRITE_SITE_ID?.trim() || "cloneable";
}

function isSecretVariable(key: string) {
  return !(
    key.startsWith("NEXT_PUBLIC_") ||
    key === "CLONABLE_DEPLOYMENT_MODE" ||
    key === "CLONABLE_ALLOW_LOCAL_EXECUTION" ||
    key === "CLONABLE_SITE_URL"
  );
}

async function syncSiteVariables(sites: Sites, siteId: string) {
  const currentVariables = await sites.listVariables({ siteId });
  const variablesByKey = new Map(currentVariables.variables.map((item) => [item.key, item]));

  for (const key of SITE_VARIABLE_KEYS) {
    const fallbackValue =
      key === "CLONABLE_DEPLOYMENT_MODE"
        ? "hosted"
        : key === "CLONABLE_ALLOW_LOCAL_EXECUTION"
          ? "false"
          : key === "CLONABLE_SITE_URL" || key === "NEXT_PUBLIC_CLONABLE_SITE_URL"
            ? DEFAULT_HOSTED_SITE_URL
            : undefined;
    const value = process.env[key]?.trim() || fallbackValue;

    if (!value) {
      continue;
    }

    const existingVariable = variablesByKey.get(key);
    const secret = isSecretVariable(key);

    if (existingVariable) {
      await sites.updateVariable({
        siteId,
        variableId: existingVariable.$id,
        key,
        value,
        secret,
      });
      continue;
    }

    await sites.createVariable({
      siteId,
      key,
      value,
      secret,
    });
  }
}

function createSourceArchive() {
  const archivePath = path.join(os.tmpdir(), `clonable-site-${Date.now()}.tar.gz`);
  const tar = spawnSync(
    "tar",
    [
      "-czf",
      archivePath,
      "--exclude=./.git",
      "--exclude=./.next",
      "--exclude=./.tmp",
      "--exclude=./node_modules",
      "--exclude=./data",
      "--exclude=./projects",
      "--exclude=./.env.local",
      "--exclude=./.env",
      ".",
    ],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      windowsHide: true,
    },
  );

  if (tar.status !== 0) {
    throw new Error(
      `Failed to create deployment archive: ${tar.stderr.toString("utf8").trim() || "unknown tar error"}`,
    );
  }

  return archivePath;
}

async function waitForDeployment(sites: Sites, siteId: string, deploymentId: string) {
  const start = Date.now();

  while (Date.now() - start < DEPLOYMENT_TIMEOUT_MS) {
    const deployment = await sites.getDeployment({ siteId, deploymentId });
    console.info(`Deployment ${deploymentId} status: ${deployment.status}`);

    if (TERMINAL_DEPLOYMENT_STATES.has(deployment.status)) {
      return deployment;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, DEPLOYMENT_POLL_INTERVAL_MS);
    });
  }

  throw new Error(`Timed out waiting for deployment ${deploymentId} to finish.`);
}

async function main() {
  loadLocalEnv();

  const sites = createSitesClient();
  const siteId = getSiteId();

  await syncSiteVariables(sites, siteId);

  const archivePath = createSourceArchive();

  try {
    const file = new File([fs.readFileSync(archivePath)], "clonable-source.tar.gz", {
      type: "application/gzip",
    });
    const deployment = await sites.createDeployment({
      siteId,
      code: file,
      activate: true,
    });

    console.info(`Created deployment ${deployment.$id} for site ${siteId}.`);

    const finalDeployment = await waitForDeployment(sites, siteId, deployment.$id);

    if (finalDeployment.status !== "ready") {
      throw new Error(
        `Deployment ${finalDeployment.$id} finished with status ${finalDeployment.status}.`,
      );
    }

    console.info(`Deployment ${finalDeployment.$id} is ready and active.`);
  } finally {
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
