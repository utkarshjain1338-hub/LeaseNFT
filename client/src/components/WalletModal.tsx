"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { Wallet, X } from "lucide-react";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
  const { connect, isConnecting, error, setError } = useWallet();
  const [walletOptions] = useState([
    { id: "freighter", name: "Freighter", icon: "🪐" },
    { id: "albedo", name: "Albedo", icon: "✨" },
    { id: "lobstr", name: "LOBSTR", icon: "🌐" },
    { id: "xbull", name: "xBull", icon: "🐂" },
    { id: "rabet", name: "Rabet", icon: "🔷" },
    { id: "hana", name: "Hana", icon: "🌸" },
    { id: "walletconnect", name: "WalletConnect", icon: "🔗" },
  ]);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open, setError]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a Stellar wallet to connect
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {walletOptions.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              className="flex items-center justify-between px-4 py-6 h-auto text-base"
              onClick={() => connect()}
              disabled={isConnecting}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">{wallet.icon}</span>
                <span>{wallet.name}</span>
              </span>
              {isConnecting && (
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              )}
            </Button>
          ))}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 flex items-start gap-2">
            <X className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          By connecting, you agree to the terms of service
        </p>
      </DialogContent>
    </Dialog>
  );
}
