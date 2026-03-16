import { z } from "zod";

import type { ProjectIntakeInput } from "@/server/domain/project";
import {
  generateStructuredObject,
  getPlannerProviderSelection,
} from "@/server/services/provider-gateway";

const plannerDraftSchema = z.object({
  vision: z.string().min(1),
  goalStatement: z.string().min(1),
  mvpSummary: z.string().min(1),
  successDefinition: z.string().min(1),
  laterScope: z.array(z.string()),
  boundaryReasoning: z.string().min(1),
  definitionOfDone: z.array(z.string().min(1)).min(1),
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
        priority: z.enum(["blocker", "high", "normal", "low"]),
      }),
    )
    .min(1),
  tasks: z
    .array(
      z.object({
        featureTitle: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        priority: z.enum(["blocker", "high", "normal", "low"]),
        acceptanceCriteria: z.array(z.string()).min(1),
        dependsOn: z.array(z.string()),
      }),
    )
    .min(1),
});

export class PlannerServiceError extends Error {}

function buildPlannerInput(project: ProjectIntakeInput) {
  return [
    `Project name: ${project.name}`,
    `Target user: ${project.targetUser}`,
    `Idea prompt: ${project.ideaPrompt}`,
    `Constraints: ${project.constraints.join(" | ") || "None provided"}`,
    `Stack preferences: ${project.stackPreferences.join(" | ") || "No preference provided"}`,
  ].join("\n");
}

export async function generatePlannerDraft(
  project: ProjectIntakeInput,
) {
  const providerSelection = getPlannerProviderSelection();

  try {
    return await generateStructuredObject({
      provider: providerSelection.provider,
      model: providerSelection.model,
      instructions:
        "You are Clonable's Product Planner. Convert the idea into the smallest credible MVP, separate later scope, define a concise project definition of done, and produce a planning-first implementation draft. Keep the MVP tight, practical, and stable. Use priorities blocker/high/normal/low.",
      input: buildPlannerInput(project),
      schema: plannerDraftSchema,
      schemaName: "planner_draft",
    });
  } catch (error) {
    throw new PlannerServiceError(
      error instanceof Error ? error.message : "Planner generation failed.",
    );
  }
}

export { plannerDraftSchema };
