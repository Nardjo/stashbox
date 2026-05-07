import { test, expect } from "@playwright/test";

test("root layout renders without error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  await expect(page.locator("h1")).toContainText("Stashbox");
  expect(errors).toHaveLength(0);
});
