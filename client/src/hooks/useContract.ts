"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  callContract,
  readContract,
  waitForTransaction,
  toScValString,
  toScValU64,
  toScValI128,
} from "@/lib/stellar";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useEventStore } from "@/stores/eventStore";
import type { Listing, ActiveLease } from "@/types";

/**
 * Classify an error thrown by callContract into one of the canonical
 * error categories the UI knows how to display.
 */
function classifyError(err: unknown): string {
  if (!(err instanceof Error)) return "An unexpected error occurred";
  const msg = err.message;

  if (msg === "Transaction cancelled") return "Transaction cancelled";
  if (msg.includes("RPC unavailable")) return msg;
  if (msg.includes("Wallet not connected")) return "Please connect a wallet before continuing.";
  if (msg.includes("Insufficient balance") || msg.includes("insufficient")) return "Insufficient XLM balance to complete this transaction.";
  if (msg.includes("Network mismatch") || msg.includes("wrong network")) {
    return "Network mismatch — please switch your wallet to Testnet.";
  }
  return msg;
}

export function useContract() {
  const address = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const addEvent = useEventStore((s) => s.addEvent);
  const queryClient = useQueryClient();

  /** Poll until the transaction is confirmed, then update the store. */
  const trackTransaction = useCallback(
    async (hash: string, label: string) => {
      try {
        const result = await waitForTransaction(hash);
        const succeeded = result.status === "SUCCESS";
        updateTransaction(hash, {
          status: succeeded ? "success" : "failed",
        });
        if (succeeded) {
          // Emit a synthetic event for the activity feed
          addEvent({
            id: hash,
            type: "transaction",
            timestamp: Math.floor(Date.now() / 1000),
            wallet: address,
            action: label,
          });
        }
      } catch {
        updateTransaction(hash, { status: "failed" });
      }
    },
    [updateTransaction, addEvent, address]
  );

  // ---------------------------------------------------------------------------
  // Query hooks
  // ---------------------------------------------------------------------------

  const useListing = (listingId: number) =>
    useQuery<Listing>({
      queryKey: ["listing", listingId],
      queryFn: async () => {
        const result = await readContract(
          "get_listing",
          [toScValU64(listingId)],
          address || undefined
        );
        return result as unknown as Listing;
      },
      enabled: isConnected && listingId > 0,
    });

  const useLease = (listingId: number) =>
    useQuery<ActiveLease | null>({
      queryKey: ["lease", listingId],
      queryFn: async () => {
        try {
          const result = await readContract(
            "get_lease",
            [toScValU64(listingId)],
            address || undefined
          );
          return result as unknown as ActiveLease;
        } catch {
          return null; // No active lease
        }
      },
      enabled: isConnected && listingId > 0,
    });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const initMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Wallet not connected");
      // init() takes no args and does not require auth per the contract signature
      return callContract("init", [], address, false);
    },
    onSuccess: (hash) => {
      addTransaction({
        hash,
        status: "pending",
        timestamp: Date.now(),
        label: "Initialize Contract",
      });
      trackTransaction(hash, "Initialize Contract");
    },
    onError: (err: unknown) => {
      console.error("[LeaseNFT] initMutation error:", err);
      throw new Error(classifyError(err));
    },
  });

  const listNftMutation = useMutation({
    mutationFn: async ({
      tokenId,
      tokenAddress,
      dailyRate,
      maxDuration,
    }: {
      tokenId: string;
      tokenAddress: string;
      dailyRate: string;
      maxDuration: number;
    }) => {
      if (!address) throw new Error("Wallet not connected");
      // list_nft(owner, token_id, token_address, daily_rate, max_duration)
      // callContract prepends `address` automatically when needsAuth=true
      return callContract(
        "list_nft",
        [
          toScValString(tokenId),
          toScValU64(parseInt(tokenAddress) || 0), // token_address is an Address in the contract
          toScValI128(dailyRate),
          toScValU64(maxDuration),
        ],
        address,
        true
      );
    },
    onSuccess: (hash) => {
      addTransaction({
        hash,
        status: "pending",
        timestamp: Date.now(),
        label: "List NFT for Lease",
      });
      trackTransaction(hash, "List NFT for Lease");
      queryClient.invalidateQueries({ queryKey: ["listing"] });
    },
    onError: (err: unknown) => {
      console.error("[LeaseNFT] listNftMutation error:", err);
      throw new Error(classifyError(err));
    },
  });

  const leaseNftMutation = useMutation({
    mutationFn: async ({
      listingId,
      durationDays,
    }: {
      listingId: number;
      durationDays: number;
    }) => {
      if (!address) throw new Error("Wallet not connected");
      // lease_nft(renter, listing_id, duration_days)
      // callContract prepends `address` automatically when needsAuth=true
      return callContract(
        "lease_nft",
        [toScValU64(listingId), toScValU64(durationDays)],
        address,
        true
      );
    },
    onSuccess: (hash) => {
      addTransaction({
        hash,
        status: "pending",
        timestamp: Date.now(),
        label: "Lease NFT",
      });
      trackTransaction(hash, "Lease NFT");
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      queryClient.invalidateQueries({ queryKey: ["lease"] });
    },
    onError: (err: unknown) => {
      console.error("[LeaseNFT] leaseNftMutation error:", err);
      throw new Error(classifyError(err));
    },
  });

  const endLeaseMutation = useMutation({
    mutationFn: async (listingId: number) => {
      if (!address) throw new Error("Wallet not connected");
      // end_lease(caller, listing_id)
      // callContract prepends `address` automatically when needsAuth=true
      return callContract(
        "end_lease",
        [toScValU64(listingId)],
        address,
        true
      );
    },
    onSuccess: (hash) => {
      addTransaction({
        hash,
        status: "pending",
        timestamp: Date.now(),
        label: "End Lease",
      });
      trackTransaction(hash, "End Lease");
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      queryClient.invalidateQueries({ queryKey: ["lease"] });
    },
    onError: (err: unknown) => {
      console.error("[LeaseNFT] endLeaseMutation error:", err);
      throw new Error(classifyError(err));
    },
  });

  return {
    useListing,
    useLease,
    initMutation,
    listNftMutation,
    leaseNftMutation,
    endLeaseMutation,
  };
}
