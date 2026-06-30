"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";
import { shortenAddress, formatTimestamp } from "@/lib/utils";
import { toast } from "sonner";
import { getExplorerUrl } from "@/lib/config";
import {
  Plus,
  RefreshCw,
  Package,
  Coins,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------
function validateAddress(addr: string): string | null {
  if (!addr.trim()) return "Address is required";
  if (addr.length < 56 || !addr.startsWith("C")) {
    return "Must be a valid Stellar contract address (starts with C, 56+ chars)";
  }
  return null;
}

function validateTokenId(id: string): string | null {
  if (!id.trim()) return "Token ID is required";
  return null;
}

function validatePositiveNumber(val: string, field: string): string | null {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return `${field} must be a positive number`;
  return null;
}

// ---------------------------------------------------------------------------
// Reusable error banner
// ---------------------------------------------------------------------------
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-md p-3 text-sm"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction result banner
// ---------------------------------------------------------------------------
function TxResult({ hash, status }: { hash: string; status: string }) {
  const explorerUrl = getExplorerUrl("transaction", hash);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 rounded-md p-3 text-sm ${
        status === "success"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
    >
      {status === "pending" && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      )}
      <span className="flex-1 truncate font-mono text-xs">{shortenAddress(hash, 8)}</span>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View transaction on Stellar Explorer"
        className="shrink-0 hover:opacity-70"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function Contract() {
  const { address, isConnected, network, setWalletModalOpen } = useWallet();
  const {
    useListings,
    initMutation,
    listNftMutation,
    leaseNftMutation,
    endLeaseMutation,
  } = useContract();

  // Form state for Listing NFT
  const [listForm, setListForm] = useState({
    tokenId: "",
    tokenAddress: "",
    dailyRate: "",
    maxDuration: "30",
  });

  // Per-card duration state for Lease action (BUG 3: no manual listing ID input)
  const [leaseDurations, setLeaseDurations] = useState<Record<number, string>>({});

  // Tx hash banners
  const [initHash, setInitHash] = useState<string | null>(null);
  const [listHash, setListHash] = useState<string | null>(null);
  const [leaseHash, setLeaseHash] = useState<string | null>(null);
  const [endHash, setEndHash] = useState<string | null>(null);

  // Automatic listing discovery query (BUG 2)
  const { data: listings = [], isLoading: listingsLoading } = useListings();

  // ---------------------------------------------------------------------------
  // Network guard
  // ---------------------------------------------------------------------------
  const isWrongNetwork = network && network !== "testnet" && network !== "";

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleInit = async () => {
    try {
      const hash = await initMutation.mutateAsync();
      setInitHash(hash);
      toast.success("Contract initialized successfully!", {
        description: `Hash: ${hash.slice(0, 16)}…`,
        action: {
          label: "View",
          onClick: () => window.open(getExplorerUrl("transaction", hash), "_blank"),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    }
  };

  const handleListNft = async () => {
    const errors = [
      validateTokenId(listForm.tokenId),
      validateAddress(listForm.tokenAddress),
      validatePositiveNumber(listForm.dailyRate, "Daily rate"),
      validatePositiveNumber(listForm.maxDuration, "Max duration"),
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error("Invalid input", { description: errors[0]! });
      return;
    }

    try {
      const hash = await listNftMutation.mutateAsync({
        tokenId: listForm.tokenId,
        tokenAddress: listForm.tokenAddress,
        dailyRate: listForm.dailyRate,
        maxDuration: parseInt(listForm.maxDuration),
      });
      setListHash(hash);
      toast.success("NFT listed for lease and confirmed on-chain!", {
        description: `Hash: ${hash.slice(0, 16)}…`,
        action: {
          label: "View",
          onClick: () => window.open(getExplorerUrl("transaction", hash), "_blank"),
        },
      });
      setListForm({ tokenId: "", tokenAddress: "", dailyRate: "", maxDuration: "30" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    }
  };

  const handleLeaseNft = async (listingId: number) => {
    const durationStr = leaseDurations[listingId] ?? "7";
    const durationErr = validatePositiveNumber(durationStr, "Duration");

    if (durationErr) {
      toast.error("Invalid input", { description: durationErr });
      return;
    }

    try {
      const hash = await leaseNftMutation.mutateAsync({
        listingId,
        durationDays: parseInt(durationStr),
      });
      setLeaseHash(hash);
      toast.success("NFT leased successfully!", {
        description: `Hash: ${hash.slice(0, 16)}…`,
        action: {
          label: "View",
          onClick: () => window.open(getExplorerUrl("transaction", hash), "_blank"),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    }
  };

  const handleEndLease = async (listingId: number) => {
    try {
      const hash = await endLeaseMutation.mutateAsync(listingId);
      setEndHash(hash);
      toast.success("Lease ended successfully!", {
        description: `Hash: ${hash.slice(0, 16)}…`,
        action: {
          label: "View",
          onClick: () => window.open(getExplorerUrl("transaction", hash), "_blank"),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    }
  };

  // ---------------------------------------------------------------------------
  // Not connected state
  // ---------------------------------------------------------------------------
  if (!isConnected) {
    return (
      <Card role="region" aria-label="Wallet required">
        <CardHeader className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground" aria-hidden="true" />
          <CardTitle>Wallet Required</CardTitle>
          <CardDescription>
            Please connect a wallet before continuing.
          </CardDescription>
          <div className="pt-4">
            <Button
              onClick={() => setWalletModalOpen(true)}
              aria-label="Open wallet connection modal"
            >
              Connect Wallet
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const isAnyLoading =
    initMutation.isPending ||
    listNftMutation.isPending ||
    leaseNftMutation.isPending ||
    endLeaseMutation.isPending;

  return (
    <div className="space-y-8" role="main" aria-label="LeaseNFT contract interactions">
      {/* Network mismatch warning */}
      {isWrongNetwork && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg p-4 text-sm"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <strong>Network mismatch:</strong> Your wallet is on{" "}
            <strong>{network}</strong>. This app runs on Testnet — please
            switch your wallet to Stellar Testnet to continue.
          </span>
        </div>
      )}

      {/* Admin / Setup Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Initialize */}
        <Card aria-labelledby="init-card-title">
          <CardHeader>
            <CardTitle
              id="init-card-title"
              className="flex items-center gap-2 text-base"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Initialize
            </CardTitle>
            <CardDescription>
              Initialize the contract (one-time setup after deployment).
              {initMutation.isSuccess && (
                <span className="block text-emerald-500 dark:text-emerald-400 mt-1 text-xs font-medium">
                  ✓ Contract initialized successfully.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Disabled permanently after first success to prevent double-init */}
            <Button
              id="btn-init"
              onClick={handleInit}
              disabled={isAnyLoading || initMutation.isSuccess}
              className="w-full"
              variant={initMutation.isSuccess ? "outline" : "secondary"}
              aria-label={
                initMutation.isSuccess
                  ? "Contract already initialized"
                  : "Initialize Contract"
              }
              aria-busy={initMutation.isPending}
            >
              {initMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Initializing…
                </>
              ) : initMutation.isSuccess ? (
                "Already Initialized ✓"
              ) : (
                "Initialize Contract"
              )}
            </Button>
            {initHash && (
              <TxResult hash={initHash} status={initMutation.isPending ? "pending" : "success"} />
            )}
            {initMutation.isError && (
              <ErrorBanner
                message={(initMutation.error as Error)?.message ?? "Initialization failed"}
              />
            )}
          </CardContent>
        </Card>

        {/* List NFT */}
        <Card aria-labelledby="list-card-title">
          <CardHeader>
            <CardTitle
              id="list-card-title"
              className="flex items-center gap-2 text-base"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              List NFT
            </CardTitle>
            <CardDescription>List an NFT token for lease</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="tokenId">Token ID</Label>
              <Input
                id="tokenId"
                placeholder="LEASED_NFT_001"
                value={listForm.tokenId}
                onChange={(e) =>
                  setListForm({ ...listForm, tokenId: e.target.value })
                }
                aria-required="true"
                disabled={isAnyLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tokenAddr">Token Contract Address</Label>
              <Input
                id="tokenAddr"
                placeholder="C… (56-character Stellar address)"
                value={listForm.tokenAddress}
                onChange={(e) =>
                  setListForm({ ...listForm, tokenAddress: e.target.value })
                }
                aria-required="true"
                aria-describedby="tokenAddr-hint"
                disabled={isAnyLoading}
              />
              <p id="tokenAddr-hint" className="text-xs text-muted-foreground">
                Soroban contract address of the NFT token
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dailyRate">Daily Rate (stroops)</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={listForm.dailyRate}
                  onChange={(e) =>
                    setListForm({ ...listForm, dailyRate: e.target.value })
                  }
                  aria-required="true"
                  disabled={isAnyLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="maxDuration">Max Duration (days)</Label>
                <Input
                  id="maxDuration"
                  type="number"
                  min="1"
                  placeholder="30"
                  value={listForm.maxDuration}
                  onChange={(e) =>
                    setListForm({ ...listForm, maxDuration: e.target.value })
                  }
                  aria-required="true"
                  disabled={isAnyLoading}
                />
              </div>
            </div>
            <Button
              id="btn-list-nft"
              onClick={handleListNft}
              disabled={isAnyLoading}
              className="w-full"
              aria-label="List NFT for lease"
              aria-busy={listNftMutation.isPending}
            >
              {listNftMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Confirming on-chain…
                </>
              ) : (
                "List NFT"
              )}
            </Button>
            {listHash && (
              <TxResult hash={listHash} status={listNftMutation.isPending ? "pending" : "success"} />
            )}
            {listNftMutation.isError && (
              <ErrorBanner
                message={(listNftMutation.error as Error)?.message ?? "List NFT failed"}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global error banners for lease or end lease mutations */}
      {leaseNftMutation.isError && (
        <ErrorBanner message={(leaseNftMutation.error as Error)?.message ?? "Lease failed"} />
      )}
      {endLeaseMutation.isError && (
        <ErrorBanner message={(endLeaseMutation.error as Error)?.message ?? "End lease failed"} />
      )}
      {(leaseHash || endHash) && (
        <div className="max-w-md mx-auto">
          <TxResult
            hash={(leaseHash || endHash)!}
            status={leaseNftMutation.isPending || endLeaseMutation.isPending ? "pending" : "success"}
          />
        </div>
      )}

      {/* Automatic Discovered Listings Grid (BUG 2 & BUG 3) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" aria-hidden="true" />
            Available & Active Listings
          </h2>
          {listingsLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning contract listings…
            </div>
          )}
        </div>

        {listingsLoading && listings.length === 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-6 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-40" aria-hidden="true" />
            <p className="text-sm font-medium">No active listings found on contract</p>
            <p className="text-xs mt-1">Use the List NFT card above to create the first listing.</p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map(({ id, listing, lease }) => {
              const isOwner = String(listing.owner) === String(address);
              const isRenter = lease ? String(lease.renter) === String(address) : false;
              const canEndLease = !listing.active && (isOwner || isRenter);

              return (
                <Card key={id} className="flex flex-col justify-between" aria-labelledby={`listing-title-${id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle id={`listing-title-${id}`} className="text-base font-bold flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-primary" />
                        Listing #{id}
                      </CardTitle>
                      <Badge variant={listing.active ? "success" : "secondary"}>
                        {listing.active ? "Available" : "Leased"}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-xs truncate">
                      Token: {listing.token_id}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner:</span>
                        <span className="font-mono">{shortenAddress(listing.owner)}</span>
                      </div>
                      <div className="flex justify-between truncate">
                        <span className="text-muted-foreground mr-2">Token Addr:</span>
                        <span className="font-mono truncate">{shortenAddress(listing.token_address)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Rate:</span>
                        <span className="font-semibold">{String(listing.daily_rate)} stroops</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Duration:</span>
                        <span>{listing.max_duration} days</span>
                      </div>

                      {lease && (
                        <div className="pt-2 mt-2 border-t space-y-1 bg-muted/40 p-2 rounded text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Renter:</span>
                            <span className="font-mono">{shortenAddress(lease.renter)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expires:</span>
                            <span>{formatTimestamp(Number(lease.end_time))}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Context-aware actions (BUG 3) */}
                    <div className="pt-3 border-t space-y-2 mt-3">
                      {listing.active ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24 shrink-0">
                            <Input
                              type="number"
                              min="1"
                              max={listing.max_duration}
                              value={leaseDurations[id] ?? "7"}
                              onChange={(e) =>
                                setLeaseDurations({ ...leaseDurations, [id]: e.target.value })
                              }
                              placeholder="Days"
                              className="h-9 text-xs"
                              disabled={isAnyLoading}
                              aria-label={`Duration in days for listing #${id}`}
                            />
                          </div>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleLeaseNft(id)}
                            disabled={isAnyLoading}
                            aria-busy={leaseNftMutation.isPending}
                          >
                            Lease
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" className="w-full" disabled>
                          Leased
                        </Button>
                      )}

                      {canEndLease && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleEndLease(id)}
                          disabled={isAnyLoading}
                          aria-busy={endLeaseMutation.isPending}
                        >
                          End Lease
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Connected wallet info footer */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground border rounded-lg px-4 py-2.5">
        <Coins className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Connected:{" "}
          <span className="font-mono">{shortenAddress(address || "", 8)}</span>
        </span>
        <span>·</span>
        <span>
          Network:{" "}
          <Badge variant="outline" className="text-[10px] uppercase">
            {network || "testnet"}
          </Badge>
        </span>
        <a
          href={getExplorerUrl("account", address || "")}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hover:text-primary transition-colors"
          aria-label="View wallet on Stellar Explorer"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
