import { test, expect } from "@playwright/test";
import { mockWalletDisconnected } from "./wallet-mock";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletDisconnected(page);
    await page.goto("/");
  });

  test("renders hero heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Lease NFTs on Stellar/i })
    ).toBeVisible();
  });

  test("shows Connect Wallet button when not connected", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Connect Wallet/i }).first()
    ).toBeVisible();
  });

  test("shows feature cards", async ({ page }) => {
    await expect(page.getByText("List NFTs for Lease")).toBeVisible();
    await expect(page.getByText("Permissionless Leasing")).toBeVisible();
    await expect(page.getByText("Secure & Transparent")).toBeVisible();
    await expect(page.getByText("Soroban Smart Contracts")).toBeVisible();
  });

  test("shows How It Works section", async ({ page }) => {
    await expect(page.getByText("How It Works")).toBeVisible();
    await expect(page.getByText("Connect Wallet")).toBeVisible();
    await expect(page.getByText("List or Lease")).toBeVisible();
    await expect(page.getByText("Track & Manage")).toBeVisible();
  });

  test("Dashboard link is visible and navigates", async ({ page }) => {
    const dashboardLink = page.getByRole("link", { name: "Dashboard" });
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("page has correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/LeaseNFT/i);
  });
});
