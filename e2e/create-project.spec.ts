import { expect, test } from "@playwright/test";

import { fillProjectForm } from "./helpers";

test.describe("project creation", () => {
  test("mobile create-project CTA opens the form and redirects into the build loop", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "This flow is specifically for the mobile CTA.");

    await page.goto("/");
    await page.getByRole("link", { name: "Create project" }).last().click();
    await expect(page).toHaveURL("/projects/new");

    const projectName = `Mobile E2E ${Date.now()}`;
    await fillProjectForm(page, projectName);

    await Promise.all([
      page.waitForURL(/\/projects\/[^/]+\/build/),
      page.getByRole("button", { name: "Create project" }).click(),
    ]);

    await expect(
      page.getByRole("heading", { name: "Chat with OpenClaw, keep every step explicit" }),
    ).toBeVisible();
    await expect(page.locator("p").filter({ hasText: /^MVP boundary$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
  });
});
