/**
 * errors.ts — Typed error class hierarchy for LeaseNFT.
 *
 * Design rationale:
 * - Typed classes allow UI components to discriminate error types without string matching.
 * - A centralized parser (`parseContractError`) maps all Soroban/wallet/RPC errors
 *   to one of these classes, ensuring raw exceptions never leak to the UI.
 * - Each class carries a `userMessage` that is safe to display directly.
 */

// ─── Base ─────────────────────────────────────────────────────────────────────

export abstract class LeaseNFTError extends Error {
  abstract readonly kind: string;
  abstract readonly userMessage: string;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "LeaseNFTError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

// ─── Concrete Types ────────────────────────────────────────────────────────────

/** User cancelled the transaction in their wallet. */
export class TransactionCancelledError extends LeaseNFTError {
  readonly kind = "cancelled" as const;
  readonly userMessage = "Transaction cancelled";
  constructor() {
    super("Transaction cancelled by user");
    this.name = "TransactionCancelledError";
  }
}

/** The listing ID does not exist on-chain. */
export class ListingNotFoundError extends LeaseNFTError {
  readonly kind = "listing_not_found" as const;
  readonly userMessage = "Listing not found";
  constructor(listingId?: number) {
    super(listingId ? `Listing #${listingId} not found` : "Listing not found");
    this.name = "ListingNotFoundError";
  }
}

/** The listing is already leased and not available. */
export class ListingNotActiveError extends LeaseNFTError {
  readonly kind = "listing_not_active" as const;
  readonly userMessage = "Listing is already leased";
  constructor() {
    super("Listing is not active");
    this.name = "ListingNotActiveError";
  }
}

/** Requested lease duration exceeds the listing's maximum. */
export class DurationExceedsMaxError extends LeaseNFTError {
  readonly kind = "duration_exceeds_max" as const;
  readonly userMessage = "Duration exceeds the listing's maximum";
  constructor() {
    super("Duration exceeds max");
    this.name = "DurationExceedsMaxError";
  }
}

/** Caller is not authorized (not owner or renter). */
export class UnauthorizedError extends LeaseNFTError {
  readonly kind = "unauthorized" as const;
  readonly userMessage = "You are not authorized to perform this action";
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Contract is already initialized. */
export class AlreadyInitializedError extends LeaseNFTError {
  readonly kind = "already_initialized" as const;
  readonly userMessage = "Contract already initialized";
  constructor() {
    super("Already initialized");
    this.name = "AlreadyInitializedError";
  }
}

/** Wallet is not connected. */
export class WalletNotConnectedError extends LeaseNFTError {
  readonly kind = "wallet_not_connected" as const;
  readonly userMessage = "Please connect a wallet to continue";
  constructor() {
    super("Wallet not connected");
    this.name = "WalletNotConnectedError";
  }
}

/** Wallet is on the wrong network. */
export class NetworkMismatchError extends LeaseNFTError {
  readonly kind = "network_mismatch" as const;
  readonly userMessage: string;
  constructor(walletNetwork: string, expectedNetwork: string) {
    super(`Network mismatch: wallet=${walletNetwork}, expected=${expectedNetwork}`);
    this.name = "NetworkMismatchError";
    this.userMessage = `Network mismatch — please switch your wallet to ${expectedNetwork}`;
  }
}

/** RPC or network connectivity issue. */
export class NetworkError extends LeaseNFTError {
  readonly kind = "network_error" as const;
  readonly userMessage = "Network unavailable — please try again";
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "NetworkError";
  }
}

/** Wallet signing failed. */
export class WalletSigningError extends LeaseNFTError {
  readonly kind = "wallet_signing" as const;
  readonly userMessage: string;
  constructor(message: string) {
    super(message);
    this.name = "WalletSigningError";
    this.userMessage = `Wallet error: ${message}`;
  }
}

/** Unclassified contract error. */
export class ContractError extends LeaseNFTError {
  readonly kind = "contract_error" as const;
  readonly userMessage: string;
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
    this.userMessage = message
      .replace(/Error\(Contract, #\d+\)/g, "Contract execution error")
      .replace(/HostError: /g, "");
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Centralized error parser.
 *
 * Converts any unknown thrown value into a typed `LeaseNFTError` subclass.
 * Call this in every catch block — never expose raw errors to the UI.
 *
 * @example
 * try {
 *   await callContract(...)
 * } catch (err) {
 *   throw parseContractError(err);
 * }
 */
export function parseContractError(err: unknown): LeaseNFTError {
  if (err instanceof LeaseNFTError) return err;

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("user declined") || lower.includes("user rejected") ||
      lower.includes("cancelled") || lower.includes("rejected") ||
      lower.includes("closed") || msg === "Transaction cancelled") {
    return new TransactionCancelledError();
  }
  if (lower.includes("listing not found") || lower.includes("#2") ||
      lower.includes("error(contract, #2)")) {
    return new ListingNotFoundError();
  }
  if (lower.includes("not active") || lower.includes("already leased") ||
      lower.includes("#5") || lower.includes("error(contract, #5)")) {
    return new ListingNotActiveError();
  }
  if (lower.includes("duration exceeds") || lower.includes("maximum allowed") ||
      lower.includes("#6") || lower.includes("error(contract, #6)")) {
    return new DurationExceedsMaxError();
  }
  if (lower.includes("unauthorized") || lower.includes("#3") ||
      lower.includes("error(contract, #3)")) {
    return new UnauthorizedError();
  }
  if (lower.includes("already initialized") || lower.includes("#1") ||
      lower.includes("error(contract, #1)")) {
    return new AlreadyInitializedError();
  }
  if (lower.includes("wallet not connected")) {
    return new WalletNotConnectedError();
  }
  if (lower.includes("network mismatch") || lower.includes("wrong network")) {
    return new NetworkMismatchError("unknown", "testnet");
  }
  if (lower.includes("rpc unavailable") || lower.includes("network error") ||
      lower.includes("timeout") || lower.includes("fetch failed")) {
    return new NetworkError(msg, err instanceof Error ? err : undefined);
  }
  if (lower.includes("signing failed") || lower.includes("wallet error")) {
    return new WalletSigningError(msg);
  }

  return new ContractError(msg);
}
