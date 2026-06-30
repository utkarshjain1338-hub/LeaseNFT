import { test, expect } from "@playwright/test";
import { mockWalletConnected } from "./wallet-mock";

test.describe("Listing Form Validation", () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnected(page);
    await page.goto("/app-page");
  });

  test("List NFT form is visible when connected", async ({ page }) => {
    await expect(page.locator("#list-card-title")).toBeVisible({ timeout: 10_000 });
  });

  test("List NFT button exists", async ({ page }) => {
    const listBtn = page.getByRole("button", { name: "List NFT" });
    await expect(listBtn).toBeVisible({ timeout: 10_000 });
  });

  test("Token ID field is present", async ({ page }) => {
    const tokenIdInput = page.getByLabel("Token ID");
    await expect(tokenIdInput).toBeVisible({ timeout: 10_000 });
  });

  test("Token Address field is present", async ({ page }) => {
    const addrInput = page.getByLabel("Token Contract Address");
    await expect(addrInput).toBeVisible({ timeout: 10_000 });
  });

  test("Daily Rate field is present", async ({ page }) => {
    const rateInput = page.getByLabel(/Daily Rate/i);
    await expect(rateInput).toBeVisible({ timeout: 10_000 });
  });

  test("Max Duration field is present with default value", async ({ page }) => {
    const durationInput = page.getByLabel(/Max Duration/i);
    await expect(durationInput).toBeVisible({ timeout: 10_000 });
    await expect(durationInput).toHaveValue("30");
  });

  test("form submission with empty fields shows error toast", async ({ page }) => {
    const listBtn = page.getByRole("button", { name: "List NFT" });
    await expect(listBtn).toBeVisible({ timeout: 10_000 });
    await listBtn.click();
    // Should show validation error via toast
    await expect(page.getByText("Token ID is required")).toBeVisible({
      timeout: 5000,
    });
  });

  test("filling Token ID field works", async ({ page }) => {
    const tokenIdInput = page.getByLabel("Token ID");
    await expect(tokenIdInput).toBeVisible({ timeout: 10_000 });
    await tokenIdInput.fill("LEASED_NFT_001");
    await expect(tokenIdInput).toHaveValue("LEASED_NFT_001");
  });
});
