/**
 * useEventStream.ts — React hook for automatic contract event streaming.
 *
 * Starts the event polling stream when the wallet is connected and
 * stops it on disconnect or component unmount. New events are added
 * to the Zustand event store automatically.
 */

"use client";

import { useEffect, useRef } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { useEventStore } from "@/stores/eventStore";
import {
  startEventStream,
  stopEventStream,
  resetEventCursor,
} from "@/services/eventService";

/**
 * Starts the contract event stream when the wallet is connected.
 * Automatically stops and resets the cursor on disconnect.
 *
 * @param intervalMs - Polling interval in ms (default 10s)
 */
export function useEventStream(intervalMs = 10_000): void {
  const isConnected = useWalletStore((s) => s.isConnected);
  const addEvent = useEventStore((s) => s.addEvent);
  const streamRunning = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      if (streamRunning.current) {
        stopEventStream();
        resetEventCursor();
        streamRunning.current = false;
      }
      return;
    }

    if (streamRunning.current) return;

    streamRunning.current = true;
    startEventStream({
      intervalMs,
      onEvents: (events) => {
        for (const event of events) {
          addEvent(event);
        }
      },
      onError: (err) => {
        console.warn("[LeaseNFT] Event stream error:", err);
      },
    });

    return () => {
      stopEventStream();
      streamRunning.current = false;
    };
  }, [isConnected, addEvent, intervalMs]);
}
