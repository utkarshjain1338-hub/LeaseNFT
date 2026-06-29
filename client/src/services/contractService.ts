/**
 * contractService.ts — Service layer for all Soroban contract interactions.
 *
 * Design rationale:
 * - Extracts all blockchain logic out of React hooks and UI components.
 * - Provides a clean interface (plain async functions) that can be tested,
 *   mocked, and reused without React dependency.
 * - All errors are parsed through `parseContractError` before propagation,
 *   guaranteeing typed errors reach the UI.
 *
 * Architecture:
 *   UI Component → useContract hook → contractService → stellar.ts → RPC
 */

import {
  callContract,
  readContract,
  waitForTransaction,
  toScValString,
  toScValAddress,
  toScValU64,
  toScValI128,
} from "@/lib/stellar";
import { parseContractError } from "@/lib/errors";
import type { Listing, ActiveLease } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListingWithLease {
  id: number;
  listing: Listing;
  lease: ActiveLease | null;
}

export interface ListNftParams {
  tokenId: string;
  tokenAddress: string;
  dailyRate: string;
  maxDuration: number;
}

export interface LeaseNftParams {
  listingId: number;
  durationDays: number;
}

export interface TransactionResult {
  hash: string;
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/** Read total listing count from the contract. Returns 0 on error. */
export async function fetchListingCount(address?: string): Promise<number> {
  try {
    const result = await readContract("get_listing_count", [], address);
    return result !== undefined && result !== null ? Number(result) : 0;
  } catch {
    return 0;
  }
}

/** Read a single listing by ID. */
export async function fetchListing(
  listingId: number,
  address?: string
): Promise<Listing> {
  try {
    const result = await readContract(
      "get_listing",
      [toScValU64(listingId)],
      address
    );
    return result as unknown as Listing;
  } catch (err) {
    throw parseContractError(err);
  }
}

/** Read the active lease for a listing. Returns null if none exists. */
export async function fetchLease(
  listingId: number,
  address?: string
): Promise<ActiveLease | null> {
  try {
    const result = await readContract(
      "get_lease",
      [toScValU64(listingId)],
      address
    );
    return result as unknown as ActiveLease;
  } catch {
    return null;
  }
}

/** Fetch all listings with their lease status in one batch operation. */
export async function fetchAllListings(
  address?: string
): Promise<ListingWithLease[]> {
  const count = await fetchListingCount(address);
  const results: ListingWithLease[] = [];

  for (let id = 1; id <= count; id++) {
    try {
      const listing = await fetchListing(id, address);
      if (!listing) continue;
      const lease = await fetchLease(id, address);
      results.push({ id, listing, lease });
    } catch {
      // Skip listings that fail to load — don't break the whole feed
    }
  }
  return results;
}

// ─── Write Operations ─────────────────────────────────────────────────────────

/** Initialize the contract (one-time setup). Returns transaction hash. */
export async function initContract(address: string): Promise<string> {
  try {
    return await callContract("init", [], address, false);
  } catch (err) {
    throw parseContractError(err);
  }
}

/**
 * List an NFT for lease. Returns transaction hash.
 *
 * Note: The caller's address is prepended automatically by callContract
 * when needsAuth=true. Do NOT pass it in args.
 */
export async function listNft(
  params: ListNftParams,
  address: string
): Promise<string> {
  try {
    return await callContract(
      "list_nft",
      [
        toScValString(params.tokenId),
        toScValAddress(params.tokenAddress),
        toScValI128(params.dailyRate),
        toScValU64(params.maxDuration),
      ],
      address,
      true
    );
  } catch (err) {
    throw parseContractError(err);
  }
}

/**
 * Lease an NFT for N days. Returns transaction hash.
 * Triggers cross-contract call to Treasury if treasury is registered.
 */
export async function leaseNft(
  params: LeaseNftParams,
  address: string
): Promise<string> {
  try {
    return await callContract(
      "lease_nft",
      [toScValU64(params.listingId), toScValU64(params.durationDays)],
      address,
      true
    );
  } catch (err) {
    throw parseContractError(err);
  }
}

/** End an active lease. Returns transaction hash. */
export async function endLease(
  listingId: number,
  address: string
): Promise<string> {
  try {
    return await callContract(
      "end_lease",
      [toScValU64(listingId)],
      address,
      true
    );
  } catch (err) {
    throw parseContractError(err);
  }
}

/**
 * Poll until a transaction is confirmed on-chain.
 * Returns true if succeeded, false if failed.
 */
export async function awaitTransaction(hash: string): Promise<boolean> {
  try {
    const result = await waitForTransaction(hash);
    return result.status === "SUCCESS";
  } catch {
    return false;
  }
}
