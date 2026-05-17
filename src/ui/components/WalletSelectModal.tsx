"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
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
  className?: string;
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
  className,
}: WalletSelectModalProps): ReactElement | null {
  const modal = useWalletModal();
  const wallets = useAvailableWallets();
  const { connect, disconnect, session } = useConnectWallet();
  const error = useWalletError();
  const [pendingWalletKey, setPendingWalletKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !resolvedOpen) return null;

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

  return createPortal(
    <div
      className="snk-wallet-kit__modalOverlay"
      onClick={() => setResolvedOpen(false)}
      role="presentation"
    >
      <div
        className={cn("snk-wallet-kit__modalPanel", className)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="snk-wallet-kit__modalHeader">
          <div>
            <h2 id={titleId} className="snk-wallet-kit__modalTitle">{title}</h2>
            <p className="snk-wallet-kit__modalDescription">
              {session.connected ? "Manage your connection" : "Select a wallet to continue"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResolvedOpen(false)}
            className="snk-wallet-kit__iconButton"
            aria-label="Close wallet modal"
          >
            <svg className="snk-wallet-kit__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="snk-wallet-kit__modalBody">
          {session.connected ? (
            <div className="snk-wallet-kit__sessionCard">
              <div className="snk-wallet-kit__sessionRow">
                <div className="snk-wallet-kit__sessionAvatar">
                  {session.account?.slice(2, 4).toUpperCase() || "?"}
                </div>
                <div className="snk-wallet-kit__sessionInfo">
                  <p className="snk-wallet-kit__sessionAccount">{session.account}</p>
                  <p className="snk-wallet-kit__sessionNamespace">{session.namespace} connected</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => disconnect()}
                className="snk-wallet-kit__disconnectButton"
              >
                Disconnect
              </button>
            </div>
          ) : (
            walletGroups.map((group) => (
              <div key={group.title} className="snk-wallet-kit__walletGroup">
                <h3 className="snk-wallet-kit__walletGroupTitle">
                  {group.title}
                </h3>
                <div className="snk-wallet-kit__walletList">
                  {group.wallets.map((wallet) => {
                    const key = `${wallet.namespace}:${wallet.walletId}`;
                    const isPending = pendingWalletKey === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => handleConnect(wallet)}
                        disabled={isPending}
                        className={cn(
                          "snk-wallet-kit__walletOption",
                          isPending && "snk-wallet-kit__walletOption--pending",
                        )}
                      >
                        <div className="snk-wallet-kit__walletIconWrap">
                          {wallet.icon ? (
                            <img src={wallet.icon} alt={wallet.name} className="snk-wallet-kit__walletIcon" />
                          ) : (
                            <span className="snk-wallet-kit__walletFallbackIcon">
                              {wallet.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="snk-wallet-kit__walletInfo">
                          <div className="snk-wallet-kit__walletNameRow">
                            <span className="snk-wallet-kit__walletName">
                              {wallet.name}
                            </span>
                            {!wallet.installed && (
                              <span className="snk-wallet-kit__walletBadge">
                                NOT INSTALLED
                              </span>
                            )}
                          </div>
                          <p className="snk-wallet-kit__walletDescription">
                            {wallet.description || `Connect to ${wallet.name}`}
                          </p>
                        </div>
                        {isPending && (
                          <div className="snk-wallet-kit__spinner" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {walletGroups.length === 0 && !session.connected && (
            <div className="snk-wallet-kit__emptyState">
              <p className="snk-wallet-kit__emptyText">No wallets found</p>
            </div>
          )}
        </div>

        {error && (
          <div className="snk-wallet-kit__errorBar">
            <p className="snk-wallet-kit__errorText">{error.message}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
