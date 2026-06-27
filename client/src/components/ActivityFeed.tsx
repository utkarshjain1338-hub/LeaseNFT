"use client";

import { useEventStore } from "@/stores/eventStore";
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
  Activity,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";

export function ActivityFeed() {
  const events = useEventStore((s) => s.events);
  const clearEvents = useEventStore((s) => s.clearEvents);
  const transactions = useTransactionStore((s) => s.transactions);

  // Merge and sort events + transactions by timestamp, newest first
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

  // Deduplicate: prefer the "transaction" item if a matching "event" was also created
  const seen = new Set<string>();
  const deduped = activityItems.filter((item) => {
    const key = `${item.type}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" aria-hidden="true" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Real-time contract events and transaction updates, newest first
            </CardDescription>
          </div>
          {events.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearEvents}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Clear event feed"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {deduped.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground"
            role="status"
            aria-label="No activity yet"
          >
            <Activity
              className="h-10 w-10 mx-auto mb-3 opacity-50"
              aria-hidden="true"
            />
            <p>No activity yet</p>
            <p className="text-sm mt-1">
              Events and transactions will appear here in real-time
            </p>
          </div>
        ) : (
          <ol
            className="space-y-2"
            aria-label="Activity feed"
            aria-live="polite"
            aria-relevant="additions"
          >
            {deduped.slice(0, 50).map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {/* Status icon */}
                <div className="shrink-0 mt-0.5" aria-hidden="true">
                  {item.type === "event" ? (
                    <Activity className="h-4 w-4 text-primary" />
                  ) : item.status === "pending" ? (
                    <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                  ) : item.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
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
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <time dateTime={new Date(item.timestamp * 1000).toISOString()}>
                      {formatTimestamp(item.timestamp)}
                    </time>
                    {"wallet" in item && item.wallet && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">
                          {shortenAddress(item.wallet, 4)}
                        </span>
                      </>
                    )}
                    {"hash" in item && item.hash && (
                      <a
                        href={getExplorerUrl("transaction", item.hash!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                        aria-label={`View transaction on Stellar Explorer`}
                      >
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
