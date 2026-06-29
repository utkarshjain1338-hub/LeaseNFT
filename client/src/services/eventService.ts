/**
 * eventService.ts — Event streaming service with cursor-based incremental fetching.
 *
 * Design rationale:
 * - Tracks a `lastLedger` cursor to avoid re-fetching already-processed events.
 * - Deduplicates events by transaction hash to prevent duplicate entries in the feed.
 * - Provides `startEventStream` and `stopEventStream` for lifecycle management.
 * - Events are emitted via a callback so the service stays decoupled from Zustand.
 *
 * Soroban event streaming limitation:
 * The Soroban RPC supports `getEvents` with startLedger/endLedger params.
 * We poll incrementally at a configurable interval rather than using WebSockets
 * (which Soroban RPC does not support natively).
 */

import { rpc } from "@stellar/stellar-sdk";
import { getNetworkConfig, getContractId } from "@/lib/config";
import type { ContractEvent } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventStreamConfig {
  /** Polling interval in milliseconds. Default: 10 seconds. */
  intervalMs?: number;
  /** Called when new events are fetched. */
  onEvents: (events: ContractEvent[]) => void;
  /** Called on polling errors. */
  onError?: (err: string) => void;
}

// ─── State ────────────────────────────────────────────────────────────────────

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastLedger = 0;
const seenEventIds = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getServer(): rpc.Server {
  const config = getNetworkConfig();
  return new rpc.Server(config.rpcUrl);
}

function mapRpcEventToContractEvent(event: unknown): ContractEvent | null {
  try {
    // The Soroban getEvents response structure
    const ev = event as Record<string, unknown>;
    const id = String(ev["id"] ?? ev["txHash"] ?? Math.random());
    const topic = (ev["topic"] as unknown[]) ?? [];
    const ledgerTimestamp = Number(ev["ledgerTimestamp"] ?? 0);

    // Extract action from topic[1] if available
    let action = "Contract event";
    if (Array.isArray(topic) && topic.length >= 2) {
      const raw = topic[1];
      if (typeof raw === "object" && raw !== null && "sym" in raw) {
        action = String((raw as Record<string, unknown>)["sym"] ?? action);
      }
    }

    return {
      id,
      type: "event",
      timestamp: ledgerTimestamp || Math.floor(Date.now() / 1000),
      wallet: "",
      action,
      data: ev as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Perform a single incremental event fetch.
 * Updates `lastLedger` cursor and deduplicates results.
 * Returns only new, unseen events.
 */
export async function fetchIncrementalEvents(): Promise<ContractEvent[]> {
  const server = getServer();
  const contractId = getContractId();

  // Get current ledger if we haven't started yet
  if (lastLedger === 0) {
    try {
      const latestLedger = await server.getLatestLedger();
      // Start from 200 ledgers ago (~16 minutes) to show recent history
      lastLedger = Math.max(1, latestLedger.sequence - 200);
    } catch {
      lastLedger = 1;
    }
  }

  try {
    const response = await server.getEvents({
      startLedger: lastLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
        },
      ],
      limit: 100,
    });

    const newEvents: ContractEvent[] = [];

    if (response.events && response.events.length > 0) {
      // Update cursor to latest ledger
      const latestEventLedger = Math.max(
        ...response.events.map((e) => Number(((e as unknown) as Record<string, unknown>)["ledger"] ?? 0))
      );
      if (latestEventLedger > lastLedger) {
        lastLedger = latestEventLedger + 1;
      }

      for (const rawEvent of response.events) {
        const event = mapRpcEventToContractEvent(rawEvent);
        if (!event) continue;
        // Deduplication: skip events we've already seen
        if (seenEventIds.has(event.id)) continue;
        seenEventIds.add(event.id);
        newEvents.push(event);
      }
    }

    return newEvents;
  } catch {
    return [];
  }
}

/**
 * Start the event polling stream.
 * Safe to call multiple times — stops any existing stream first.
 */
export function startEventStream(config: EventStreamConfig): void {
  stopEventStream();

  const { intervalMs = 10_000, onEvents, onError } = config;

  // Initial fetch
  fetchIncrementalEvents()
    .then((events) => { if (events.length > 0) onEvents(events); })
    .catch((err) => { onError?.(String(err)); });

  // Polling
  pollTimer = setInterval(() => {
    fetchIncrementalEvents()
      .then((events) => { if (events.length > 0) onEvents(events); })
      .catch((err) => { onError?.(String(err)); });
  }, intervalMs);
}

/**
 * Stop the event polling stream.
 */
export function stopEventStream(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Reset the cursor and seen-event deduplication.
 * Call this when the user disconnects or changes network.
 */
export function resetEventCursor(): void {
  lastLedger = 0;
  seenEventIds.clear();
}
