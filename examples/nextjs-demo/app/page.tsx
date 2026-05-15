"use client";

import { Header } from "../components/Header";
import { StatusDisplay } from "../components/StatusDisplay";
import { WalletActions } from "../components/WalletActions";
import type { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "40px 16px",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  card: {
    maxWidth: "880px",
    margin: "0 auto",
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "24px",
  },
};

export default function Home() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Header />
        <StatusDisplay />
        <WalletActions />
      </div>
    </div>
  );
}
