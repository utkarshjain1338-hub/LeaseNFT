/**
 * wallet-mock.ts — Shared wallet mock for e2e tests.
 *
 * Injects a fake connected wallet state into the Zustand store via
 * localStorage manipulation before the page loads. This avoids any
 * real wallet extension dependency in tests.
 */

import type { Page } from "@playwright/test";

const MOCK_ADDRESS = "GBKXZRHSYQXGDYKQKQYGEXZQTG7FWSIVUDHRQDPVN3YE2W6LNMCZDHL";
const MOCK_NETWORK = "testnet";

/**
 * Inject a fake "connected" wallet state into localStorage before page load.
 * The Zustand `persist` middleware reads from localStorage on hydration.
 */
export async function mockWalletConnected(page: Page): Promise<void> {
  await page.addInitScript((args: { address: string; network: string }) => {
    const state = {
      state: {
        address: args.address,
        network: args.network,
        isConnected: true,
        isConnecting: false,
        error: null,
      },
      version: 0,
    };
    localStorage.setItem(
      "leasenft-wallet-storage",
      JSON.stringify(state)
    );
  }, { address: MOCK_ADDRESS, network: MOCK_NETWORK });
}

/**
 * Inject a disconnected wallet state (the default).
 */
export async function mockWalletDisconnected(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = {
      state: {
        address: "",
        network: "testnet",
        isConnected: false,
        isConnecting: false,
        error: null,
      },
      version: 0,
    };
    localStorage.setItem(
      "leasenft-wallet-storage",
      JSON.stringify(state)
    );
  });
}

export { MOCK_ADDRESS, MOCK_NETWORK };
