import { useMemo } from "react";
import { useWallet } from "./use-wallet";
import type { ConnectOptions, SignMessageResult, SignableMessage, SwitchChainOptions, TransactionRequest, TransactionResult } from "../core";

export function useAvailableWallets() {
  return useWallet().wallets;
}

export function useCurrentAccount() {
  return useWallet().session.account;
}

export function useWalletStatus() {
  return useWallet().session.status;
}

export function useWalletError() {
  return useWallet().error;
}

export function useConnectWallet() {
  const context = useWallet();

  return useMemo(
    () => ({
      async connect(options: ConnectOptions): Promise<void> {
        return context.connect(options);
      },
      async disconnect(): Promise<void> {
        return context.disconnect();
      },
      async reconnect(): Promise<void> {
        return context.reconnect();
      },
      async signMessage(message: SignableMessage): Promise<SignMessageResult> {
        return context.signMessage(message);
      },
      async sendTransaction(request: TransactionRequest): Promise<TransactionResult> {
        return context.sendTransaction(request);
      },
      async switchChain(options: SwitchChainOptions): Promise<void> {
        return context.switchChain(options);
      },
      error: context.error,
      session: context.session,
    }),
    [context],
  );
}
