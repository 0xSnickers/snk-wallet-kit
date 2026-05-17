"use client";

import { useMemo, type ReactElement, type ReactNode } from "react";
import { cn } from "../utils";
import { useWallet, useWalletModal } from "../../react";
import { WalletSelectModal } from "./WalletSelectModal";

type RenderButtonArgs = {
  connected: boolean;
  address: string | null;
  label: ReactNode;
  open: () => void;
};

export type ConnectWalletButtonProps = {
  label?: string;
  modalTitle?: string;
  recommendedWalletIds?: string[];
  showAccount?: boolean;
  renderModal?: boolean;
  className?: string;
  renderButton?: (args: RenderButtonArgs) => ReactNode;
};

export function ConnectWalletButton({
  label = "Connect Wallet",
  modalTitle,
  recommendedWalletIds,
  showAccount = true,
  renderModal = true,
  className,
  renderButton,
}: ConnectWalletButtonProps): ReactElement {
  const { session } = useWallet();
  const modal = useWalletModal();

  const buttonLabel = useMemo(() => {
    if (session.connected && showAccount && session.account) {
      return `${session.account.slice(0, 6)}...${session.account.slice(-4)}`;
    }
    return label;
  }, [label, session.account, session.connected, showAccount]);

  const button = renderButton ? (
    renderButton({
      connected: session.connected,
      address: session.account ?? null,
      label: buttonLabel,
      open: modal.openModal,
    })
  ) : (
    <button
      type="button"
      onClick={modal.openModal}
      className={cn(
        "snk-wallet-kit__connectButton",
        session.connected && "snk-wallet-kit__connectButton--connected",
        className,
      )}
    >
      <span className="snk-wallet-kit__connectButtonContent">
        {session.connected && (
          <span className="snk-wallet-kit__statusDot" aria-hidden="true" />
        )}
        {buttonLabel}
      </span>
    </button>
  );

  return (
    <>
      {button}

      {renderModal && (
        <WalletSelectModal
          title={modalTitle}
          recommendedWalletIds={recommendedWalletIds}
        />
      )}
    </>
  );
}
