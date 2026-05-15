import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider, type WalletKitConfig } from "snk-wallet-kit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SNK Wallet Kit - Next.js Demo",
  description: "Next.js demo for snk-wallet-kit",
};

const config: WalletKitConfig = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: ["metaMask", "okxWallet", "walletConnect"],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "971e64954476ef3b739194939768615e",
  },
  sol: {
    enabled: true,
    wallets: ["phantom", "jupiter"],
    cluster: "devnet",
  },
  app: {
    autoReconnect: true,
    storageKey: "snk-wallet-nextjs-demo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WalletProvider config={config}>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
