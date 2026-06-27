"use client";

import { useTransactionStore } from "@/stores/transactionStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/utils";
import { getExplorerUrl } from "@/lib/config";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  History,
} from "lucide-react";

export function TransactionFeed() {
  const transactions = useTransactionStore((s) => s.transactions);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>
          Track all your LeaseNFT contract transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm mt-1">
              Transactions will appear here when you interact with the contract
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {tx.status === "pending" && (
                      <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                    )}
                    {tx.status === "success" && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                    {tx.status === "failed" && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{tx.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant={
                          tx.status === "success"
                            ? "success"
                            : tx.status === "failed"
                            ? "destructive"
                            : "warning"
                        }
                        className="text-[10px] uppercase"
                      >
                        {tx.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(tx.timestamp / 1000)}
                      </span>
                    </div>
                  </div>
                </div>
                <a
                  href={getExplorerUrl("transaction", tx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 ml-3"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
