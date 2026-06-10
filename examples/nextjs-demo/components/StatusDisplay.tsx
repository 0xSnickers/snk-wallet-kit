"use client";

import { useChainId, useConnection } from "wagmi";
import {
  useCurrentAccount,
  useWalletError,
  useWalletStatus,
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
  grid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    marginBottom: "20px",
  },
  panel: {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #334155",
    background: "#0f172a",
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

  return (
    <>
      <div style={styles.grid}>
        <div style={styles.panel}>
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
        </div>

        <div style={styles.panel}>
          <div style={styles.section}>
            <div style={styles.label}>wagmi address</div>
            <div style={styles.value}>{wagmiConnection.address ?? "-"}</div>
          </div>
          <div style={styles.section}>
            <div style={styles.label}>wagmi status</div>
            <div style={styles.value}>{wagmiConnection.status}</div>
          </div>
          <div style={styles.section}>
            <div style={styles.label}>wagmi chainId</div>
            <div style={styles.value}>{wagmiChainId ?? "-"}</div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Last error</div>
        <pre style={styles.pre}>{error ? JSON.stringify(error, null, 2) : "No error."}</pre>
      </div>
    </>
  );
}
