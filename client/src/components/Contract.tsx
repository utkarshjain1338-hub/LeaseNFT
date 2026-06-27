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
  ArrowRightLeft,
  XCircle,
  RefreshCw,
  Package,
  Calendar,
  Coins,
  Hash,
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

function validateListingId(val: string): string | null {
  const n = parseInt(val);
  if (isNaN(n) || n <= 0) return "Listing ID must be a positive integer";
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
    useListing,
    useLease,
    initMutation,
    listNftMutation,
    leaseNftMutation,
    endLeaseMutation,
  } = useContract();

  // Form state
  const [listForm, setListForm] = useState({
    tokenId: "",
    tokenAddress: "",
    dailyRate: "",
    maxDuration: "30",
  });
  const [leaseForm, setLeaseForm] = useState({
    listingId: "",
    durationDays: "7",
  });
  const [endLeaseId, setEndLeaseId] = useState("");
  const [queryId, setQueryId] = useState("");

  // Per-card last tx hash
  const [initHash, setInitHash] = useState<string | null>(null);
  const [listHash, setListHash] = useState<string | null>(null);
  const [leaseHash, setLeaseHash] = useState<string | null>(null);
  const [endHash, setEndHash] = useState<string | null>(null);

  // Query data
  const queryNum = parseInt(queryId) || 0;
  const { data: queriedListing, isLoading: listingLoading } = useListing(queryNum);
  const { data: queriedLease, isLoading: leaseLoading } = useLease(queryNum);

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
      toast.success("Contract initialized — transaction submitted", {
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
      toast.success("NFT listed for lease!", {
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

  const handleLeaseNft = async () => {
    const errors = [
      validateListingId(leaseForm.listingId),
      validatePositiveNumber(leaseForm.durationDays, "Duration"),
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error("Invalid input", { description: errors[0]! });
      return;
    }

    try {
      const hash = await leaseNftMutation.mutateAsync({
        listingId: parseInt(leaseForm.listingId),
        durationDays: parseInt(leaseForm.durationDays),
      });
      setLeaseHash(hash);
      toast.success("NFT leased successfully!", {
        description: `Hash: ${hash.slice(0, 16)}…`,
        action: {
          label: "View",
          onClick: () => window.open(getExplorerUrl("transaction", hash), "_blank"),
        },
      });
      setLeaseForm({ listingId: "", durationDays: "7" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    }
  };

  const handleEndLease = async () => {
    const validationErr = validateListingId(endLeaseId);
    if (validationErr) {
      toast.error("Invalid input", { description: validationErr });
      return;
    }

    try {
      const hash = await endLeaseMutation.mutateAsync(parseInt(endLeaseId));
      setEndHash(hash);
      toast.success("Lease ended", {
        description: `Hash: ${hash.slice(0, 16)}…`,
        action: {
          label: "View",
          onClick: () => window.open(getExplorerUrl("transaction", hash), "_blank"),
        },
      });
      setEndLeaseId("");
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

      {/* Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              Initialize the contract (one-time setup). Only needed once after
              deployment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              id="btn-init"
              onClick={handleInit}
              disabled={isAnyLoading}
              className="w-full"
              variant="secondary"
              aria-label="Initialize the LeaseNFT contract"
              aria-busy={initMutation.isPending}
            >
              {initMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Initializing…
                </>
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
            <CardDescription>List an NFT for lease</CardDescription>
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
                  Listing…
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

        {/* Lease NFT */}
        <Card aria-labelledby="lease-card-title">
          <CardHeader>
            <CardTitle
              id="lease-card-title"
              className="flex items-center gap-2 text-base"
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              Lease NFT
            </CardTitle>
            <CardDescription>Lease a listed NFT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="listingId">Listing ID</Label>
              <Input
                id="listingId"
                type="number"
                min="1"
                placeholder="1"
                value={leaseForm.listingId}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, listingId: e.target.value })
                }
                aria-required="true"
                disabled={isAnyLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="7"
                value={leaseForm.durationDays}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, durationDays: e.target.value })
                }
                aria-required="true"
                disabled={isAnyLoading}
              />
            </div>
            <Button
              id="btn-lease-nft"
              onClick={handleLeaseNft}
              disabled={isAnyLoading}
              className="w-full"
              aria-label="Lease selected NFT"
              aria-busy={leaseNftMutation.isPending}
            >
              {leaseNftMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Leasing…
                </>
              ) : (
                "Lease NFT"
              )}
            </Button>
            {leaseHash && (
              <TxResult hash={leaseHash} status={leaseNftMutation.isPending ? "pending" : "success"} />
            )}
            {leaseNftMutation.isError && (
              <ErrorBanner
                message={(leaseNftMutation.error as Error)?.message ?? "Lease NFT failed"}
              />
            )}
          </CardContent>
        </Card>

        {/* End Lease */}
        <Card aria-labelledby="end-lease-card-title">
          <CardHeader>
            <CardTitle
              id="end-lease-card-title"
              className="flex items-center gap-2 text-base"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              End Lease
            </CardTitle>
            <CardDescription>End an active lease (owner or renter)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="endLeaseId">Listing ID</Label>
              <Input
                id="endLeaseId"
                type="number"
                min="1"
                placeholder="1"
                value={endLeaseId}
                onChange={(e) => setEndLeaseId(e.target.value)}
                aria-required="true"
                disabled={isAnyLoading}
              />
            </div>
            <Button
              id="btn-end-lease"
              onClick={handleEndLease}
              disabled={isAnyLoading}
              variant="destructive"
              className="w-full"
              aria-label="End the selected lease"
              aria-busy={endLeaseMutation.isPending}
            >
              {endLeaseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Ending…
                </>
              ) : (
                "End Lease"
              )}
            </Button>
            {endHash && (
              <TxResult hash={endHash} status={endLeaseMutation.isPending ? "pending" : "success"} />
            )}
            {endLeaseMutation.isError && (
              <ErrorBanner
                message={(endLeaseMutation.error as Error)?.message ?? "End lease failed"}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Query Section */}
      <Card aria-labelledby="query-card-title">
        <CardHeader>
          <CardTitle
            id="query-card-title"
            className="flex items-center gap-2"
          >
            <Hash className="h-4 w-4" aria-hidden="true" />
            Query Contract State
          </CardTitle>
          <CardDescription>
            Look up a listing and its active lease by listing ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="queryListingId">Listing ID</Label>
              <Input
                id="queryListingId"
                type="number"
                min="1"
                placeholder="Enter listing ID (e.g., 1)"
                value={queryId}
                onChange={(e) => setQueryId(e.target.value)}
                className="max-w-xs"
                aria-label="Query listing by ID"
              />
            </div>
          </div>

          {queryNum > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Listing Details */}
              <div
                className="border rounded-lg p-4 space-y-2"
                role="region"
                aria-label={`Listing #${queryNum} details`}
              >
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" aria-hidden="true" />
                  Listing #{queryNum}
                </h3>
                {listingLoading ? (
                  <div className="space-y-2" aria-busy="true" aria-label="Loading listing data">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : queriedListing ? (
                  <div className="text-sm space-y-1.5">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Owner</span>
                      <span className="font-mono">
                        {shortenAddress((queriedListing as { owner: string }).owner)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Token ID</span>
                      <span className="font-mono">
                        {(queriedListing as { token_id: string }).token_id}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Daily Rate</span>
                      <span>
                        {String((queriedListing as { daily_rate: string | bigint }).daily_rate)}{" "}
                        stroops
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Max Duration</span>
                      <span>
                        {String((queriedListing as { max_duration: number }).max_duration)} days
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant={
                          (queriedListing as { active: boolean }).active
                            ? "success"
                            : "secondary"
                        }
                      >
                        {(queriedListing as { active: boolean }).active
                          ? "Available"
                          : "Leased"}
                      </Badge>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center" role="status">
                    Listing not found
                  </p>
                )}
              </div>

              {/* Lease Details */}
              <div
                className="border rounded-lg p-4 space-y-2"
                role="region"
                aria-label={`Active lease for listing #${queryNum}`}
              >
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Active Lease #{queryNum}
                </h3>
                {leaseLoading ? (
                  <div className="space-y-2" aria-busy="true" aria-label="Loading lease data">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : queriedLease ? (
                  <div className="text-sm space-y-1.5">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Renter</span>
                      <span className="font-mono">
                        {shortenAddress((queriedLease as { renter: string }).renter)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Start</span>
                      <span>
                        {formatTimestamp(
                          Number((queriedLease as { start_time: number | bigint }).start_time)
                        )}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">End</span>
                      <span>
                        {formatTimestamp(
                          Number((queriedLease as { end_time: number | bigint }).end_time)
                        )}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Total Fee</span>
                      <span>
                        {String((queriedLease as { total_fee: string | bigint }).total_fee)}{" "}
                        stroops
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant={
                          Date.now() / 1000 <
                          Number((queriedLease as { end_time: number | bigint }).end_time)
                            ? "success"
                            : "warning"
                        }
                      >
                        {Date.now() / 1000 <
                        Number((queriedLease as { end_time: number | bigint }).end_time)
                          ? "Active"
                          : "Expired"}
                      </Badge>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center" role="status">
                    No active lease
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
