import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Henry Ledger");
});

test("3-tab navigation is present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "홈" })).toBeVisible();
  await expect(page.getByRole("link", { name: "계획" })).toBeVisible();
  await expect(page.getByRole("link", { name: "티커" })).toBeVisible();
});

test("plans page loads", async ({ page }) => {
  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: "투자 계획" })).toBeVisible();
  await expect(page.getByRole("link", { name: "+ 새 계획" })).toBeVisible();
});

test("plan new form has splits and targetReturn fields", async ({ page }) => {
  await page.goto("/plans/new");
  await expect(page.getByLabel(/분할/i)).toBeVisible();
  await expect(page.getByLabel(/목표 수익률/i)).toBeVisible();
});
