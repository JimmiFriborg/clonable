import type { DeploymentCapabilities, DeploymentMode, DeploymentSurface } from "@/server/domain/deployment";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function getDeploymentMode(): DeploymentMode {
  const configuredMode = process.env.CLONABLE_DEPLOYMENT_MODE?.trim().toLowerCase();
  return configuredMode === "hosted" ? "hosted" : "local";
}

export function getDeploymentCapabilities(): DeploymentCapabilities {
  const mode = getDeploymentMode();
  const defaultLocalExecution = mode === "local";
  const localExecutionEnabled = parseBoolean(
    process.env.CLONABLE_ALLOW_LOCAL_EXECUTION,
    defaultLocalExecution,
  );

  return {
    workspaceExecution: localExecutionEnabled,
    previewControl: localExecutionEnabled,
  };
}

export function getDeploymentSurface(): DeploymentSurface {
  return {
    mode: getDeploymentMode(),
    siteUrl: process.env.CLONABLE_SITE_URL?.trim() || undefined,
    capabilities: getDeploymentCapabilities(),
  };
}

export function localExecutionEnabled() {
  const capabilities = getDeploymentCapabilities();
  return capabilities.workspaceExecution && capabilities.previewControl;
}
