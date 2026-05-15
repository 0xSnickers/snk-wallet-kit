import {
  normalizeConfig,
  createWalletKitEvmConfig,
  type WalletKitConfig,
} from "snk-wallet-kit";

export const walletKitConfig: WalletKitConfig = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: ["metaMask", "okxWallet", "walletConnect"],
    walletConnectProjectId: "97aee081a604f415584c305fe5c3dd15",
  },
  sol: {
    enabled: true,
    wallets: ["phantom", "jupiter"],
    cluster: "devnet",
  },
  app: {
    autoReconnect: true,
    storageKey: "snk-wallet-react-demo",
  },
};

export const normalizedConfig = normalizeConfig(walletKitConfig);
export const wagmiConfig = createWalletKitEvmConfig(normalizedConfig)! as any;
