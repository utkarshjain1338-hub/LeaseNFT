"use client";

import { useEventStore } from "@/stores/eventStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp, shortenAddress } from "@/lib/utils";
import { getExplorerUrl } from "@/lib/config";
import { Activity, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";

export function ActivityFeed() {
  const events = useEventStore((s) => s.events);
  const transactions = useTransactionStore((s) => s.transactions);

  // Merge and sort events + transactions by timestamp
  const activityItems = [
    ...events.map((e) => ({
      id: e.id,
      type: "event" as const,
      timestamp: e.timestamp,
      action: e.action,
      wallet: e.wallet,
      data: e.data,
    })),
    ...transactions.map((tx) => ({
      id: tx.hash,
      type: "transaction" as const,
      timestamp: Math.floor(tx.timestamp / 1000),
      action: tx.label,
      status: tx.status,
      hash: tx.hash,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Feed
        </CardTitle>
        <CardDescription>
          Real-time contract events and transaction updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activityItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No activity yet</p>
            <p className="text-sm mt-1">
              Events and transactions will appear in real-time
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activityItems.slice(0, 50).map((item) => (
              <div
                key={item.id + (item.type === "transaction" ? "-tx" : "")}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  {item.type === "event" ? (
                    <Activity className="h-4 w-4 text-primary" />
                  ) : item.type === "transaction" ? (
                    item.status === "pending" ? (
                      <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                    ) : item.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )
                  ) : null}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {item.type === "event" ? "EVENT" : "TX"}
                    </Badge>
                    <span className="font-medium text-sm truncate">
                      {item.action}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatTimestamp(item.timestamp)}</span>
                    {"wallet" in item && item.wallet && (
                      <>
                        <span>·</span>
                        <span className="font-mono">
                          {shortenAddress(item.wallet!, 4)}
                        </span>
                      </>
                    )}
                    {"hash" in item && item.hash && (
                      <a
                        href={getExplorerUrl("transaction", item.hash!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
