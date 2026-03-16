import { afterEach, describe, expect, it } from "vitest";

import {
  getDeploymentCapabilities,
  getDeploymentMode,
  getDeploymentSurface,
  localExecutionEnabled,
} from "@/server/services/deployment-service";

const originalMode = process.env.CLONABLE_DEPLOYMENT_MODE;
const originalLocalExecution = process.env.CLONABLE_ALLOW_LOCAL_EXECUTION;
const originalSiteUrl = process.env.CLONABLE_SITE_URL;

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.CLONABLE_DEPLOYMENT_MODE;
  } else {
    process.env.CLONABLE_DEPLOYMENT_MODE = originalMode;
  }

  if (originalLocalExecution === undefined) {
    delete process.env.CLONABLE_ALLOW_LOCAL_EXECUTION;
  } else {
    process.env.CLONABLE_ALLOW_LOCAL_EXECUTION = originalLocalExecution;
  }

  if (originalSiteUrl === undefined) {
    delete process.env.CLONABLE_SITE_URL;
  } else {
    process.env.CLONABLE_SITE_URL = originalSiteUrl;
  }
});

describe("deployment-service", () => {
  it("defaults to local mode with local execution enabled", () => {
    delete process.env.CLONABLE_DEPLOYMENT_MODE;
    delete process.env.CLONABLE_ALLOW_LOCAL_EXECUTION;

    expect(getDeploymentMode()).toBe("local");
    expect(getDeploymentCapabilities()).toEqual({
      workspaceExecution: true,
      previewControl: true,
    });
    expect(localExecutionEnabled()).toBe(true);
  });

  it("disables local execution by default for hosted mode", () => {
    process.env.CLONABLE_DEPLOYMENT_MODE = "hosted";
    delete process.env.CLONABLE_ALLOW_LOCAL_EXECUTION;

    expect(getDeploymentMode()).toBe("hosted");
    expect(getDeploymentCapabilities()).toEqual({
      workspaceExecution: false,
      previewControl: false,
    });
    expect(localExecutionEnabled()).toBe(false);
  });

  it("allows an explicit override for hosted execution", () => {
    process.env.CLONABLE_DEPLOYMENT_MODE = "hosted";
    process.env.CLONABLE_ALLOW_LOCAL_EXECUTION = "true";
    process.env.CLONABLE_SITE_URL = "https://cloneable.sites.friborg.uk";

    expect(getDeploymentSurface()).toEqual({
      mode: "hosted",
      siteUrl: "https://cloneable.sites.friborg.uk",
      capabilities: {
        workspaceExecution: true,
        previewControl: true,
      },
    });
  });
});
