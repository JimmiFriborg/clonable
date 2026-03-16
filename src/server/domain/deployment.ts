export type DeploymentMode = "local" | "hosted";

export interface DeploymentCapabilities {
  workspaceExecution: boolean;
  previewControl: boolean;
}

export interface DeploymentSurface {
  mode: DeploymentMode;
  siteUrl?: string;
  capabilities: DeploymentCapabilities;
}
