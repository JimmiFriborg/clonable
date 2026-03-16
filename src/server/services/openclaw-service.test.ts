import { afterEach, describe, expect, it } from "vitest";

import {
  createTempRepository,
} from "@/server/test-utils/temp-database";
import {
  getOpenClawCatalog,
  getProjectChatSurface,
  sendProjectChatMessage,
} from "@/server/services/openclaw-service";

const cleanups: Array<() => void> = [];
const originalBaseUrl = process.env.OPENCLAW_BASE_URL;
const originalApiKey = process.env.OPENCLAW_API_KEY;
const originalDefaultBotId = process.env.OPENCLAW_DEFAULT_BOT_ID;

afterEach(() => {
  process.env.OPENCLAW_BASE_URL = originalBaseUrl;
  process.env.OPENCLAW_API_KEY = originalApiKey;
  process.env.OPENCLAW_DEFAULT_BOT_ID = originalDefaultBotId;

  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

describe("openclaw-service", () => {
  it("falls back to the built-in bot catalog when OpenClaw is not configured", async () => {
    process.env.OPENCLAW_BASE_URL = "";
    process.env.OPENCLAW_API_KEY = "";

    const catalog = await getOpenClawCatalog();

    expect(catalog.configured).toBe(false);
    expect(catalog.bots.length).toBeGreaterThan(1);
    expect(catalog.defaultBotId).toBe("mvp-guide");
  });

  it("persists chat sessions and messages even when OpenClaw is offline", async () => {
    process.env.OPENCLAW_BASE_URL = "";
    process.env.OPENCLAW_API_KEY = "";

    const temp = createTempRepository();
    cleanups.push(temp.cleanup);

    const project = await temp.repository.createProject({
      name: "Chat project",
      ideaPrompt: "Build a guided MVP loop.",
      targetUser: "Founders",
      constraints: ["Local-first"],
      stackPreferences: ["Next.js"],
    });

    const result = await sendProjectChatMessage(
      project.id,
      {
        botId: "mvp-guide",
        content: "What are the next best tasks?",
      },
      temp.repository,
    );

    const chat = await getProjectChatSurface(project.id, result?.sessionId, temp.repository);

    expect(result?.assistantMessage.content).toContain("OpenClaw");
    expect(chat?.activeSession?.botId).toBe("mvp-guide");
    expect(chat?.messages).toHaveLength(2);
    expect(chat?.messages[0]?.role).toBe("user");
    expect(chat?.messages[1]?.role).toBe("assistant");
  });
});
