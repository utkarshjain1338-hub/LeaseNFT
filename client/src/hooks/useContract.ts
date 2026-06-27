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
  toScValAddress,
} from "@/lib/stellar";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Listing, ActiveLease } from "@/types";

export function useContract() {
  const address = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const queryClient = useQueryClient();

  // Query hooks
  const useListing = (listingId: number) =>
    useQuery<Listing>({
      queryKey: ["listing", listingId],
      queryFn: async () => {
        const result = await readContract(
          "get_listing",
          [toScValU64(listingId)],
          address || undefined
        );
        const raw = result as Record<string, unknown>;
        return raw as unknown as Listing;
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
          const raw = result as Record<string, unknown>;
          return raw as unknown as ActiveLease;
        } catch {
          return null; // No active lease
        }
      },
      enabled: isConnected && listingId > 0,
    });

  // Mutations
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
      return callContract("list_nft", [
        toScValAddress(address),
        toScValString(tokenId),
        toScValAddress(tokenAddress),
        toScValI128(dailyRate),
        toScValU64(maxDuration),
      ], address, true);
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
      return callContract("lease_nft", [
        toScValAddress(address),
        toScValU64(listingId),
        toScValU64(durationDays),
      ], address, true);
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
  });

  const endLeaseMutation = useMutation({
    mutationFn: async (listingId: number) => {
      if (!address) throw new Error("Wallet not connected");
      return callContract("end_lease", [
        toScValAddress(address),
        toScValU64(listingId),
      ], address, true);
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
  });

  // Track transaction status
  const trackTransaction = useCallback(
    async (hash: string, label: string) => {
      try {
        const result = await waitForTransaction(hash);
        updateTransaction(hash, {
          status: result.status === "SUCCESS" ? "success" : "failed",
        });
      } catch {
        updateTransaction(hash, { status: "failed" });
      }
    },
    [updateTransaction]
  );

  return {
    useListing,
    useLease,
    initMutation,
    listNftMutation,
    leaseNftMutation,
    endLeaseMutation,
  };
}
