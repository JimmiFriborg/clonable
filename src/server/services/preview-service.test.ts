import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createTempRepository } from "@/server/test-utils/temp-database";
import {
  startProjectPreview,
  stopProjectPreview,
  updateProjectPreviewSettings,
} from "@/server/services/preview-service";
import { syncProjectWorkspace } from "@/server/services/workspace-service";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

describe("preview-service", () => {
  it("starts and stops a local preview process", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "Preview project",
      ideaPrompt: "Run a local preview command.",
      targetUser: "Founders",
      constraints: ["Local-first"],
      stackPreferences: ["Node.js"],
    });
    const workspaceRoot = path.join(temp.tempDirectory, "preview-project");

    await temp.repository.updateWorkspaceState(project.id, {
      ...project.workspace,
      rootPath: workspaceRoot,
    });

    await syncProjectWorkspace(project.id, {
      repository: temp.repository,
    });
    await updateProjectPreviewSettings(
      project.id,
      {
        command: `node -e "console.log('preview ready'); setInterval(function(){}, 1000)"`,
        port: 4310,
      },
      {
        repository: temp.repository,
      },
    );

    const started = await startProjectPreview(project.id, {
      repository: temp.repository,
      startupDelayMs: 150,
    });

    expect(started?.preview.status).toBe("Running");
    expect(started?.preview.pid).toBeDefined();

    const stopped = await stopProjectPreview(project.id, {
      repository: temp.repository,
    });

    expect(stopped?.preview.status).toBe("Stopped");
    expect(stopped?.preview.pid).toBeUndefined();
  });
});
