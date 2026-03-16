import { expect, test } from "@playwright/test";

import { createProjectViaApi } from "./helpers";

test.describe("build loop", () => {
  test("persists a project chat thread even when OpenClaw is not configured", async ({
    page,
    request,
  }) => {
    const project = await createProjectViaApi(request, "Build Loop");

    await page.goto(`/projects/${project.id}/build`);
    await page
      .getByPlaceholder(
        "Ask the project chat to refine the MVP, propose next tasks, or challenge the current plan.",
      )
      .fill("Suggest the next steps for this MVP.");

    await Promise.all([
      page.waitForURL(new RegExp(`/projects/${project.id}/build\\?session=`)),
      page.getByRole("button", { name: "Send" }).click(),
    ]);

    await expect(page.locator("p").filter({ hasText: /^Built-in chat$/ })).toBeVisible();
    await expect(page.locator("p").filter({ hasText: /^Threads$/ })).toBeVisible();
    await expect(page.getByText(/MVP Guide|OpenClaw|chat/i).first()).toBeVisible();
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

    await page
      .getByRole("textbox", { name: "Repository remote URL" })
      .fill("https://github.com/example/hosted-guardrail.git");
    await page.getByRole("button", { name: "Save remote" }).click({ force: true });

    await expect(page.getByText("https://github.com/example/hosted-guardrail.git")).toBeVisible();
    await expect(page.getByText("Linked")).toBeVisible();
  });
});
