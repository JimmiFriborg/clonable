import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildFixturePlannerDraft,
  generatePlannerDraft,
  PlannerServiceError,
} from "@/server/services/planner-service";
import * as providerGateway from "@/server/services/provider-gateway";

const originalApiKey = process.env.OPENAI_API_KEY;
const originalPlannerProvider = process.env.CLONABLE_PLANNER_PROVIDER;
const originalFixturePlanner = process.env.CLONABLE_PLANNER_USE_FIXTURE;

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.CLONABLE_PLANNER_PROVIDER = "openai";
});

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey;
  process.env.CLONABLE_PLANNER_PROVIDER = originalPlannerProvider;
  process.env.CLONABLE_PLANNER_USE_FIXTURE = originalFixturePlanner;
  vi.restoreAllMocks();
});

describe("planner-service", () => {
  it("returns parsed planner output", async () => {
    vi.spyOn(providerGateway, "generateStructuredObject").mockResolvedValue({
      vision: "Vision",
      goalStatement: "Goal",
      mvpSummary: "Summary",
      successDefinition: "Success",
      laterScope: ["Later"],
      boundaryReasoning: "Boundary",
      definitionOfDone: ["Clear MVP"],
      phases: [{ title: "Phase 1", goal: "Goal 1" }],
      features: [
        {
          phaseTitle: "Phase 1",
          title: "Feature 1",
          summary: "Feature summary",
          priority: "high",
        },
      ],
      tasks: [
        {
          featureTitle: "Feature 1",
          title: "Task 1",
          description: "Task description",
          priority: "high",
          acceptanceCriteria: ["Works"],
          dependsOn: [],
        },
      ],
    });

    const draft = await generatePlannerDraft({
      name: "Planner test",
      ideaPrompt: "Build a planner",
      targetUser: "Founders",
      constraints: ["Local-first"],
      stackPreferences: ["Next.js"],
    });

    expect(draft.goalStatement).toBe("Goal");
    expect(providerGateway.generateStructuredObject).toHaveBeenCalledOnce();
  });

  it("throws when parsed planner output is missing", async () => {
    vi.spyOn(providerGateway, "generateStructuredObject").mockRejectedValue(
      new Error("Planner response did not contain parsed output."),
    );

    await expect(
      generatePlannerDraft({
        name: "Planner test",
        ideaPrompt: "Build a planner",
        targetUser: "Founders",
        constraints: ["Local-first"],
        stackPreferences: ["Next.js"],
      }),
    ).rejects.toBeInstanceOf(PlannerServiceError);
  });

  it("returns a deterministic fixture draft when fixture mode is enabled", async () => {
    process.env.CLONABLE_PLANNER_USE_FIXTURE = "true";
    const gatewaySpy = vi.spyOn(providerGateway, "generateStructuredObject");

    const draft = await generatePlannerDraft({
      name: "Fixture project",
      ideaPrompt: "Build a stable test loop.",
      targetUser: "Founders",
      constraints: ["Local-first"],
      stackPreferences: ["Next.js"],
    });

    expect(draft).toEqual(
      buildFixturePlannerDraft({
        name: "Fixture project",
        ideaPrompt: "Build a stable test loop.",
        targetUser: "Founders",
        constraints: ["Local-first"],
        stackPreferences: ["Next.js"],
      }),
    );
    expect(gatewaySpy).not.toHaveBeenCalled();
  });
});
