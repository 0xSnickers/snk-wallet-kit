import {
  normalizeConfig,
  createWalletKitEvmConfig,
  type WalletKitConfig,
} from "snk-wallet-kit";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

export const walletKitConfig: WalletKitConfig = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: walletConnectProjectId
      ? ["metaMask", "okxWallet", "walletConnect"]
      : ["metaMask", "okxWallet"],
    walletConnectProjectId,
    reconnectOnMount: true,
  },
  sol: {
    enabled: true,
    wallets: ["phantom", "jupiter"],
    cluster: "devnet",
    autoReconnect: true,
  },
  app: {
    storageKey: "snk-wallet-nextjs-demo",
  },
};

export const normalizedConfig = normalizeConfig(walletKitConfig);
export const wagmiConfig = createWalletKitEvmConfig(normalizedConfig)! as any;
