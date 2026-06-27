"use client";

import { useTransactionStore } from "@/stores/transactionStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimestamp, shortenAddress } from "@/lib/utils";
import { getExplorerUrl } from "@/lib/config";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  History,
  Trash2,
} from "lucide-react";

export function TransactionFeed() {
  const transactions = useTransactionStore((s) => s.transactions);
  const clearTransactions = useTransactionStore((s) => s.clearTransactions);

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending → Submitting";
      case "success":
        return "Confirmed";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" aria-hidden="true" />
              Transaction History
            </CardTitle>
            <CardDescription>
              All LeaseNFT contract transactions, newest first
            </CardDescription>
          </div>
          {transactions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTransactions}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Clear transaction history"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground"
            role="status"
            aria-label="No transactions"
          >
            <History
              className="h-10 w-10 mx-auto mb-3 opacity-50"
              aria-hidden="true"
            />
            <p>No transactions yet</p>
            <p className="text-sm mt-1">
              Transactions will appear here when you interact with the contract
            </p>
          </div>
        ) : (
          <ol
            className="space-y-2"
            aria-label="Transaction history list"
            aria-live="polite"
          >
            {transactions.map((tx) => (
              <li
                key={tx.hash}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status icon */}
                  <div aria-hidden="true" className="shrink-0">
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
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge
                        variant={
                          tx.status === "success"
                            ? "success"
                            : tx.status === "failed"
                            ? "destructive"
                            : "warning"
                        }
                        className="text-[10px] uppercase"
                        aria-label={`Status: ${statusLabel(tx.status)}`}
                      >
                        {statusLabel(tx.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(tx.timestamp / 1000)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {shortenAddress(tx.hash, 10)}
                    </p>
                  </div>
                </div>

                {/* Explorer link */}
                <a
                  href={getExplorerUrl("transaction", tx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 ml-3"
                  aria-label={`View transaction ${tx.hash} on Stellar Explorer`}
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                </a>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
