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
  return new Date(timestamp * 1000).toLocaleString();
}

export function isExpired(endTime: number): boolean {
  return Date.now() / 1000 > endTime;
}

export function getLeaseStatus(
  endTime: number
): "active" | "expired" | "none" {
  if (endTime === 0) return "none";
  return isExpired(endTime) ? "expired" : "active";
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    // Extract meaningful error from HostError
    if (msg.includes("HostError")) {
      const match = msg.match(/Error\(Contract, #(\d+)\)/);
      if (match) {
        const code = parseInt(match[1]);
        const errorMap: Record<number, string> = {
          1: "Already initialized",
          2: "Not found",
          3: "Unauthorized",
          4: "Already exists",
          5: "Listing is not active",
          6: "Duration exceeds maximum",
        };
        return errorMap[code] || `Contract error #${code}`;
      }
      return "Contract execution failed";
    }
    if (msg.includes("User rejected")) {
      return "Transaction was rejected";
    }
    if (msg.includes("insufficient")) {
      return "Insufficient balance";
    }
    if (msg.includes("wallet not found")) {
      return "Wallet not found";
    }
    return msg;
  }
  return "An unexpected error occurred";
}
