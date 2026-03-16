import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import type { SpawnOptions } from "node:child_process";

import type { ProjectRepository } from "@/server/domain/project-repository";
import type { PreviewRecord, PreviewSettingsInput } from "@/server/domain/project";
import { sqliteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";
import { syncProjectWorkspace } from "@/server/services/workspace-service";

const DEFAULT_STARTUP_DELAY_MS = 350;
const MAX_PREVIEW_LOG_LINES = 24;

interface PreviewServiceDependencies {
  repository?: ProjectRepository;
  startupDelayMs?: number;
}

interface ParsedPreviewCommand {
  command: string;
  args: string[];
}

function nowIso() {
  return new Date().toISOString();
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function ensureLogPath(rootPath: string, existingPath?: string) {
  const logPath =
    existingPath ?? path.join(rootPath, ".clonable", "logs", "preview.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, "", { flag: "a" });
  return logPath;
}

function appendPreviewNote(logPath: string, line: string) {
  fs.appendFileSync(logPath, `[${nowIso()}] ${line}\n`, "utf-8");
}

function tokenizePreviewCommand(command: string) {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const character of command.trim()) {
    if (escaping) {
      current += character;
      escaping = false;
      continue;
    }

    if (character === "\\") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        current += character;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (escaping) {
    current += "\\";
  }

  if (quote) {
    throw new Error(`Unterminated quote in preview command: ${command}`);
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  if (tokens.length === 0) {
    throw new Error("Preview command is empty.");
  }

  return tokens;
}

function resolveCommandPath(command: string) {
  if (path.isAbsolute(command) && fs.existsSync(command)) {
    return command;
  }

  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const extensions =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .map((extension) => extension.toLowerCase())
      : [""];
  const commandHasExtension = Boolean(path.extname(command));
  const candidates =
    process.platform === "win32" && !commandHasExtension
      ? extensions.map((extension) => `${command}${extension}`)
      : [command];

  for (const entry of pathEntries) {
    for (const candidate of candidates) {
      const candidatePath = path.join(entry, candidate);

      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return command;
}

function parsePreviewCommand(command: string): ParsedPreviewCommand {
  const [rawCommand, ...args] = tokenizePreviewCommand(command);
  return {
    command: resolveCommandPath(rawCommand),
    args,
  };
}

function parsePreviewLogLine(line: string) {
  const match = /^\[(.+?)\]\s(.*)$/.exec(line);

  if (!match) {
    return {
      at: nowIso(),
      line,
    };
  }

  return {
    at: match[1],
    line: match[2],
  };
}

function readRecentLogs(logPath?: string): PreviewRecord["recentLogs"] {
  if (!logPath || !fs.existsSync(logPath)) {
    return [
      {
        at: nowIso(),
        line: "Preview log has not been created yet.",
      },
    ];
  }

  const lines = fs
    .readFileSync(logPath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-MAX_PREVIEW_LOG_LINES);

  if (lines.length === 0) {
    return [
      {
        at: nowIso(),
        line: "Preview log is empty.",
      },
    ];
  }

  return lines.map(parsePreviewLogLine);
}

function isProcessRunning(pid?: number) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopProcess(pid?: number) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

function buildPreviewUrl(port: number) {
  return `http://localhost:${port}`;
}

export async function updateProjectPreviewSettings(
  projectId: string,
  input: PreviewSettingsInput,
  dependencies: PreviewServiceDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const project = await repository.getProject(projectId);

  if (!project) {
    return undefined;
  }

  const port = Number.isFinite(input.port) && input.port > 0 ? input.port : 3000;
  const updatedProject = await repository.updatePreviewState(projectId, {
    ...project.preview,
    command: input.command.trim() || project.preview.command,
    port,
    url: buildPreviewUrl(port),
  });

  if (updatedProject) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: "Preview settings updated",
      reason: "The local preview command or port changed.",
      payload: {
        command: updatedProject.preview.command,
        port: updatedProject.preview.port,
      },
    });
  }

  return updatedProject;
}

export async function refreshProjectPreview(
  projectId: string,
  dependencies: PreviewServiceDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const project = await repository.getProject(projectId);

  if (!project) {
    return undefined;
  }

  const running = isProcessRunning(project.preview.pid);
  const updatedProject = await repository.updatePreviewState(projectId, {
    ...project.preview,
    status: running
      ? "Running"
      : project.preview.pid
        ? "Errored"
        : project.preview.status === "Running"
          ? "Stopped"
          : project.preview.status,
    pid: running ? project.preview.pid : undefined,
    recentLogs: readRecentLogs(project.preview.logPath),
    lastExitCode: running ? undefined : project.preview.lastExitCode,
  });

  return updatedProject;
}

export async function startProjectPreview(
  projectId: string,
  dependencies: PreviewServiceDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const startupDelayMs = dependencies.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS;
  const project = await syncProjectWorkspace(
    projectId,
    { repository },
    { recordEvent: false },
  );

  if (!project) {
    return undefined;
  }

  const logPath = ensureLogPath(project.workspace.rootPath, project.preview.logPath);
  appendPreviewNote(logPath, `Starting preview with "${project.preview.command}".`);

  if (isProcessRunning(project.preview.pid)) {
    return refreshProjectPreview(projectId, { repository });
  }

  const outputHandle = fs.openSync(logPath, "a");
  const spawnOptions: SpawnOptions = {
    cwd: project.workspace.rootPath,
    env: {
      ...process.env,
      PORT: String(project.preview.port),
    },
    detached: true,
    stdio: ["ignore", outputHandle, outputHandle],
    windowsHide: true,
  };
  let child;

  try {
    const parsedCommand = parsePreviewCommand(project.preview.command);
    child = spawn(parsedCommand.command, parsedCommand.args, spawnOptions);
  } catch (error) {
    appendPreviewNote(
      logPath,
      `Falling back to shell launch because command parsing failed: ${error instanceof Error ? error.message : "Unknown error"}.`,
    );
    child = spawn(project.preview.command, {
      ...spawnOptions,
      shell: true,
    });
  }

  child.unref();
  fs.closeSync(outputHandle);

  await wait(startupDelayMs);
  const running = isProcessRunning(child.pid);
  const updatedProject = await repository.updatePreviewState(projectId, {
    ...project.preview,
    status: running ? "Running" : "Errored",
    pid: running ? child.pid : undefined,
    logPath,
    lastExitCode: running ? undefined : 1,
    lastRestartedAt: nowIso(),
    url: buildPreviewUrl(project.preview.port),
    recentLogs: readRecentLogs(logPath),
  });

  if (updatedProject) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: running ? "Preview started" : "Preview failed to start",
      reason: running
        ? `Started "${updatedProject.preview.command}" on port ${updatedProject.preview.port}.`
        : "The preview process exited immediately. Check the preview logs for details.",
      payload: {
        pid: updatedProject.preview.pid,
        logPath,
      },
    });
  }

  return updatedProject;
}

export async function stopProjectPreview(
  projectId: string,
  dependencies: PreviewServiceDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const project = await repository.getProject(projectId);

  if (!project) {
    return undefined;
  }

  stopProcess(project.preview.pid);

  if (project.preview.logPath) {
    appendPreviewNote(project.preview.logPath, "Stopping preview process.");
  }

  const updatedProject = await repository.updatePreviewState(projectId, {
    ...project.preview,
    status: "Stopped",
    pid: undefined,
    recentLogs: readRecentLogs(project.preview.logPath),
  });

  if (updatedProject) {
    await repository.recordEvent({
      projectId,
      type: "workspace",
      summary: "Preview stopped",
      reason: "The local preview process was stopped.",
    });
  }

  return updatedProject;
}

export async function restartProjectPreview(
  projectId: string,
  dependencies: PreviewServiceDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  await stopProjectPreview(projectId, { repository });
  return startProjectPreview(projectId, dependencies);
}
