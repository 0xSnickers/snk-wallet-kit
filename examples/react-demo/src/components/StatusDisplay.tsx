import { formatUnits } from "viem";
import { useBalance, useChainId, useConnection } from "wagmi";
import {
  useCurrentAccount,
  useWalletStatus,
  useWalletError,
  useConnectWallet,
} from "snk-wallet-kit";
import type { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  section: {
    marginBottom: "20px",
  },
  label: {
    fontSize: "14px",
    color: "#94a3b8",
    marginBottom: "8px",
  },
  value: {
    fontSize: "16px",
    wordBreak: "break-all",
  },
  pre: {
    margin: 0,
    padding: "12px",
    borderRadius: "10px",
    background: "#020617",
    color: "#cbd5e1",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};

export function StatusDisplay() {
  const account = useCurrentAccount();
  const status = useWalletStatus();
  const error = useWalletError();
  const { session } = useConnectWallet();
  const wagmiConnection = useConnection();
  const wagmiChainId = useChainId();
  const balanceContextReady =
    session.namespace === "evm" &&
    wagmiConnection.status === "connected" &&
    session.account?.toLowerCase() === wagmiConnection.address.toLowerCase() &&
    session.evm?.chainId === wagmiConnection.chainId;
  const {
    data: balance,
    error: balanceError,
    isFetching: balanceFetching,
  } = useBalance({
    address: balanceContextReady ? wagmiConnection.address : undefined,
    chainId: balanceContextReady ? wagmiConnection.chainId : undefined,
    query: {
      enabled: balanceContextReady,
      gcTime: 0,
    },
  });
  const formattedBalance = !balanceContextReady
    ? session.namespace === "evm"
      ? "Syncing wallet state..."
      : "-"
    : balanceFetching
      ? "Refreshing..."
      : balanceError
        ? `Failed to load: ${balanceError.message}`
        : balance
          ? `${formatUnits(balance.value, balance.decimals)} ${balance.symbol}`
          : "-";

  return (
    <>
      <div style={styles.section}>
        <div style={styles.label}>Kit status</div>
        <div style={styles.value}>{status}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Kit account</div>
        <div style={styles.value}>{account ?? "-"}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Kit session</div>
        <pre style={styles.pre}>{JSON.stringify(session, null, 2)}</pre>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>wagmi address</div>
        <div style={styles.value}>{wagmiConnection.address ?? "-"}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>wagmi status</div>
        <div style={styles.value}>{wagmiConnection.status}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>wagmi chain id</div>
        <div style={styles.value}>{wagmiChainId ?? "-"}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Current balance</div>
        <div style={styles.value}>{session.namespace === "evm" ? formattedBalance : "-"}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Last error</div>
        <pre style={styles.pre}>
          {error ? JSON.stringify(error, null, 2) : "No error."}
        </pre>
      </div>
    </>
  );
}
