import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatTimestamp(timestamp: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isExpired(endTime: number): boolean {
  return Date.now() / 1000 > endTime;
}

export function getLeaseStatus(endTime: number): "active" | "expired" | "none" {
  if (endTime === 0) return "none";
  return isExpired(endTime) ? "expired" : "active";
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Parse a contract/network error into a user-friendly message.
 * Never exposes raw stack traces to the UI.
 */
export function parseContractError(error: unknown): string {
  if (!(error instanceof Error)) return "An unexpected error occurred";
  const msg = error.message;

  // Already mapped by classifyError or stellar.ts
  if (msg === "Transaction cancelled") return "Transaction cancelled";
  if (msg.includes("RPC unavailable")) return msg;
  if (msg.includes("Wallet not connected"))
    return "Please connect a wallet before continuing.";
  if (msg.includes("Network mismatch"))
    return "Network mismatch — please switch your wallet to Stellar Testnet.";
  if (msg.includes("Insufficient balance") || msg.includes("insufficient"))
    return "Insufficient XLM balance to complete this transaction.";

  // Legacy HostError parsing (fallback)
  if (msg.includes("HostError")) {
    const match = msg.match(/Error\(Contract, #(\d+)\)/);
    if (match) {
      const code = parseInt(match[1]);
      const errorMap: Record<number, string> = {
        1: "Contract already initialized",
        2: "Listing not found",
        3: "Unauthorized — you are not the owner or renter",
        4: "Listing already exists",
        5: "Listing is not active (already leased)",
        6: "Duration exceeds the maximum allowed",
      };
      return errorMap[code] ?? `Contract error #${code}`;
    }
    return "Contract execution failed";
  }

  return msg;
}
