import { expect, test } from "@playwright/test";

import { createProjectViaApi } from "./helpers";

test.describe("planning and agents", () => {
  test("updates the MVP draft and preserves the change on the goal page", async ({
    page,
    request,
  }) => {
    const project = await createProjectViaApi(request, "Goal Edit");
    const updatedBoundary = `Boundary update ${Date.now()}`;

    await page.goto(`/projects/${project.id}/goal`);
    await page.getByLabel("Boundary reasoning").fill(updatedBoundary);
    await page.getByRole("button", { name: "Save MVP draft" }).click();
    await page.reload();

    await expect(page.getByLabel("Boundary reasoning")).toHaveValue(updatedBoundary);
  });

  test("supports explicit task ownership and transition routing", async ({ page, request }) => {
    const project = await createProjectViaApi(request, "Task Routing");
    const taskId = project.tasks[0]?.id;
    const orchestrator = project.agents.find((agent) => agent.policyRole === "orchestrator");
    const builder = project.agents.find((agent) => agent.policyRole === "builder");

    test.skip(!taskId || !orchestrator || !builder, "Fixture project is missing task-routing data.");

    await page.goto(`/projects/${project.id}/tasks/${taskId}`);

    await page.selectOption('select[name="ownerAgentId"]', builder.id);
    await page.getByRole("button", { name: "Save owner" }).click();
    await page.reload();
    await expect(page.locator('select[name="ownerAgentId"]')).toHaveValue(builder.id);

    await page.selectOption('select[name="agentId"]', orchestrator.id);
    await page.selectOption('select[name="state"]', "Ready");
    await page.getByLabel("Note").fill("Prepared for execution.");
    await page.getByRole("button", { name: "Apply transition" }).click();
    await page.reload();

    const taskResponse = await request.get(`/api/v1/projects/${project.id}/tasks/${taskId}`);
    expect(taskResponse.ok()).toBeTruthy();
    const updatedTask = (await taskResponse.json()) as {
      state: string;
      notes: string;
    };

    expect(updatedTask.state).toBe("Ready");
    expect(updatedTask.notes).toContain("Prepared for execution.");
    await expect(page.getByText(/Backlog -> Ready/)).toBeVisible();
  });

  test("creates a custom agent with OpenClaw runtime", async ({ page, request }) => {
    const project = await createProjectViaApi(request, "Agent Config");
    const agentName = `E2E Agent ${Date.now()}`;

    await page.goto(`/projects/${project.id}/agents`);

    await page.locator('input[name="name"]').first().fill(agentName);
    await page
      .locator('input[name="role"]')
      .first()
      .fill("Handle structured testing support.");
    await page.locator('select[name="policyRole"]').first().selectOption("advisory");
    await page.locator('select[name="runtimeBackend"]').first().selectOption("openclaw");
    await page.locator('select[name="openclawBotId"]').first().selectOption("ux-coach");
    await page
      .locator('input[name="instructionsSummary"]')
      .first()
      .fill("Support testing with advisory recommendations.");
    await page
      .locator('textarea[name="instructions"]')
      .first()
      .fill("Stay advisory, keep testing visible, and do not mutate scope silently.");

    await page.getByRole("button", { name: "Create agent" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Create agent" }).click();
    await page.reload();

    await expect(page.getByRole("heading", { name: agentName })).toBeVisible();
    await expect(page.getByText(/OpenClaw.*ux-coach/)).toBeVisible();
  });
});
