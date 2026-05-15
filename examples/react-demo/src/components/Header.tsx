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
    margin: "0 0 24px",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
};

export function Header() {
  return (
    <div style={styles.header}>
      <h1 style={styles.title}>SNK Wallet Connect Demo</h1>
      <p style={styles.text}>
        This page demonstrates <strong style={{ color: "#38bdf8" }}>WalletCoreProvider + Custom Providers</strong> (高级用法). <br />
        <strong style={{ color: "#22c55e" }}>
          ✨ wagmi hooks (useAccount, useChainId) &amp; react-query work perfectly here!
        </strong>
      </p>
      <div style={{ marginBottom: "20px" }}>
        <ConnectWalletButton recommendedWalletIds={["injected", "phantom"]} />
      </div>
    </div>
  );
}
