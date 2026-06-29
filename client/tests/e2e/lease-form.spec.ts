import { test, expect } from "@playwright/test";
import { mockWalletConnected } from "./wallet-mock";

test.describe("Lease Form", () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnected(page);
    await page.goto("/app-page");
    await page.waitForLoadState("networkidle");
    // Give Zustand hydration time
    await page.waitForTimeout(500);
  });

  test("app page loads without error", async ({ page }) => {
    // Should not show a crash page
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("lease section title is visible when wallet is connected", async ({
    page,
  }) => {
    // The listings section should appear
    await expect(
      page.getByText(/Available|Listings|Lease/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("wallet address is displayed in footer", async ({ page }) => {
    // The connected wallet address should be shown (shortened)
    await expect(page.getByText(/Connected:/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("network badge is visible", async ({ page }) => {
    await expect(page.getByText(/testnet/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Initialize Contract button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Initialize Contract/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Lease Form - not connected", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app-page");
    await page.waitForLoadState("networkidle");
  });

  test("shows wallet required state", async ({ page }) => {
    await expect(
      page.getByText(/Wallet Required|Connect Wallet/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
