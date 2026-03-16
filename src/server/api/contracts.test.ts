import { describe, expect, it } from "vitest";

import {
  agentRuntimeRequestSchema,
  agentRunEnqueueRequestSchema,
  createProjectRequestSchema,
  projectChatMessageRequestSchema,
  taskTransitionRequestSchema,
} from "@/server/api/contracts";

describe("api contracts", () => {
  it("accepts a valid project creation payload", () => {
    const result = createProjectRequestSchema.parse({
      name: "Clonable",
      ideaPrompt: "Build MVPs with agents",
      targetUser: "Founders",
      constraints: ["local-first"],
      stackPreferences: ["Next.js"],
    });

    expect(result.name).toBe("Clonable");
  });

  it("rejects an invalid task transition", () => {
    expect(() =>
      taskTransitionRequestSchema.parse({
        state: "NotAState",
        agentId: "agent-1",
      }),
    ).toThrow();
  });

  it("accepts run enqueue payloads with canonical triggers", () => {
    const result = agentRunEnqueueRequestSchema.parse({
      agentId: "agent-1",
      trigger: "manual",
      summary: "Run reviewer",
      reason: "Manual retry",
    });

    expect(result.trigger).toBe("manual");
  });

  it("accepts agent runtime payloads for OpenClaw", () => {
    const result = agentRuntimeRequestSchema.parse({
      runtimeBackend: "openclaw",
      model: "OpenClaw",
      openclawBotId: "mvp-guide",
    });

    expect(result.runtimeBackend).toBe("openclaw");
    expect(result.openclawBotId).toBe("mvp-guide");
  });

  it("requires content for project chat messages", () => {
    expect(() =>
      projectChatMessageRequestSchema.parse({
        botId: "mvp-guide",
        content: "",
      }),
    ).toThrow();
  });
});
