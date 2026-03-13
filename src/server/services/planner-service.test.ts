import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  generatePlannerDraft,
  PlannerServiceError,
} from "@/server/services/planner-service";

const originalApiKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey;
});

describe("planner-service", () => {
  it("returns parsed planner output", async () => {
    const client = {
      responses: {
        parse: vi.fn().mockResolvedValue({
          output_parsed: {
            vision: "Vision",
            goalStatement: "Goal",
            mvpSummary: "Summary",
            successDefinition: "Success",
            laterScope: ["Later"],
            boundaryReasoning: "Boundary",
            phases: [{ title: "Phase 1", goal: "Goal 1" }],
            features: [
              {
                phaseTitle: "Phase 1",
                title: "Feature 1",
                summary: "Feature summary",
                priority: "P0",
              },
            ],
            tasks: [
              {
                featureTitle: "Feature 1",
                title: "Task 1",
                description: "Task description",
                priority: "P0",
                acceptanceCriteria: ["Works"],
                dependsOn: [],
              },
            ],
          },
        }),
      },
    };

    const draft = await generatePlannerDraft(
      {
        name: "Planner test",
        ideaPrompt: "Build a planner",
        targetUser: "Founders",
        constraints: ["Local-first"],
        stackPreferences: ["Next.js"],
      },
      client,
    );

    expect(draft.goalStatement).toBe("Goal");
    expect(client.responses.parse).toHaveBeenCalledOnce();
  });

  it("throws when parsed planner output is missing", async () => {
    const client = {
      responses: {
        parse: vi.fn().mockResolvedValue({
          output_parsed: null,
        }),
      },
    };

    await expect(
      generatePlannerDraft(
        {
          name: "Planner test",
          ideaPrompt: "Build a planner",
          targetUser: "Founders",
          constraints: ["Local-first"],
          stackPreferences: ["Next.js"],
        },
        client,
      ),
    ).rejects.toBeInstanceOf(PlannerServiceError);
  });
});
