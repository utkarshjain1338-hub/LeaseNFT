/**
 * walletService.ts — Service layer for Stellar wallet management.
 *
 * Wraps the existing stellar.ts ensureKit with typed error handling
 * and a clean interface usable from hooks and service layers.
 *
 * Design note: StellarWalletsKit is a static singleton — modal opening
 * and wallet selection happen through the WalletModal UI component.
 * This service handles programmatic wallet state management.
 */

import { ensureKit } from "@/lib/stellar";
import { parseContractError, WalletNotConnectedError } from "@/lib/errors";

export { ensureKit };

/**
 * Initialize the wallet kit. Safe to call multiple times (idempotent).
 */
export function initWalletKit(): void {
  try {
    ensureKit();
  } catch (err) {
    throw parseContractError(err);
  }
}

/**
 * Disconnect the current wallet.
 * Since StellarWalletsKit uses session-based connections,
 * clearing our app state is the correct approach.
 */
export function disconnectWallet(): void {
  // Wallet disconnection is handled by the walletStore.disconnect() action.
  // This function exists as a service-layer hook point for future cleanup.
}

/**
 * Assert a wallet is connected, throwing WalletNotConnectedError if not.
 */
export function assertWalletConnected(
  address: string | null | undefined
): asserts address is string {
  if (!address) throw new WalletNotConnectedError();
}

/**
 * Format a Stellar address for display (shortened).
 */
export function shortenWalletAddress(
  address: string,
  chars = 6
): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
