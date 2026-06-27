"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";
import { Wallet, X, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WALLET_OPTIONS = [
  {
    id: "freighter",
    name: "Freighter",
    icon: "🪐",
    description: "Browser extension by SDF",
  },
  {
    id: "albedo",
    name: "Albedo",
    icon: "✨",
    description: "Web-based signing service",
  },
  {
    id: "lobstr",
    name: "LOBSTR",
    icon: "🌐",
    description: "Mobile & web wallet",
  },
  {
    id: "xbull",
    name: "xBull",
    icon: "🐂",
    description: "Feature-rich Stellar wallet",
  },
  {
    id: "rabet",
    name: "Rabet",
    icon: "🔷",
    description: "Browser extension wallet",
  },
  {
    id: "hana",
    name: "Hana",
    icon: "🌸",
    description: "Stellar mobile wallet",
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    icon: "🔗",
    description: "Connect via QR code",
  },
] as const;

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
  const {
    address,
    network,
    isConnected,
    balance,
    error,
    connect,
    disconnect,
    refreshBalance,
    setError,
  } = useWallet();

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open, setError]);

  const handleDisconnect = () => {
    disconnect();
    onOpenChange(false);
  };

  /**
   * When a wallet option is clicked:
   * - Pass `() => onOpenChange(false)` so connect() can close OUR dialog first,
   *   wait for Radix's aria-hidden cleanup, then open the SDK modal.
   * - Do NOT disable the buttons with isConnecting — loading state only begins
   *   after the SDK modal is open, so there is no "pending" state in this dialog.
   */
  const handleWalletClick = () => {
    connect(() => onOpenChange(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        aria-labelledby="wallet-modal-title"
        aria-describedby="wallet-modal-desc"
      >
        <DialogHeader>
          <DialogTitle
            id="wallet-modal-title"
            className="flex items-center gap-2"
          >
            <Wallet className="h-5 w-5" aria-hidden="true" />
            {isConnected ? "Wallet Connected" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription id="wallet-modal-desc">
            {isConnected
              ? "Your Stellar wallet is connected to LeaseNFT."
              : "Choose a Stellar wallet to connect to LeaseNFT on Testnet."}
          </DialogDescription>
        </DialogHeader>

        {isConnected && address ? (
          /* ── Connected state ───────────────────────────────────────────── */
          <div className="space-y-4 py-2" role="region" aria-label="Connected wallet info">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Address</span>
                <span className="font-mono text-sm font-medium" title={address}>
                  {shortenAddress(address, 8)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Network</span>
                <Badge
                  variant={network === "mainnet" ? "success" : "warning"}
                  className="uppercase text-xs"
                >
                  {network || "testnet"}
                </Badge>
              </div>
              {balance && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="font-semibold">
                    {parseFloat(balance).toFixed(4)} XLM
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={refreshBalance}
                aria-label="Refresh XLM balance"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 gap-2"
                onClick={handleDisconnect}
                aria-label="Disconnect wallet"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          /* ── Connect state — wallet list ───────────────────────────────── */
          <div className="space-y-3 py-2">
            {/*
              NOTE: buttons are NOT disabled here.
              isConnecting only becomes true after the SDK modal opens
              (i.e. after this dialog is already closed), so disabling
              these buttons on isConnecting would freeze the UI with no
              visible SDK modal.
            */}
            <div
              className="grid gap-2"
              role="list"
              aria-label="Available wallets"
            >
              {WALLET_OPTIONS.map((wallet) => (
                <Button
                  key={wallet.id}
                  id={`wallet-option-${wallet.id}`}
                  variant="outline"
                  className="flex items-center justify-between px-4 py-5 h-auto text-base hover:border-primary/50 transition-colors"
                  onClick={handleWalletClick}
                  role="listitem"
                  aria-label={`Connect with ${wallet.name}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden="true">
                      {wallet.icon}
                    </span>
                    <span className="flex flex-col text-left">
                      <span className="font-medium">{wallet.name}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {wallet.description}
                      </span>
                    </span>
                  </span>
                </Button>
              ))}
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="bg-destructive/10 text-destructive text-sm rounded-md p-3 flex items-start gap-2"
              >
                <AlertTriangle
                  className="h-4 w-4 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
                <button
                  className="ml-auto shrink-0 hover:opacity-70"
                  onClick={() => setError(null)}
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Selecting a wallet will open the Stellar Wallets Kit. Ensure you
              are on Stellar Testnet.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
