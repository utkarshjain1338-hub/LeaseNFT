"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  callContract,
  readContract,
  waitForTransaction,
  toScValString,
  toScValAddress,
  toScValU64,
  toScValI128,
} from "@/lib/stellar";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useEventStore } from "@/stores/eventStore";
import type { Listing, ActiveLease } from "@/types";

export interface ListingWithLease {
  id: number;
  listing: Listing;
  lease: ActiveLease | null;
}

/**
 * Classify an error thrown by callContract into one of the canonical
 * error categories the UI knows how to display (BUG 6).
 */
function classifyError(err: unknown): string {
  if (!(err instanceof Error)) return "An unexpected error occurred";
  const msg = err.message;

  if (msg === "Transaction cancelled" || msg.includes("cancelled") || msg.includes("declined") || msg.includes("rejected") || msg.includes("closed the modal")) {
    return "Transaction cancelled";
  }
  if (msg.includes("Listing not found") || msg.includes("#2") || msg.includes("Error(Contract, #2)")) {
    return "Listing not found";
  }
  if (msg.includes("already leased") || msg.includes("not active") || msg.includes("#5") || msg.includes("Error(Contract, #5)")) {
    return "Listing already leased";
  }
  if (msg.includes("Duration exceeds") || msg.includes("maximum allowed") || msg.includes("#6") || msg.includes("Error(Contract, #6)")) {
    return "Duration exceeds maximum";
  }
  if (msg.includes("already initialized") || msg.includes("#1") || msg.includes("Error(Contract, #1)")) {
    return "Contract already initialized";
  }
  if (msg.includes("Unauthorized") || msg.includes("#3") || msg.includes("Error(Contract, #3)")) {
    return "Unauthorized — you are not the owner or renter";
  }
  if (msg.includes("already exists") || msg.includes("#4") || msg.includes("Error(Contract, #4)")) {
    return "Listing already exists";
  }
  if (msg.includes("Network mismatch") || msg.includes("wrong network")) {
    return "Network mismatch — please switch your wallet to Testnet.";
  }
  if (msg.includes("RPC unavailable")) {
    return "RPC unavailable — please check your internet connection or try again later.";
  }
  if (msg.includes("Wallet not connected")) {
    return "Please connect a wallet before continuing.";
  }
  if (msg.includes("Insufficient balance") || msg.includes("insufficient")) {
    return "Insufficient XLM balance to complete this transaction.";
  }

  return msg.replace(/Error\(Contract, #\d+\)/g, "Contract execution error").replace(/HostError: /g, "");
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
          addEvent({
            id: hash,
            type: "transaction",
            timestamp: Math.floor(Date.now() / 1000),
            wallet: address,
            action: label,
          });
          queryClient.invalidateQueries({ queryKey: ["listings"] });
          queryClient.invalidateQueries({ queryKey: ["listing"] });
          queryClient.invalidateQueries({ queryKey: ["lease"] });
        }
      } catch {
        updateTransaction(hash, { status: "failed" });
      }
    },
    [updateTransaction, addEvent, address, queryClient]
  );

  // ---------------------------------------------------------------------------
  // Query hooks
  // ---------------------------------------------------------------------------

  /**
   * Automatic listing discovery (FIX 2).
   * Reads total listing count from get_listing_count and iterates 1...count.
   */
  const useListings = () =>
    useQuery<ListingWithLease[]>({
      queryKey: ["listings"],
      queryFn: async () => {
        const results: ListingWithLease[] = [];
        let count = 0;
        try {
          const countRes = await readContract(
            "get_listing_count",
            [],
            address || undefined
          );
          if (countRes !== undefined && countRes !== null) {
            count = Number(countRes);
          }
        } catch {
          return results;
        }

        for (let id = 1; id <= count; id++) {
          try {
            const res = await readContract(
              "get_listing",
              [toScValU64(id)],
              address || undefined
            );
            if (!res) continue;
            const listing = res as unknown as Listing;

            let lease: ActiveLease | null = null;
            try {
              const leaseRes = await readContract(
                "get_lease",
                [toScValU64(id)],
                address || undefined
              );
              if (leaseRes) lease = leaseRes as unknown as ActiveLease;
            } catch {
              lease = null;
            }

            results.push({ id, listing, lease });
          } catch {
            // skip reading failed listing
          }
        }
        return results;
      },
      enabled: isConnected,
      refetchInterval: 15000,
    });

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
          return null;
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
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      queryClient.invalidateQueries({ queryKey: ["lease"] });
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
      // FIX 1: use toScValAddress(tokenAddress) instead of toScValU64(parseInt(...))
      return callContract(
        "list_nft",
        [
          toScValString(tokenId),
          toScValAddress(tokenAddress),
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
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      queryClient.invalidateQueries({ queryKey: ["lease"] });
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
      queryClient.invalidateQueries({ queryKey: ["listings"] });
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
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      queryClient.invalidateQueries({ queryKey: ["lease"] });
    },
    onError: (err: unknown) => {
      console.error("[LeaseNFT] endLeaseMutation error:", err);
      throw new Error(classifyError(err));
    },
  });

  return {
    useListings,
    useListing,
    useLease,
    initMutation,
    listNftMutation,
    leaseNftMutation,
    endLeaseMutation,
  };
}
