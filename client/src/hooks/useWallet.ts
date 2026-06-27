"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureKit } from "@/lib/stellar";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { KitEventType } from "@creit.tech/stellar-wallets-kit/types";
import { useWalletStore } from "@/stores/walletStore";

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

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      ensureKit();

      // Open wallet selection modal
      const result = await StellarWalletsKit.authModal();
      const { address: walletAddress } = result;
      setAddress(walletAddress);
      setConnected(true);
      setWalletModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Wallet connection failed";
      if (
        msg.includes("closed the modal") ||
        msg.includes("User cancelled") ||
        msg.includes("rejected")
      ) {
        setError("User rejected the connection request");
      } else if (msg.includes("not found") || msg.includes("not installed")) {
        setError("Wallet not found. Please install Freighter or another Stellar wallet.");
      } else {
        setError(msg);
      }
    } finally {
      setConnecting(false);
    }
  }, [setAddress, setConnected, setConnecting, setError]);

  const disconnect = useCallback(() => {
    StellarWalletsKit.disconnect();
    storeDisconnect();
    setBalance(null);
    setError(null);
  }, [storeDisconnect, setError]);

  // Fetch XLM balance via Horizon (public testnet endpoint)
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const horizonUrl =
        network === "mainnet"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org";
      const res = await fetch(
        `${horizonUrl}/accounts/${address}`
      );
      if (res.ok) {
        const data = await res.json();
        const native = data.balances?.find(
          (b: { asset_type: string }) => b.asset_type === "native"
        );
        if (native) {
          setBalance(native.balance);
        }
      }
    } catch {
      setBalance(null);
    }
  }, [address, network]);

  useEffect(() => {
    if (isConnected && address) {
      refreshBalance();
    }
  }, [isConnected, address, refreshBalance]);

  // Listen for wallet state changes
  useEffect(() => {
    if (!isConnected) return;

    ensureKit();
    const unsubscribe = StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event: any) => {
      if (event.payload?.address && event.payload.address !== address) {
        setAddress(event.payload.address);
        refreshBalance();
      }
    });

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
  };
}
