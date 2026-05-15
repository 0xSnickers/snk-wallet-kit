"use client";

import {
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { cn } from "../utils";
import type { WalletDescriptor } from "../../core";
import {
  useAvailableWallets,
  useConnectWallet,
  useWalletError,
  useWalletModal,
} from "../../react";

export type WalletSelectModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  recommendedWalletIds?: string[];
  walletFilter?: (wallet: WalletDescriptor) => boolean;
  walletSort?: (left: WalletDescriptor, right: WalletDescriptor) => number;
};

const walletPriority: Record<string, number> = {
  phantom: 1,
  jupiter: 2,
  solflare: 3,
  backpack: 4,
  metaMask: 10,
  okxWallet: 11,
  walletConnect: 12,
  coinbaseWallet: 13,
};

const defaultWalletSort = (left: WalletDescriptor, right: WalletDescriptor) => {
  if (left.namespace !== right.namespace) {
    return left.namespace === "sol" ? -1 : 1;
  }

  const leftPriority = walletPriority[left.walletId] ?? 999;
  const rightPriority = walletPriority[right.walletId] ?? 999;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return left.name.localeCompare(right.name);
};

export function WalletSelectModal({
  open,
  onOpenChange,
  title = "Connect Wallet",
  walletFilter,
  walletSort = defaultWalletSort,
}: WalletSelectModalProps): ReactElement | null {
  const modal = useWalletModal();
  const wallets = useAvailableWallets();
  const { connect, disconnect, session } = useConnectWallet();
  const error = useWalletError();
  const [pendingWalletKey, setPendingWalletKey] = useState<string | null>(null);

  const resolvedOpen = open ?? modal.open;
  const setResolvedOpen = onOpenChange ?? modal.setOpen;

  const visibleWallets = useMemo(() => {
    const filtered = walletFilter ? wallets.filter(walletFilter) : wallets;
    return [...filtered].sort(walletSort);
  }, [walletFilter, walletSort, wallets]);

  const walletGroups = useMemo(() => {
    const evm = visibleWallets.filter((w) => w.namespace === "evm");
    const sol = visibleWallets.filter((w) => w.namespace === "sol");

    return [
      { title: "EVM", wallets: evm },
      { title: "Solana", wallets: sol },
    ].filter((g) => g.wallets.length > 0);
  }, [visibleWallets]);

  if (!resolvedOpen) return null;

  const handleConnect = async (wallet: WalletDescriptor) => {
    const key = `${wallet.namespace}:${wallet.walletId}`;
    setPendingWalletKey(key);
    try {
      await connect({ namespace: wallet.namespace, walletId: wallet.walletId });
      setResolvedOpen(false);
    } finally {
      setPendingWalletKey(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setResolvedOpen(false)}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {session.connected ? "Manage your connection" : "Select a wallet to continue"}
            </p>
          </div>
          <button
            onClick={() => setResolvedOpen(false)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
          {session.connected ? (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {session.account?.slice(2, 4).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session.account}</p>
                  <p className="text-xs text-slate-400 capitalize">{session.namespace} connected</p>
                </div>
              </div>
              <button
                onClick={() => disconnect()}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-semibold transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            walletGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                  {group.title}
                </h3>
                <div className="grid gap-2">
                  {group.wallets.map((wallet) => {
                    const key = `${wallet.namespace}:${wallet.walletId}`;
                    const isPending = pendingWalletKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleConnect(wallet)}
                        disabled={isPending}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-xl border transition-all text-left group",
                          isPending
                            ? "bg-slate-800 border-slate-700 opacity-70"
                            : "bg-slate-800/30 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {wallet.icon ? (
                            <img src={wallet.icon} alt={wallet.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              {wallet.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {wallet.name}
                            </span>
                            {!wallet.installed && (
                              <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                                NOT INSTALLED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {wallet.description || `Connect to ${wallet.name}`}
                          </p>
                        </div>
                        {isPending && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {walletGroups.length === 0 && !session.connected && (
            <div className="text-center py-8">
              <p className="text-slate-500">No wallets found</p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border-t border-red-500/20">
            <p className="text-xs text-red-500 text-center">{error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
