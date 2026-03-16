import { expect, type APIRequestContext, type Page } from "@playwright/test";

export interface E2eProject {
  id: string;
  name: string;
  tasks: Array<{ id: string; title: string }>;
  agents: Array<{ id: string; name: string; policyRole: string }>;
}

function uniqueName(seed: string) {
  return `${seed} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function createProjectViaApi(
  request: APIRequestContext,
  seed: string,
): Promise<E2eProject> {
  const response = await request.post("/api/v1/projects", {
    data: {
      name: uniqueName(seed),
      ideaPrompt: "Create a stable MVP planning workspace with visible progress and agent routing.",
      targetUser: "Founders",
      constraints: ["Local-first", "Hosted-safe"],
      stackPreferences: ["Next.js", "TypeScript"],
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as E2eProject;
}

export async function fillProjectForm(page: Page, prompt?: string) {
  await page.getByLabel("What do you want to build?").fill(
    prompt ?? "Build a stable MVP planning workspace with visible progress and agent routing.",
  );
}
