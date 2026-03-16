import { z } from "zod";

import type { ProjectIntakeInput } from "@/server/domain/project";
import type { PlannerDraft } from "@/server/domain/project";
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

function shouldUseFixturePlanner() {
  return process.env.CLONABLE_PLANNER_USE_FIXTURE?.trim().toLowerCase() === "true";
}

export function buildFixturePlannerDraft(project: ProjectIntakeInput): PlannerDraft {
  return {
    vision: project.ideaPrompt,
    goalStatement: `Ship the smallest credible MVP for ${project.name}.`,
    mvpSummary:
      "A planning-first MVP with one build loop, one clear goal, a visible MVP boundary, and explicit task routing.",
    successDefinition:
      "A user can create a project, inspect the MVP boundary, see structured work, and keep progress visible without hidden steps.",
    laterScope: [
      "Multi-user collaboration",
      "Deployment automation",
      "Advanced autonomous execution",
    ],
    boundaryReasoning:
      "The first slice should prove the builder loop end-to-end before widening scope into collaboration, deployment, or broader autonomy.",
    definitionOfDone: [
      "The MVP boundary is visible.",
      "The first phase, feature, and tasks are explicit.",
      "The build loop opens with meaningful next work.",
    ],
    phases: [
      {
        title: "Phase 1: Builder loop foundation",
        goal: "Make the main project loop visible and usable immediately after project creation.",
      },
      {
        title: "Phase 2: Planning controls",
        goal: "Let the user refine the MVP and route work safely.",
      },
    ],
    features: [
      {
        phaseTitle: "Phase 1: Builder loop foundation",
        title: "Build loop overview",
        summary: "Show the project goal, MVP boundary, and next work in one place.",
        priority: "high",
      },
      {
        phaseTitle: "Phase 2: Planning controls",
        title: "Task routing controls",
        summary: "Support explicit ownership and state transitions.",
        priority: "normal",
      },
    ],
    tasks: [
      {
        featureTitle: "Build loop overview",
        title: "Render the goal and MVP boundary",
        description: "Show the main goal, MVP summary, and what matters now on the build surface.",
        priority: "high",
        acceptanceCriteria: [
          "The build page shows the goal statement",
          "The MVP boundary is visible",
          "Current focus is visible",
        ],
        dependsOn: [],
      },
      {
        featureTitle: "Task routing controls",
        title: "Support explicit task routing",
        description: "Allow the user to assign ownership and move work through valid policy states.",
        priority: "normal",
        acceptanceCriteria: [
          "Task owners are editable",
          "Transitions are visible",
          "Changes are logged",
        ],
        dependsOn: ["Render the goal and MVP boundary"],
      },
    ],
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

export async function generatePlannerDraft(
  project: ProjectIntakeInput,
) {
  if (shouldUseFixturePlanner()) {
    return buildFixturePlannerDraft(project);
  }

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
