"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { useEventStream } from "@/hooks/useEventStream";

/**
 * AppBootstrap — runs application-wide side effects.
 * Currently: starts the contract event stream when the wallet is connected.
 * Add new global hooks here as the app grows.
 */
function AppBootstrap() {
  // Start the event polling stream (10s interval).
  // Events are automatically added to the Zustand event store.
  useEventStream(10_000);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppBootstrap />
      {children}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          duration: 5000,
        }}
      />
    </QueryClientProvider>
  );
}
