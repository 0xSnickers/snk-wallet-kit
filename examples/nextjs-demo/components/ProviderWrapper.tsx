"use client";

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { WalletCoreProvider } from "snk-wallet-kit";
import { walletKitConfig, wagmiConfig } from "../config/wallet.config";

const queryClient = new QueryClient() as any;

export function ProviderWrapper({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <WalletCoreProvider
          config={walletKitConfig}
          queryClient={queryClient}
          wagmiConfig={wagmiConfig}
        >
          {children}
        </WalletCoreProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
