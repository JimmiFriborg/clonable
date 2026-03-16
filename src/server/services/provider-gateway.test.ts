import { afterEach, describe, expect, it } from "vitest";

import {
  getPlannerProviderSelection,
  getProviderConfigResponse,
} from "@/server/services/provider-gateway";

const originalPlannerProvider = process.env.CLONABLE_PLANNER_PROVIDER;
const originalPlannerModel = process.env.CLONABLE_PLANNER_MODEL;
const originalOpenAi = process.env.OPENAI_API_KEY;
const originalAnthropic = process.env.ANTHROPIC_API_KEY;
const originalGemini = process.env.GEMINI_API_KEY;

afterEach(() => {
  process.env.CLONABLE_PLANNER_PROVIDER = originalPlannerProvider;
  process.env.CLONABLE_PLANNER_MODEL = originalPlannerModel;
  process.env.OPENAI_API_KEY = originalOpenAi;
  process.env.ANTHROPIC_API_KEY = originalAnthropic;
  process.env.GEMINI_API_KEY = originalGemini;
});

describe("provider-gateway", () => {
  it("reports configured providers without exposing secrets", () => {
    process.env.OPENAI_API_KEY = "openai-test";
    process.env.ANTHROPIC_API_KEY = "";
    process.env.GEMINI_API_KEY = "gemini-test";

    const config = getProviderConfigResponse();

    expect(config.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "openai", configured: true }),
        expect.objectContaining({ provider: "anthropic", configured: false }),
        expect.objectContaining({ provider: "gemini", configured: true }),
      ]),
    );
  });

  it("uses planner provider env overrides", () => {
    process.env.CLONABLE_PLANNER_PROVIDER = "gemini";
    process.env.CLONABLE_PLANNER_MODEL = "gemini-custom";

    expect(getPlannerProviderSelection()).toEqual({
      provider: "gemini",
      model: "gemini-custom",
    });
  });
});
