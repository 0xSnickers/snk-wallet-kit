import { useState } from "react";
import { useConnectWallet } from "snk-wallet-kit";
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
  const { disconnect, signMessage, sendTransaction, switchChain, session } =
    useConnectWallet();
  const [message, setMessage] = useState("hello from snk wallet plugin");
  const [result, setResult] = useState<any>(null);

  const handleSendTx = async () => {
    try {
      const res = await sendTransaction({
        namespace: session.namespace!,
        to: "0x0000000000000000000000000000000000000000",
        value: "0",
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchChain = async () => {
    try {
      await switchChain({ chainId: 11155111 });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div style={styles.section}>
        <div style={styles.label}>Current Wallet</div>
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
          <button
            style={styles.button}
            onClick={() => void signMessage(message).then(setResult)}
          >
            Sign Message
          </button>
          <button style={styles.button} onClick={handleSendTx}>
            Send Dummy Tx
          </button>
          {session.namespace === "evm" && (
            <button style={styles.button} onClick={handleSwitchChain}>
              Switch to Sepolia
            </button>
          )}
          <button
            style={styles.buttonSecondary}
            onClick={() => void disconnect()}
          >
            Disconnect
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Last Signature Result</div>
        <pre style={styles.pre}>
          {result ? JSON.stringify(result, null, 2) : "No signature yet."}
        </pre>
      </div>
    </>
  );
}
