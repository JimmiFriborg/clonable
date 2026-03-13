import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { PlannerDraft, ProjectIntakeInput } from "@/server/domain/project";

const plannerDraftSchema = z.object({
  vision: z.string().min(1),
  goalStatement: z.string().min(1),
  mvpSummary: z.string().min(1),
  successDefinition: z.string().min(1),
  laterScope: z.array(z.string()),
  boundaryReasoning: z.string().min(1),
  phases: z
    .array(
      z.object({
        title: z.string().min(1),
        goal: z.string().min(1),
      }),
    )
    .min(1),
  features: z
    .array(
      z.object({
        phaseTitle: z.string().min(1),
        title: z.string().min(1),
        summary: z.string().min(1),
        priority: z.enum(["P0", "P1", "P2", "P3"]),
      }),
    )
    .min(1),
  tasks: z
    .array(
      z.object({
        featureTitle: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        priority: z.enum(["P0", "P1", "P2", "P3"]),
        acceptanceCriteria: z.array(z.string()).min(1),
        dependsOn: z.array(z.string()),
      }),
    )
    .min(1),
});

export class PlannerServiceError extends Error {}

export interface PlannerClientLike {
  responses: {
    parse: (...args: unknown[]) => Promise<{
      output_parsed: PlannerDraft | null;
    }>;
  };
}

function buildPlannerInput(project: ProjectIntakeInput) {
  return [
    `Project name: ${project.name}`,
    `Target user: ${project.targetUser}`,
    `Idea prompt: ${project.ideaPrompt}`,
    `Constraints: ${project.constraints.join(" | ") || "None provided"}`,
    `Stack preferences: ${project.stackPreferences.join(" | ") || "No preference provided"}`,
  ].join("\n");
}

function getPlannerClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }) as unknown as PlannerClientLike;
}

export async function generatePlannerDraft(
  project: ProjectIntakeInput,
  client: PlannerClientLike = getPlannerClient(),
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new PlannerServiceError("OPENAI_API_KEY is missing.");
  }

  const model = process.env.CLONABLE_PLANNER_MODEL ?? "gpt-5.4";
  const response = await client.responses.parse({
    model,
    instructions:
      "You are Clonable's Product Planner. Convert the idea into the smallest credible MVP, separate later scope, and produce a planning-first implementation draft. Keep the MVP tight, practical, and stable.",
    input: buildPlannerInput(project),
    text: {
      format: zodTextFormat(plannerDraftSchema, "planner_draft"),
    },
  });

  if (!response.output_parsed) {
    throw new PlannerServiceError("Planner response did not contain parsed output.");
  }

  return response.output_parsed;
}

export { plannerDraftSchema };
