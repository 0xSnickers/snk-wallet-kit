"use client";

import { createContext, useContext } from "react";
import { WalletKitError, type ConnectOptions, type NormalizedWalletKitConfig, type SignMessageResult, type SignableMessage, type SwitchChainOptions, type TransactionRequest, type TransactionResult, type WalletDescriptor, type WalletSession } from "../core";

export type WalletContextValue = {
  config: NormalizedWalletKitConfig;
  session: WalletSession;
  wallets: WalletDescriptor[];
  hydrated: boolean;
  error: WalletKitError | null;
  connect: (options: ConnectOptions) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  signMessage: (message: SignableMessage) => Promise<SignMessageResult>;
  sendTransaction: (request: TransactionRequest) => Promise<TransactionResult>;
  switchChain: (options: SwitchChainOptions) => Promise<void>;
};

export const WalletContext = createContext<WalletContextValue | null>(null);

export type WalletModalContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openModal: () => void;
  closeModal: () => void;
};

export const WalletModalContext = createContext<WalletModalContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet requires WalletKitProvider or WalletCoreProvider.");
  }
  return context;
}

export function useWalletModal(): WalletModalContextValue {
  const context = useContext(WalletModalContext);
  if (!context) {
    throw new Error("useWalletModal requires WalletKitProvider or WalletCoreProvider.");
  }
  return context;
}
