import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createTempRepository } from "@/server/test-utils/temp-database";
import {
  commitProjectWorkspace,
  syncProjectWorkspace,
} from "@/server/services/workspace-service";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

describe("workspace-service", () => {
  it("provisions and syncs a real workspace", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "Workspace project",
      ideaPrompt: "Create a project workspace.",
      targetUser: "Founders",
      constraints: ["Local-first"],
      stackPreferences: ["Next.js"],
    });
    const workspaceRoot = path.join(temp.tempDirectory, "workspace-project");

    await temp.repository.updateWorkspaceState(project.id, {
      ...project.workspace,
      rootPath: workspaceRoot,
    });

    const synced = await syncProjectWorkspace(project.id, {
      repository: temp.repository,
    });

    expect(fs.existsSync(path.join(workspaceRoot, ".git"))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, "README.md"))).toBe(true);
    expect(synced?.workspace.branch).toBe("main");
    expect(synced?.workspace.files.some((file) => file.path === "README.md")).toBe(true);
  });

  it("commits workspace changes into the local repo", async () => {
    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "Commit project",
      ideaPrompt: "Track workspace commits.",
      targetUser: "Founders",
      constraints: ["Local-first"],
      stackPreferences: ["Next.js"],
    });
    const workspaceRoot = path.join(temp.tempDirectory, "commit-project");

    await temp.repository.updateWorkspaceState(project.id, {
      ...project.workspace,
      rootPath: workspaceRoot,
    });

    await syncProjectWorkspace(project.id, {
      repository: temp.repository,
    });
    fs.writeFileSync(path.join(workspaceRoot, "notes.txt"), "workspace checkpoint\n", "utf-8");

    const committed = await commitProjectWorkspace(project.id, "Initial workspace", {
      repository: temp.repository,
    });

    expect(committed?.workspace.lastCommit).toBe("Initial workspace");
    expect(committed?.workspace.dirtyFiles).toEqual([]);
  });
});
