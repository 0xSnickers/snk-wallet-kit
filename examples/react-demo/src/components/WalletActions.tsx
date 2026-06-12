import { useState } from "react";
import { useConnectWallet } from "snk-wallet-kit";
import type { CSSProperties } from "react";

const EVM_CHAINS = [
  { id: 1, label: "Switch to Mainnet" },
  { id: 11155111, label: "Switch to Sepolia" },
  { id: 31337, label: "Switch to Anvil" },
] as const;

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
  textarea: {
    width: "100%",
    minHeight: "90px",
    marginBottom: "12px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #475569",
    background: "#020617",
    color: "#e2e8f0",
    resize: "vertical",
    boxSizing: "border-box",
  },
  grid: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  button: {
    border: 0,
    borderRadius: "10px",
    padding: "10px 14px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  },
  buttonSecondary: {
    border: "1px solid #475569",
    borderRadius: "10px",
    padding: "10px 14px",
    background: "transparent",
    color: "#e2e8f0",
    cursor: "pointer",
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

export function WalletActions() {
  const { disconnect, reconnect, signMessage, sendTransaction, switchChain, session } =
    useConnectWallet();
  const [message, setMessage] = useState("hello from snk-wallet-kit demo");
  const [result, setResult] = useState<any>(null);

  const run = async (action: () => Promise<unknown>) => {
    try {
      const next = await action();
      setResult(next ?? { ok: true });
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const messageToSign =
    session.namespace === "evm"
      ? `${message}\n\nchainId: ${session.evm?.chainId ?? "unknown"}`
      : message;

  return (
    <>
      <div style={styles.section}>
        <div style={styles.label}>Current wallet</div>
        <div style={styles.value}>
          {session.namespace && session.walletId
            ? `${session.namespace}:${session.walletId}`
            : "-"}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Message</div>
        <textarea
          style={styles.textarea}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div style={styles.grid}>
          <button style={styles.button} onClick={() => void run(() => signMessage(messageToSign))}>
            Sign Message
          </button>
          <button
            style={styles.button}
            onClick={() =>
              void run(() =>
                sendTransaction({
                  namespace: session.namespace!,
                  to: "0x0000000000000000000000000000000000000000",
                  value: "0",
                }),
              )
            }
          >
            Send Dummy Tx
          </button>
          {session.namespace === "evm" &&
            EVM_CHAINS.map((chain) => (
              <button
                key={chain.id}
                style={styles.button}
                onClick={() => void run(() => switchChain({ chainId: chain.id }))}
              >
                {chain.label}
              </button>
            ))}
          <button style={styles.buttonSecondary} onClick={() => void run(() => reconnect())}>
            Reconnect
          </button>
          <button style={styles.buttonSecondary} onClick={() => void run(() => disconnect())}>
            Disconnect
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Last action result</div>
        <pre style={styles.pre}>
          {result ? JSON.stringify(result, null, 2) : "No action yet."}
        </pre>
      </div>
    </>
  );
}
