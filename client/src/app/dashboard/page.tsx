"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useTransactionStore } from "@/stores/transactionStore";
import { useEventStore } from "@/stores/eventStore";
import { shortenAddress, formatTimestamp } from "@/lib/utils";
import { getExplorerUrl } from "@/lib/config";
import {
  Wallet,
  ExternalLink,
  Clock,
  Activity,
  Coins,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const { address, isConnected, balance, network, setWalletModalOpen } = useWallet();
  const transactions = useTransactionStore((s) => s.transactions);
  const events = useEventStore((s) => s.events);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <Wallet className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Wallet Not Connected</h2>
        <p className="text-muted-foreground max-w-md">
          Connect your wallet to view your dashboard, balances, and activity.
        </p>
        <Button onClick={() => setWalletModalOpen(true)} className="gap-2">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      </div>
    );
  }

  const recentTransactions = transactions.slice(0, 10);
  const recentEvents = events.slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Wallet overview, balances, and network info
        </p>
      </div>

      {/* Wallet Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wallet Address</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs font-mono truncate">{address}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {shortenAddress(address || "", 10)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">XLM Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {balance ? parseFloat(balance).toFixed(4) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Stellar Lumens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge
              variant={network === "mainnet" ? "success" : "warning"}
              className="uppercase"
            >
              {network || "testnet"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {network === "mainnet"
                ? "Public Global Network"
                : "Test SDF Network"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Last {recentTransactions.length} transaction(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-xs mt-1">
                  Start by listing or leasing an NFT
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.hash}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {tx.status === "pending" && (
                        <Loader2 className="h-4 w-4 text-amber-500 animate-spin shrink-0" />
                      )}
                      {tx.status === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      {tx.status === "failed" && (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{tx.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(tx.timestamp / 1000)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={getExplorerUrl("transaction", tx.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Contract Events
            </CardTitle>
            <CardDescription>
              Latest {recentEvents.length} event(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No events yet</p>
                <p className="text-xs mt-1">
                  Events appear when contract interactions occur
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="text-sm border-b pb-2 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {event.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      {shortenAddress(event.wallet)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
