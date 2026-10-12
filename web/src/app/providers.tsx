"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { UnlockProvider } from "@/lib/unlock";
import { chain } from "@/lib/config";

function makeConfig() {
  // Reads go through our /api/rpc proxy (Alchemy-backed when configured).
  // Writes are signed and broadcast by the user's own wallet.
  const rpc = typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : undefined;
  return createConfig({
    chains: [chain] as const,
    connectors: [injected({ shimDisconnect: true })],
    transports: { [chain.id]: http(rpc, { batch: { batchSize: 25, wait: 10 } }) } as Record<number, ReturnType<typeof http>>,
    ssr: true,
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [config] = useState(makeConfig);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 2 } },
      }),
  );
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <UnlockProvider>{children}</UnlockProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
