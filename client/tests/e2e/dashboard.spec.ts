import { test, expect } from "@playwright/test";
import { mockWalletConnected } from "./wallet-mock";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnected(page);
    await page.goto("/dashboard");
  });

  test("renders dashboard heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Dashboard/i })
    ).toBeVisible();
  });

  test("contract events section is visible", async ({ page }) => {
    await expect(page.getByText("Contract Events")).toBeVisible();
  });

  test("transaction history section is visible", async ({ page }) => {
    // Transaction section should be present
    const txSection = page.getByText(/Recent Transactions/i);
    await expect(txSection.first()).toBeVisible();
  });

  test("shows empty state when no activity", async ({ page }) => {
    await expect(page.getByText("No transactions yet")).toBeVisible();
    await expect(page.getByText("No events yet")).toBeVisible();
  });

  test("navigation links are visible", async ({ page }) => {
    const mobileMenuBtn = page.getByRole("button", { name: "Open menu" });
    if (await mobileMenuBtn.isVisible()) {
      await mobileMenuBtn.click();
    }
    const appLink = page.getByRole("link", { name: /App/i });
    await expect(appLink.first()).toBeVisible();
  });
});

test.describe("Dashboard - not connected", () => {
  test.beforeEach(async ({ page }) => {
    // Default state (no mock = disconnected localStorage)
    await page.goto("/dashboard");
  });

  test("shows dashboard even without wallet", async ({ page }) => {
    // Dashboard should be publicly accessible
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
