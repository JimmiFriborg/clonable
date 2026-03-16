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

    const prompt = `Create a mobile-first build loop for async product teams ${Date.now()}`;
    await fillProjectForm(page, prompt);

    await Promise.all([
      page.waitForURL(/\/projects\/[^/]+\/build/),
      page.getByRole("button", { name: "Draft my MVP" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "Build loop" })).toBeVisible();
    await expect(page.locator("p").filter({ hasText: /^MVP boundary$/ })).toBeVisible();
    await expect(page.locator("aside h1")).toBeVisible();
  });
});
