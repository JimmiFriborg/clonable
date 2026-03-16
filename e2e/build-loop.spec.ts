import { expect, test } from "@playwright/test";

import { createProjectViaApi } from "./helpers";

test.describe("build loop", () => {
  test("persists an OpenClaw chat thread even when live OpenClaw is not configured", async ({
    page,
    request,
  }) => {
    const project = await createProjectViaApi(request, "Build Loop");

    await page.goto(`/projects/${project.id}/build`);
    await page
      .getByPlaceholder(
        "Ask OpenClaw to refine the MVP, propose next tasks, or challenge the current plan.",
      )
      .fill("Suggest the next steps for this MVP.");

    await Promise.all([
      page.waitForURL(new RegExp(`/projects/${project.id}/build\\?session=`)),
      page.getByRole("button", { name: "Send" }).click(),
    ]);

    await expect(
      page.getByText(
        "OpenClaw is not configured yet. Add OPENCLAW_BASE_URL and OPENCLAW_API_KEY to enable built-in project chat.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Built-in chat")).toBeVisible();
    await expect(page.locator("p").filter({ hasText: /^Threads$/ })).toBeVisible();
  });

  test("shows hosted-mode guardrails on workspace controls", async ({ page, request }) => {
    const project = await createProjectViaApi(request, "Hosted Guardrail");

    await page.goto(`/projects/${project.id}/workspace`);

    await expect(
      page.getByText(
        "This deployment is running in hosted mode, so local workspace execution is disabled here.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sync workspace" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Commit changes" })).toBeDisabled();
  });
});
