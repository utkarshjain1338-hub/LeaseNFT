import { test, expect } from "@playwright/test";
import { mockWalletConnected } from "./wallet-mock";

test.describe("Activity Feed", () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnected(page);
    await page.goto("/activity");
  });

  test("activity feed card is visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Activity Feed" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows empty state when no events", async ({ page }) => {
    await expect(page.getByText("No activity yet")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("activity feed description is shown", async ({ page }) => {
    await expect(
      page.getByText(/Events and transactions will appear here/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("activity feed has live region for accessibility", async ({ page }) => {
    // Check the aria-live element exists
    const feed = page.locator("div[aria-live='polite']");
    await expect(feed.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Activity Feed - with mocked events", () => {
  test("shows events when localStorage has transactions", async ({ page }) => {
    await page.addInitScript(() => {
      // Pre-load a fake transaction into the transaction store
      const txState = {
        state: {
          transactions: [
            {
              hash: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
              status: "success",
              timestamp: Date.now(),
              label: "List NFT for Lease",
            },
          ],
        },
        version: 0,
      };
      localStorage.setItem(
        "leasenft-transactions",
        JSON.stringify(txState)
      );

      // Also set wallet state
      const walletState = {
        state: {
          address:
            "GBKXZRHSYQXGDYKQKQYGEXZQTG7FWSIVUDHRQDPVN3YE2W6LNMCZDHL",
          network: "testnet",
          isConnected: true,
          isConnecting: false,
          error: null,
        },
        version: 0,
      };
      localStorage.setItem(
        "leasenft-wallet-storage",
        JSON.stringify(walletState)
      );
    });

    await page.goto("/activity");

    // Should now show at least one activity item
    await expect(page.getByText("List NFT for Lease")).toBeVisible({
      timeout: 10_000,
    });
  });
});
