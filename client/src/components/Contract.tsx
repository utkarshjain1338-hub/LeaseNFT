"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";
import { shortenAddress, formatTimestamp, parseContractError } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  ArrowRightLeft,
  XCircle,
  RefreshCw,
  Package,
  Calendar,
  Coins,
  Hash,
} from "lucide-react";

export function Contract() {
  const { address, isConnected, walletModalOpen, setWalletModalOpen } = useWallet();
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

  // Query data
  const queryNum = parseInt(queryId) || 0;
  const { data: queriedListing, isLoading: listingLoading } = useListing(queryNum);
  const { data: queriedLease, isLoading: leaseLoading } = useLease(queryNum);

  // Handlers
  const handleInit = async () => {
    try {
      await initMutation.mutateAsync();
      toast.success("Contract initialized");
    } catch (err) {
      toast.error(parseContractError(err));
    }
  };

  const handleListNft = async () => {
    if (!listForm.tokenId || !listForm.tokenAddress || !listForm.dailyRate) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await listNftMutation.mutateAsync({
        tokenId: listForm.tokenId,
        tokenAddress: listForm.tokenAddress,
        dailyRate: listForm.dailyRate,
        maxDuration: parseInt(listForm.maxDuration) || 30,
      });
      toast.success("NFT listed for lease!");
      setListForm({ tokenId: "", tokenAddress: "", dailyRate: "", maxDuration: "30" });
    } catch (err) {
      toast.error(parseContractError(err));
    }
  };

  const handleLeaseNft = async () => {
    const listingId = parseInt(leaseForm.listingId);
    if (!listingId || listingId <= 0) {
      toast.error("Enter a valid listing ID");
      return;
    }
    try {
      await leaseNftMutation.mutateAsync({
        listingId,
        durationDays: parseInt(leaseForm.durationDays) || 7,
      });
      toast.success("NFT leased successfully!");
      setLeaseForm({ listingId: "", durationDays: "7" });
    } catch (err) {
      toast.error(parseContractError(err));
    }
  };

  const handleEndLease = async () => {
    const listingId = parseInt(endLeaseId);
    if (!listingId || listingId <= 0) {
      toast.error("Enter a valid listing ID");
      return;
    }
    try {
      await endLeaseMutation.mutateAsync(listingId);
      toast.success("Lease ended");
      setEndLeaseId("");
    } catch (err) {
      toast.error(parseContractError(err));
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground" />
          <CardTitle>Wallet Required</CardTitle>
          <CardDescription>
            Connect your wallet to interact with the LeaseNFT contract
          </CardDescription>
          <div className="pt-4">
            <Button onClick={() => setWalletModalOpen(true)}>
              Connect Wallet
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const isLoading =
    initMutation.isPending ||
    listNftMutation.isPending ||
    leaseNftMutation.isPending ||
    endLeaseMutation.isPending;

  return (
    <div className="space-y-8">
      {/* Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Initialize */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" />
              Initialize
            </CardTitle>
            <CardDescription>
              Initialize the contract (one-time setup)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleInit}
              disabled={isLoading}
              className="w-full"
              variant="secondary"
            >
              {initMutation.isPending ? "Initializing..." : "Initialize Contract"}
            </Button>
          </CardContent>
        </Card>

        {/* List NFT */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              List NFT
            </CardTitle>
            <CardDescription>
              List an NFT for lease
            </CardDescription>
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
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tokenAddr">Token Contract Address</Label>
              <Input
                id="tokenAddr"
                placeholder="C..."
                value={listForm.tokenAddress}
                onChange={(e) =>
                  setListForm({ ...listForm, tokenAddress: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dailyRate">Daily Rate (stroops)</Label>
              <Input
                id="dailyRate"
                type="number"
                placeholder="100"
                value={listForm.dailyRate}
                onChange={(e) =>
                  setListForm({ ...listForm, dailyRate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxDuration">Max Duration (days)</Label>
              <Input
                id="maxDuration"
                type="number"
                placeholder="30"
                value={listForm.maxDuration}
                onChange={(e) =>
                  setListForm({ ...listForm, maxDuration: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleListNft}
              disabled={isLoading}
              className="w-full"
            >
              {listNftMutation.isPending ? "Listing..." : "List NFT"}
            </Button>
          </CardContent>
        </Card>

        {/* Lease NFT */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-4 w-4" />
              Lease NFT
            </CardTitle>
            <CardDescription>
              Lease a listed NFT
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="listingId">Listing ID</Label>
              <Input
                id="listingId"
                type="number"
                placeholder="1"
                value={leaseForm.listingId}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, listingId: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="7"
                value={leaseForm.durationDays}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, durationDays: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleLeaseNft}
              disabled={isLoading}
              className="w-full"
            >
              {leaseNftMutation.isPending ? "Leasing..." : "Lease NFT"}
            </Button>
          </CardContent>
        </Card>

        {/* End Lease */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4" />
              End Lease
            </CardTitle>
            <CardDescription>
              End an active lease
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="endLeaseId">Listing ID</Label>
              <Input
                id="endLeaseId"
                type="number"
                placeholder="1"
                value={endLeaseId}
                onChange={(e) => setEndLeaseId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleEndLease}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              {endLeaseMutation.isPending ? "Ending..." : "End Lease"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Query Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Query Contract State
          </CardTitle>
          <CardDescription>
            Look up a listing and its active lease by listing ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="Enter listing ID (e.g., 1)"
              value={queryId}
              onChange={(e) => setQueryId(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {queryNum > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Listing Details */}
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Listing #{queryNum}
                </h3>
                {listingLoading ? (
                  <div className="space-y-2">
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
                        {(queriedListing as { daily_rate: string }).daily_rate} stroops
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Max Duration</span>
                      <span>
                        {(queriedListing as { max_duration: number }).max_duration} days
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
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Listing not found
                  </p>
                )}
              </div>

              {/* Lease Details */}
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Active Lease #{queryNum}
                </h3>
                {leaseLoading ? (
                  <div className="space-y-2">
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
                          (queriedLease as { start_time: number }).start_time
                        )}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">End</span>
                      <span>
                        {formatTimestamp(
                          (queriedLease as { end_time: number }).end_time
                        )}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Total Fee</span>
                      <span>
                        {(queriedLease as { total_fee: string }).total_fee} stroops
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant={
                          Date.now() / 1000 <
                          (queriedLease as { end_time: number }).end_time
                            ? "success"
                            : "warning"
                        }
                      >
                        {Date.now() / 1000 <
                        (queriedLease as { end_time: number }).end_time
                          ? "Active"
                          : "Expired"}
                      </Badge>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No active lease
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
