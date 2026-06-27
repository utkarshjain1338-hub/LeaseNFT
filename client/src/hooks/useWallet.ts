"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureKit } from "@/lib/stellar";
import { getNetworkConfig } from "@/lib/config";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { KitEventType } from "@creit.tech/stellar-wallets-kit/types";
import { useWalletStore } from "@/stores/walletStore";

// Horizon endpoint helpers
function getHorizonUrl(network: string): string {
  return network === "mainnet"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";
}

export function useWallet() {
  const {
    address,
    network,
    isConnected,
    isConnecting,
    error,
    setAddress,
    setNetwork,
    setConnected,
    setConnecting,
    setError,
    disconnect: storeDisconnect,
  } = useWalletStore();

  const [balance, setBalance] = useState<string | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const reconnectAttempted = useRef(false);

  // ---------------------------------------------------------------------------
  // Balance fetch
  // ---------------------------------------------------------------------------
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`${getHorizonUrl(network)}/accounts/${address}`);
      if (!res.ok) {
        setBalance(null);
        return;
      }
      const data = await res.json();
      const native = (data.balances as { asset_type: string; balance: string }[] | undefined)
        ?.find((b) => b.asset_type === "native");
      setBalance(native ? native.balance : null);
    } catch {
      setBalance(null);
    }
  }, [address, network]);

  // ---------------------------------------------------------------------------
  // Connect
  //
  // ROOT CAUSE OF FREEZE (fixed here):
  //   Radix UI Dialog calls hideOthers() on its content, which sets
  //   aria-hidden="true" on every sibling of document.body while the dialog
  //   is open. StellarWalletsKit.authModal() appends its <div> to document.body
  //   WHILE our dialog is still mounted. That div is immediately marked
  //   aria-hidden and pointer-events are blocked by the Radix RemoveScroll
  //   overlay — making the SDK modal visible but completely non-interactive.
  //
  // FIX: Close our dialog first (setWalletModalOpen(false)), wait two animation
  //   frames for Radix to unmount and for hideOthers() to be reverted, then
  //   call authModal(). Only set isConnecting AFTER the SDK modal returns (i.e.
  //   after the user actually picks a wallet), not before.
  // ---------------------------------------------------------------------------
  const connect = useCallback(async (closeOurModal: () => void) => {
    // 1. Close the Radix dialog immediately so hideOthers() gets undone.
    closeOurModal();

    // 2. Wait two rAF ticks — enough for Radix to flush its cleanup:
    //    first tick: React state update processed, Dialog begins unmounting
    //    second tick: aria-hidden reverted, RemoveScroll unmounted, scroll restored
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    // 3. Ensure the kit is initialized (idempotent).
    ensureKit();
    console.info("[LeaseNFT] Opening StellarWalletsKit authModal…");

    // 4. Now isConnecting starts — from this point, the SDK modal is live.
    setConnecting(true);
    setError(null);

    try {
      const expectedNetwork = getNetworkConfig().network;

      const result = await StellarWalletsKit.authModal();
      const { address: walletAddress } = result;

      console.info("[LeaseNFT] authModal resolved, address:", walletAddress?.slice(0, 8) + "…");

      // Validate the returned address
      if (!walletAddress || walletAddress.length < 56) {
        throw new Error("Invalid wallet address returned");
      }

      setAddress(walletAddress);
      setNetwork(expectedNetwork);
      setConnected(true);
    } catch (err: unknown) {
      // StellarWalletsKit throws plain objects (not Error instances) in several
      // cases. When the user closes the modal it throws:
      //   { code: -1, message: "The user closed the modal." }
      // We must not assume `err instanceof Error`.

      let msg = "Wallet connection failed";
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === "object") {
        const obj = err as Record<string, unknown>;
        if (typeof obj.message === "string" && obj.message) {
          msg = obj.message;
        } else if (typeof obj.error === "string" && obj.error) {
          msg = obj.error;
        } else if (typeof obj.code === "string" || typeof obj.code === "number") {
          msg = `Wallet error code: ${obj.code}`;
        } else if (Object.keys(obj).length === 0) {
          msg = "The user closed the modal.";
        }
      } else if (typeof err === "string") {
        msg = err;
      }

      console.error("[LeaseNFT] authModal error:", { message: msg, raw: err });

      const isUserDismiss =
        msg.includes("closed the modal") ||
        msg.includes("User cancelled") ||
        msg.includes("rejected") ||
        msg.includes("declined");

      if (isUserDismiss) {
        // Silent — user intentionally dismissed; no error to display
        setError(null);
      } else if (msg.includes("not found") || msg.includes("not installed")) {
        setError("Wallet not found. Please install Freighter or another Stellar wallet.");
      } else if (msg.includes("wrong network") || msg.includes("Network mismatch")) {
        setError("Network mismatch — please switch your wallet to Stellar Testnet.");
      } else if (msg.includes("Invalid wallet address")) {
        setError("Invalid wallet address returned. Please try again.");
      } else {
        setError(msg);
      }
    } finally {
      setConnecting(false);
    }
  }, [setAddress, setNetwork, setConnected, setConnecting, setError]);

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------
  const disconnect = useCallback(() => {
    try {
      StellarWalletsKit.disconnect();
    } catch {
      // Ignore — user is disconnecting regardless
    }
    storeDisconnect();
    setBalance(null);
    setError(null);
  }, [storeDisconnect, setError]);

  // ---------------------------------------------------------------------------
  // Reconnect on page refresh
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;
    if (!isConnected || !address) return;
    setTimeout(() => refreshBalance(), 0);
  }, [isConnected, address, refreshBalance]);

  // ---------------------------------------------------------------------------
  // Auto-refresh balance on connect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isConnected && address) {
      setTimeout(() => refreshBalance(), 0);
    }
  }, [isConnected, address, refreshBalance]);

  // ---------------------------------------------------------------------------
  // Listen for wallet state changes (account switch)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isConnected) return;

    ensureKit();
    const unsubscribe = StellarWalletsKit.on(
      KitEventType.STATE_UPDATED,
      (event: { payload?: { address?: string } }) => {
        const newAddress = event.payload?.address;
        if (newAddress && newAddress !== address) {
          setAddress(newAddress);
          refreshBalance();
        }
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isConnected, address, setAddress, refreshBalance]);

  return {
    address,
    network,
    isConnected,
    isConnecting,
    error,
    balance,
    walletModalOpen,
    setWalletModalOpen,
    connect,
    disconnect,
    refreshBalance,
    setError,
    setNetwork,
  };
}
