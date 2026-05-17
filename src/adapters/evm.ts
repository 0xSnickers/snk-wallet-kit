import type { Chain } from "viem";
import { createConfig, http, type Config, type CreateConnectorFn } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "@wagmi/core";

import type { EvmWalletId, NormalizedWalletKitConfig, WalletDescriptor } from "../core";
import { WALLET_ICONS } from "../ui/constants";
import { walletConnectConnector } from "./wallet-connect";

export type EvmAdapter = {
  config: Config;
  connectors: CreateConnectorFn[];
  wallets: WalletDescriptor[];
};

const CHAIN_MAP = {
  mainnet,
  sepolia,
} as const;

type EthereumProvider = {
  isMetaMask?: boolean;
  isOKXWallet?: boolean;
  isOkxWallet?: boolean;
  isPhantom?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isBitKeep?: boolean;
  providers?: EthereumProvider[];
};

type EvmWindowLike = {
  ethereum?: EthereumProvider;
  coinbaseWalletExtension?: EthereumProvider;
  okxwallet?: EthereumProvider | { ethereum?: EthereumProvider };
};

function getEthereumProvider(windowArg?: unknown): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const targetWindow = (windowArg || window) as EvmWindowLike;
  return targetWindow.ethereum;
}

function findMetaMaskProvider(windowArg?: unknown): EthereumProvider | undefined {
  const ethereum = getEthereumProvider(windowArg);
  if (!ethereum) return undefined;

  // 1. Check if the root provider is ONLY MetaMask
  if (ethereum.isMetaMask && !ethereum.isOKXWallet && !ethereum.isOkxWallet && !ethereum.isCoinbaseWallet) {
    return ethereum;
  }

  // 2. Search in providers array
  if (ethereum.providers?.length) {
    return ethereum.providers.find(
      (p) => p.isMetaMask && !p.isOKXWallet && !p.isOkxWallet && !p.isCoinbaseWallet
    ) || ethereum.providers.find(p => p.isMetaMask);
  }

  return ethereum.isMetaMask ? ethereum : undefined;
}

function findOkxProvider(windowArg?: unknown): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const targetWindow = (windowArg || window) as EvmWindowLike;
  
  // 1. Check window.okxwallet (highest priority for OKX)
  if (targetWindow.okxwallet) {
    const okx = targetWindow.okxwallet as any;
    return okx.ethereum || okx;
  }

  // 2. Check window.ethereum
  const ethereum = targetWindow.ethereum;
  if (!ethereum) return undefined;

  if (ethereum.isOKXWallet || ethereum.isOkxWallet) return ethereum;

  if (ethereum.providers?.length) {
    return ethereum.providers.find(p => p.isOKXWallet || p.isOkxWallet);
  }

  return undefined;
}

function findCoinbaseProvider(windowArg?: unknown): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const targetWindow = (windowArg || window) as EvmWindowLike;

  if (targetWindow.coinbaseWalletExtension) {
    return targetWindow.coinbaseWalletExtension;
  }

  const ethereum = targetWindow.ethereum;
  if (!ethereum) return undefined;

  if (ethereum.isCoinbaseWallet) return ethereum;

  if (ethereum.providers?.length) {
    return ethereum.providers.find((provider) => provider.isCoinbaseWallet);
  }

  return undefined;
}

function getEnabledEvmWalletIds(config: NormalizedWalletKitConfig): EvmWalletId[] {
  return config.evm.wallets.filter((walletId) => {
    if (walletId === "walletConnect" && !config.evm.walletConnectProjectId) {
      return false;
    }
    return true;
  });
}

function resolveChains(config: NormalizedWalletKitConfig): [Chain, ...Chain[]] | null {
  if (!config.evm.enabled) {
    return null;
  }

  const resolvedChains = config.evm.chains
    .map((chainName) => CHAIN_MAP[chainName as keyof typeof CHAIN_MAP])
    .filter(Boolean);

  if (resolvedChains.length === 0) {
    return null;
  }

  return resolvedChains as unknown as [Chain, ...Chain[]];
}

function createEvmConnectors(config: NormalizedWalletKitConfig): CreateConnectorFn[] {
  const connectors: CreateConnectorFn[] = [];

  for (const walletId of getEnabledEvmWalletIds(config)) {
    if (walletId === "injected") {
      connectors.push(injected() as CreateConnectorFn);
      continue;
    }

    if (walletId === "metaMask") {
      connectors.push(
        injected({
          target: {
            id: "metaMask",
            name: "MetaMask",
            provider: (windowArg) => findMetaMaskProvider(windowArg) as any,
          },
        }) as CreateConnectorFn,
      );
      continue;
    }

    if (walletId === "okxWallet") {
      connectors.push(
        injected({
          target: {
            id: "okxWallet",
            name: "OKX Wallet",
            provider: (windowArg) => findOkxProvider(windowArg) as any,
          },
        }) as CreateConnectorFn,
      );
      continue;
    }

    if (walletId === "walletConnect") {
      const projectId = config.evm.walletConnectProjectId;
      if (!projectId) {
        console.warn("WalletConnect Project ID is missing. WalletConnect will be disabled.");
        continue;
      }

      connectors.push(
        walletConnectConnector({
          projectId,
          showQrModal: true,
          qrModalOptions: {
            themeMode: "dark",
          },
          metadata: {
            name: "SNK Wallet Kit",
            description: "React wallet connection SDK for EVM and Solana.",
            url: typeof window !== "undefined" ? window.location.origin : "",
            icons: ["https://avatars.githubusercontent.com/u/1"]
          }
        }) as CreateConnectorFn,
      );
      continue;
    }

    if (walletId === "coinbaseWallet") {
      connectors.push(
        injected({
          target: {
            id: "coinbaseWallet",
            name: config.evm.coinbaseAppName ?? "Coinbase Wallet",
            provider: (windowArg) => findCoinbaseProvider(windowArg) as any,
          },
        }) as CreateConnectorFn,
      );
    }
  }

  return connectors;
}

export function createWagmiConfig(config: NormalizedWalletKitConfig): Config | null {
  const chains = resolveChains(config);
  if (!chains) {
    return null;
  }

  const connectors = createEvmConnectors(config);
  const transports = Object.fromEntries(chains.map((chain) => [chain.id, http()]));

  return createConfig({
    chains,
    connectors,
    transports,
    ssr: config.app.ssr,
  });
}

export function createEvmAdapter(
  config: NormalizedWalletKitConfig,
  wagmiConfig: Config | null = createWagmiConfig(config),
): EvmAdapter | null {
  if (!config.evm.enabled || !wagmiConfig) {
    return null;
  }

  const connectors = createEvmConnectors(config);

  return {
    config: wagmiConfig,
    connectors,
    wallets: getEnabledEvmWalletIds(config).map(toEvmWalletDescriptor),
  };
}

function toEvmWalletDescriptor(walletId: EvmWalletId): WalletDescriptor {
  if (walletId === "metaMask") {
    return {
      namespace: "evm",
      walletId,
      name: "MetaMask",
      icon: WALLET_ICONS.Metamask,
      installed: !!findMetaMaskProvider(),
      ready: true,
      description: "Connect to your MetaMask wallet.",
      downloadUrl: "https://metamask.io/",
    };
  }

  if (walletId === "okxWallet") {
    return {
      namespace: "evm",
      walletId,
      name: "OKX Wallet",
      icon: WALLET_ICONS.Okx,
      installed: !!findOkxProvider(),
      ready: true,
      description: "Connect to your OKX Wallet.",
      downloadUrl: "https://www.okx.com/web3",
    };
  }

  if (walletId === "walletConnect") {
    return {
      namespace: "evm",
      walletId,
      name: "WalletConnect",
      icon: WALLET_ICONS.WalletConnect,
      installed: true,
      ready: true,
      description: "Connect with WalletConnect.",
    };
  }

  if (walletId === "injected") {
    let name = "Browser Wallet";
    let icon: string | undefined = undefined;
    let description = "Connect to your browser's injected wallet.";
    const eth = getEthereumProvider();

    if (eth) {
      if (eth.isMetaMask) {
        name = "MetaMask";
        icon = WALLET_ICONS.Metamask;
      } else if (eth.isOKXWallet) {
        name = "OKX Wallet";
        icon = WALLET_ICONS.Okx;
      } else if (eth.isPhantom) {
        name = "Phantom";
      } else if (eth.isCoinbaseWallet) {
        name = "Coinbase Wallet";
      } else if (eth.isTrust) {
        name = "Trust Wallet";
      } else if (eth.isBitKeep) {
        name = "Bitget Wallet";
      }

      if (name !== "Browser Wallet") {
        description = `Connect to your ${name} extension.`;
      }
    }

    return {
      namespace: "evm",
      walletId,
      name,
      icon,
      installed: !!eth,
      ready: true,
      description,
    };
  }

  return {
    namespace: "evm",
    walletId,
    name: "Coinbase Wallet",
    installed: !!findCoinbaseProvider(),
    ready: true,
    description: "Connect to your Coinbase Wallet extension.",
    downloadUrl: "https://www.coinbase.com/wallet",
  };
}
