import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { ProjectRepository } from "@/server/domain/project-repository";
import type { ProjectRecord, WorkspaceFileRecord, WorkspaceRecord } from "@/server/domain/project";
import { sqliteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";

const DEFAULT_GIT_NAME = "Clonable Local";
const DEFAULT_GIT_EMAIL = "clonable@local";
const WORKSPACE_IGNORES = new Set([".clonable", ".git", ".next", "coverage", "dist", "node_modules"]);
const MAX_WORKSPACE_FILES = 160;

interface WorkspaceServiceDependencies {
  repository?: ProjectRepository;
}

interface SyncWorkspaceOptions {
  recordEvent?: boolean;
}

function runCommand(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf-8",
    windowsHide: true,
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function resolveRepoProvider(remoteUrl?: string) {
  if (!remoteUrl) {
    return "Local Git";
  }

  return /github/i.test(remoteUrl) ? "GitHub" : "Remote Git";
}

function ensureWorkspaceScaffold(project: ProjectRecord) {
  fs.mkdirSync(project.workspace.rootPath, { recursive: true });
  fs.mkdirSync(path.join(project.workspace.rootPath, ".clonable", "logs"), {
    recursive: true,
  });

  const readmePath = path.join(project.workspace.rootPath, "README.md");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      `# ${project.name}

## Goal
${project.mvp.goalStatement || project.ideaPrompt}

## MVP
${project.mvp.summary || "Define the MVP boundary and begin implementation."}
`,
      "utf-8",
    );
  }

  const gitignorePath = path.join(project.workspace.rootPath, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(
      gitignorePath,
      ".clonable/\n.next/\ncoverage/\ndist/\nnode_modules/\n",
      "utf-8",
    );
  }
}

function ensureGitRepository(rootPath: string) {
  if (fs.existsSync(path.join(rootPath, ".git"))) {
    return;
  }

  let initResult = runCommand("git", ["init", "-b", "main"], rootPath);

  if (!initResult.ok) {
    initResult = runCommand("git", ["init"], rootPath);
    if (!initResult.ok) {
      throw new Error(initResult.stderr || initResult.stdout || "Git init failed.");
    }

    runCommand("git", ["branch", "-M", "main"], rootPath);
  }

  const nameResult = runCommand("git", ["config", "user.name", DEFAULT_GIT_NAME], rootPath);
  const emailResult = runCommand("git", ["config", "user.email", DEFAULT_GIT_EMAIL], rootPath);

  if (!nameResult.ok || !emailResult.ok) {
    throw new Error("Git local user configuration failed.");
  }
}

function ensureGitRemote(rootPath: string, remoteUrl?: string) {
  if (!remoteUrl) {
    return;
  }

  const remoteResult = runCommand("git", ["remote", "get-url", "origin"], rootPath);
  if (remoteResult.ok) {
    if (remoteResult.stdout !== remoteUrl) {
      const setUrlResult = runCommand("git", ["remote", "set-url", "origin", remoteUrl], rootPath);
      if (!setUrlResult.ok) {
        throw new Error(setUrlResult.stderr || setUrlResult.stdout || "Git remote update failed.");
      }
    }

    return;
  }

  const addResult = runCommand("git", ["remote", "add", "origin", remoteUrl], rootPath);
  if (!addResult.ok) {
    throw new Error(addResult.stderr || addResult.stdout || "Git remote add failed.");
  }
}

function listWorkspaceFiles(rootPath: string): WorkspaceFileRecord[] {
  const files: WorkspaceFileRecord[] = [];

  function visit(currentPath: string, depth: number) {
    if (files.length >= MAX_WORKSPACE_FILES || depth > 4) {
      return;
    }

    const entries = fs
      .readdirSync(currentPath, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (files.length >= MAX_WORKSPACE_FILES) {
        return;
      }

      if (WORKSPACE_IGNORES.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = normalizePath(path.relative(rootPath, absolutePath));

      files.push({
        path: relativePath,
        kind: entry.isDirectory() ? "dir" : "file",
      });

      if (entry.isDirectory()) {
        visit(absolutePath, depth + 1);
      }
    }
  }

  visit(rootPath, 0);
  return files;
}

function buildWorkspaceSnapshot(project: ProjectRecord): WorkspaceRecord {
  ensureWorkspaceScaffold(project);
  ensureGitRepository(project.workspace.rootPath);
  ensureGitRemote(project.workspace.rootPath, project.workspace.remoteUrl);

  const statusResult = runCommand("git", ["status", "--porcelain"], project.workspace.rootPath);
  const dirtyFiles = statusResult.ok
    ? statusResult.stdout
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => normalizePath(line.slice(3).trim()))
    : [];
  const fileSet = new Set(dirtyFiles);
  const files = listWorkspaceFiles(project.workspace.rootPath).map((file) => ({
    ...file,
    changed: file.kind === "file" ? fileSet.has(file.path) : undefined,
  }));

  const branchResult = runCommand(
    "git",
    ["branch", "--show-current"],
    project.workspace.rootPath,
  );
  const remoteResult = runCommand("git", ["remote", "get-url", "origin"], project.workspace.rootPath);
  const lastCommitResult = runCommand(
    "git",
    ["log", "-1", "--pretty=%s"],
    project.workspace.rootPath,
  );
  const remoteUrl = remoteResult.ok && remoteResult.stdout ? remoteResult.stdout : project.workspace.remoteUrl;

  return {
    rootPath: project.workspace.rootPath,
    repoProvider: resolveRepoProvider(remoteUrl),
    remoteUrl,
    branch: branchResult.ok && branchResult.stdout ? branchResult.stdout : "main",
    lastCommit:
      lastCommitResult.ok && lastCommitResult.stdout
        ? lastCommitResult.stdout
        : "No commits yet",
    dirtyFiles,
    files,
  };
}

async function persistWorkspaceError(
  project: ProjectRecord,
  repository: ProjectRepository,
  message: string,
  recordEvent: boolean,
) {
  const safeWorkspace = {
    ...project.workspace,
    files: fs.existsSync(project.workspace.rootPath)
      ? listWorkspaceFiles(project.workspace.rootPath)
      : [],
    lastCommit: `Workspace sync failed: ${message}`,
  };
  const updatedProject = await repository.updateWorkspaceState(project.id, safeWorkspace);

  if (recordEvent) {
    await repository.recordEvent({
      projectId: project.id,
      type: "workspace",
      summary: "Workspace sync failed",
      reason: message,
    });
  }

  return updatedProject;
}

export async function syncProjectWorkspace(
  projectId: string,
  dependencies: WorkspaceServiceDependencies = {},
  options: SyncWorkspaceOptions = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const recordEvent = options.recordEvent ?? true;
  const project = await repository.getProject(projectId);

  if (!project) {
    return undefined;
  }

  try {
    const workspace = buildWorkspaceSnapshot(project);
    const updatedProject = await repository.updateWorkspaceState(projectId, workspace);

    if (updatedProject && recordEvent) {
      await repository.recordEvent({
        projectId,
        type: "workspace",
        summary: "Workspace synced",
        reason: "The local workspace state was refreshed from the filesystem and Git.",
        payload: {
          branch: workspace.branch,
          dirtyFiles: workspace.dirtyFiles.length,
        },
      });
    }

    return updatedProject;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown workspace sync failure.";
    return persistWorkspaceError(project, repository, message, recordEvent);
  }
}

export async function commitProjectWorkspace(
  projectId: string,
  message: string,
  dependencies: WorkspaceServiceDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const project = await syncProjectWorkspace(
    projectId,
    { repository },
    { recordEvent: false },
  );

  if (!project) {
    return undefined;
  }

  const commitMessage = message.trim();
  if (!commitMessage) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: "Workspace commit skipped",
      reason: "Commit message was empty.",
    });

    return project;
  }

  const statusBefore = runCommand("git", ["status", "--porcelain"], project.workspace.rootPath);
  if (!statusBefore.ok || !statusBefore.stdout) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: "Workspace commit skipped",
      reason: "There were no changes to commit.",
    });

    return project;
  }

  const addResult = runCommand("git", ["add", "-A"], project.workspace.rootPath);
  const commitResult = addResult.ok
    ? runCommand("git", ["commit", "-m", commitMessage], project.workspace.rootPath)
    : addResult;

  if (!commitResult.ok) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: "Workspace commit failed",
      reason: commitResult.stderr || commitResult.stdout || "Git commit failed.",
      payload: {
        message: commitMessage,
      },
    });

    return syncProjectWorkspace(projectId, { repository }, { recordEvent: false });
  }

  const updatedProject = await syncProjectWorkspace(
    projectId,
    { repository },
    { recordEvent: false },
  );

  if (updatedProject) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: "Workspace committed",
      reason: commitMessage,
      payload: {
        rootPath: updatedProject.workspace.rootPath,
      },
    });
  }

  return updatedProject;
}

export async function ensureTaskWorkspaceBranch(
  projectId: string,
  taskId: string,
  dependencies: WorkspaceServiceDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const project = await syncProjectWorkspace(projectId, { repository }, { recordEvent: false });

  if (!project) {
    return undefined;
  }

  const task = project.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    return project;
  }

  const branchName = `task/${slugify(task.title) || slugify(task.id) || "work-item"}`;
  const verifyResult = runCommand(
    "git",
    ["rev-parse", "--verify", branchName],
    project.workspace.rootPath,
  );
  const checkoutResult = verifyResult.ok
    ? runCommand("git", ["checkout", branchName], project.workspace.rootPath)
    : runCommand("git", ["checkout", "-b", branchName], project.workspace.rootPath);

  if (!checkoutResult.ok) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: "Task branch failed",
      reason: checkoutResult.stderr || checkoutResult.stdout || "Unable to create or switch task branch.",
      payload: {
        taskId,
        branchName,
      },
    });

    return syncProjectWorkspace(projectId, { repository }, { recordEvent: false });
  }

  const updatedProject = await syncProjectWorkspace(projectId, { repository }, { recordEvent: false });

  if (updatedProject) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: "Task branch ready",
      reason: `Workspace is now on ${branchName}.`,
      payload: {
        taskId,
        branchName,
      },
    });
  }

  return updatedProject;
}

export async function configureProjectWorkspaceRemote(
  projectId: string,
  remoteUrl: string,
  dependencies: WorkspaceServiceDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const project = await repository.getProject(projectId);

  if (!project) {
    return undefined;
  }

  const normalizedRemoteUrl = remoteUrl.trim();
  const workspace = {
    ...project.workspace,
    remoteUrl: normalizedRemoteUrl || undefined,
    repoProvider: resolveRepoProvider(normalizedRemoteUrl || undefined),
  };

  const updatedProject = await repository.updateWorkspaceState(projectId, workspace);

  if (!updatedProject) {
    return undefined;
  }

  await repository.recordEvent({
    projectId,
    type: "workspace",
    summary: normalizedRemoteUrl ? "Workspace remote configured" : "Workspace remote cleared",
    reason: normalizedRemoteUrl
      ? `Workspace remote is now ${normalizedRemoteUrl}.`
      : "Workspace remote was cleared and the project returned to local-only Git mode.",
    payload: {
      remoteUrl: normalizedRemoteUrl || null,
    },
  });

  if (fs.existsSync(updatedProject.workspace.rootPath)) {
    return syncProjectWorkspace(projectId, { repository }, { recordEvent: false });
  }

  return updatedProject;
}
