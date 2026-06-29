/**
 * notificationService.ts — Centralized toast notification wrapper.
 *
 * Design rationale:
 * - Components import `notify` instead of `toast` directly, making it easy
 *   to swap the underlying library or add analytics tracking.
 * - Provides typed helpers for common notification patterns.
 * - Explorer links are included automatically for transaction hashes.
 */

import { toast } from "sonner";
import { getExplorerUrl } from "@/lib/config";
import type { LeaseNFTError } from "@/lib/errors";

export interface TxNotificationOptions {
  hash: string;
  label: string;
}

export const notify = {
  /** Show a success toast with optional explorer link. */
  success(message: string, description?: string): void {
    toast.success(message, { description });
  },

  /** Show an error toast. */
  error(message: string, description?: string): void {
    toast.error(message, { description });
  },

  /** Show an info toast. */
  info(message: string, description?: string): void {
    toast.info(message, { description });
  },

  /** Show a warning toast. */
  warning(message: string, description?: string): void {
    toast.warning(message, { description });
  },

  /** Show a toast for a confirmed transaction with explorer link. */
  transactionSuccess(opts: TxNotificationOptions): void {
    const explorerUrl = getExplorerUrl("transaction", opts.hash);
    toast.success(`${opts.label} confirmed!`, {
      description: `Hash: ${opts.hash.slice(0, 16)}…`,
      action: {
        label: "View on Explorer",
        onClick: () => window.open(explorerUrl, "_blank"),
      },
      duration: 8000,
    });
  },

  /** Show a toast for a failed transaction. */
  transactionFailed(opts: TxNotificationOptions): void {
    const explorerUrl = getExplorerUrl("transaction", opts.hash);
    toast.error(`${opts.label} failed`, {
      description: `Hash: ${opts.hash.slice(0, 16)}…`,
      action: {
        label: "View on Explorer",
        onClick: () => window.open(explorerUrl, "_blank"),
      },
    });
  },

  /** Show a toast for a typed LeaseNFTError. */
  contractError(err: LeaseNFTError): void {
    // Different error types may warrant different toast variants
    if (err.kind === "cancelled") {
      toast.info(err.userMessage);
    } else if (err.kind === "network_error") {
      toast.error(err.userMessage, {
        description: "Check your internet connection and try again.",
        duration: 10_000,
      });
    } else {
      toast.error(err.userMessage);
    }
  },

  /** Show a transaction pending toast. Returns the toast ID for dismissal. */
  transactionPending(label: string): string | number {
    return toast.loading(`${label} — waiting for confirmation…`, {
      duration: Infinity,
    });
  },

  /** Dismiss a toast by ID. */
  dismiss(id: string | number): void {
    toast.dismiss(id);
  },
};
