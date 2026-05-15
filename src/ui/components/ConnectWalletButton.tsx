"use client";

import { useMemo, type ReactElement, type ReactNode } from "react";
import { cn } from "../utils";
import { useWallet, useWalletModal } from "../../react";
import { WalletSelectModal } from "./WalletSelectModal";

export type ConnectWalletButtonProps = {
  label?: string;
  modalTitle?: string;
  recommendedWalletIds?: string[];
  showAccount?: boolean;
  renderModal?: boolean;
  className?: string;
};

export function ConnectWalletButton({
  label = "Connect Wallet",
  modalTitle,
  recommendedWalletIds,
  showAccount = true,
  renderModal = true,
  className,
}: ConnectWalletButtonProps): ReactElement {
  const { session } = useWallet();
  const modal = useWalletModal();

  const buttonLabel = useMemo(() => {
    if (session.connected && showAccount && session.account) {
      return `${session.account.slice(0, 6)}...${session.account.slice(-4)}`;
    }
    return label;
  }, [label, session.account, session.connected, showAccount]);

  return (
    <>
      <button
        type="button"
        onClick={modal.openModal}
        className={cn(
          "px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 shadow-lg",
          session.connected
            ? "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
            : "bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/20",
          className
        )}
      >
        <div className="flex items-center gap-2">
          {session.connected && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
          {buttonLabel}
        </div>
      </button>

      {renderModal && (
        <WalletSelectModal
          title={modalTitle}
          recommendedWalletIds={recommendedWalletIds}
        />
      )}
    </>
  );
}
