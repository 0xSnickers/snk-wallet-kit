import { useAccount, useChainId } from "wagmi";
import {
  useCurrentAccount,
  useWalletStatus,
  useWalletError,
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
  const wagmiAccount = useAccount();
  const wagmiChainId = useChainId();

  return (
    <>
      <div style={styles.section}>
        <div style={styles.label}>Status</div>
        <div style={styles.value}>{status}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Account (useCurrentAccount)</div>
        <div style={styles.value}>{account ?? "-"}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Account (wagmi: useAccount)</div>
        <div style={styles.value}>
          {wagmiAccount.address ?? "-"}
          {wagmiAccount.isConnected && " (connected)"}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Chain ID (wagmi: useChainId)</div>
        <div style={styles.value}>{wagmiChainId ?? "-"}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Last Error</div>
        <pre style={styles.pre}>
          {error ? JSON.stringify(error, null, 2) : "No error."}
        </pre>
      </div>
    </>
  );
}
