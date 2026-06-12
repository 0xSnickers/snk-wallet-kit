import {
  normalizeConfig,
  createWalletKitEvmConfig,
  type WalletKitConfig,
} from "snk-wallet-kit";
import { mainnet, sepolia } from "wagmi/chains";

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;
const mainnetURL =
  import.meta.env.VITE_MAINNET_RPC_URL ||
  "https://ethereum-rpc.publicnode.com";
const sepoliaURL =
  import.meta.env.VITE_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const anvilURL = import.meta.env.VITE_ANVIL_URL || "http://127.0.0.1:8545";

const configuredMainnet = {
  ...mainnet,
  rpcUrls: {
    ...mainnet.rpcUrls,
    default: {
      http: [mainnetURL],
    },
  },
} as const;

const configuredSepolia = {
  ...sepolia,
  rpcUrls: {
    ...sepolia.rpcUrls,
    default: {
      http: [sepoliaURL],
    },
  },
} as const;

const anvil = {
  id: 31337,
  name: "Anvil",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [anvilURL],
    },
  },
} as const;

export const walletKitConfig: WalletKitConfig = {
  evm: {
    enabled: true,
    chains: [configuredMainnet, configuredSepolia, anvil],
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
    storageKey: "snk-wallet-react-demo",
  },
};

export const normalizedConfig = normalizeConfig(walletKitConfig);
export const wagmiConfig = createWalletKitEvmConfig(normalizedConfig)! as any;
