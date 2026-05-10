import { expect, test } from "@playwright/test";

test("root layout renders without error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  await expect(page.locator("h1")).toContainText("Stashbox");
  await expect(page.getByRole("list", { name: "Bookmarks" })).toHaveCSS("display", "grid");
  expect(errors).toHaveLength(0);
});

test("browse controls stay interactive after hydration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const search = page.getByLabel("Rechercher");
  await search.fill("readable");
  await expect(search).toHaveValue("readable");
  await expect(page).toHaveURL(/q=readable/);

  const html = page.locator("html");
  const initialThemeClass = (await html.getAttribute("class")) ?? "";
  const themeToggle = page.getByRole("button", { name: /Activer le thème/ });
  await expect(themeToggle).toBeEnabled();
  await themeToggle.click();
  await expect
    .poll(async () => (await html.getAttribute("class")) ?? "")
    .not.toBe(initialThemeClass);

  expect(errors).toHaveLength(0);
});
