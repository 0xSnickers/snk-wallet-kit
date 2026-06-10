import { ConnectWalletButton } from "snk-wallet-kit";
import type { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  header: {
    marginBottom: "24px",
  },
  title: {
    margin: "0 0 12px",
    fontSize: "28px",
  },
  text: {
    margin: "0 0 12px",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  note: {
    margin: "0 0 24px",
    color: "#cbd5e1",
    lineHeight: 1.6,
  },
};

export function Header() {
  return (
    <div style={styles.header}>
      <h1 style={styles.title}>SNK Wallet Kit Host-Owned wagmi Demo</h1>
      <p style={styles.text}>
        This Vite demo keeps <strong style={{ color: "#38bdf8" }}>one host-owned WagmiProvider</strong> and mounts <strong style={{ color: "#22c55e" }}>WalletCoreProvider</strong> on top of it.
      </p>
      <p style={styles.note}>
        EVM connection state comes from wagmi reconnect behavior, while Solana session restore stays inside the kit via <code>sol.autoReconnect</code>.
      </p>
      <div style={{ marginBottom: "20px" }}>
        <ConnectWalletButton recommendedWalletIds={["metaMask", "phantom"]} />
      </div>
    </div>
  );
}
