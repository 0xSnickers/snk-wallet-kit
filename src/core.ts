export type Namespace = "evm" | "sol";

export type EvmWalletId =
  | "injected"
  | "metaMask"
  | "okxWallet"
  | "walletConnect"
  | "coinbaseWallet";

export type SolWalletId = "phantom" | "solflare" | "backpack" | "jupiter";

export type WalletStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type SolCluster = "mainnet-beta" | "devnet" | "testnet";

export type WalletDescriptor = {
  namespace: Namespace;
  walletId: string;
  name: string;
  installed: boolean;
  ready: boolean;
  icon?: string;
  downloadUrl?: string;
  description?: string;
};

export type WalletSession = {
  namespace: Namespace | null;
  walletId: string | null;
  account: string | null;
  status: WalletStatus;
  connected: boolean;
  evm?: {
    chainId?: number;
  };
  sol?: {
    cluster?: SolCluster;
    publicKey?: string;
  };
};

export type EvmConfig = {
  enabled?: boolean;
  chains?: string[];
  wallets?: EvmWalletId[];
  autoConnect?: boolean;
  walletConnectProjectId?: string;
  coinbaseAppName?: string;
};

export type SolConfig = {
  enabled?: boolean;
  wallets?: SolWalletId[];
  cluster?: SolCluster;
  autoConnect?: boolean;
};

export type AppConfig = {
  storageKey?: string;
  autoReconnect?: boolean;
  ssr?: boolean;
};

export type WalletKitConfig = {
  evm?: EvmConfig;
  sol?: SolConfig;
  app?: AppConfig;
};

export type NormalizedWalletKitConfig = {
  evm: Required<Pick<EvmConfig, "enabled" | "chains" | "wallets" | "autoConnect">> &
    Pick<EvmConfig, "walletConnectProjectId" | "coinbaseAppName">;
  sol: Required<Pick<SolConfig, "enabled" | "wallets" | "cluster" | "autoConnect">>;
  app: Required<Pick<AppConfig, "storageKey" | "autoReconnect" | "ssr">>;
};

export type ConnectOptions = {
  namespace: Namespace;
  walletId: string;
};

export type TransactionRequest = {
  namespace: Namespace;
  to: string;
  value?: string;
  data?: string;
  [key: string]: unknown;
};

export type TransactionResult = {
  hash: string;
  namespace: Namespace;
};

export type SwitchChainOptions = {
  chainId: number;
};

export type SignableMessage = string | Uint8Array;

export type SignMessageResult = {
  namespace: Namespace;
  walletId: string;
  account: string;
  signature: string;
  signedMessage?: Uint8Array;
  signatureType?: string;
};

export type PersistedSession = {
  namespace: Namespace;
  walletId: string;
  version: 1;
};

export const DEFAULT_SESSION: WalletSession = {
  namespace: null,
  walletId: null,
  account: null,
  status: "idle",
  connected: false,
};

const DEFAULT_STORAGE_KEY = "snk-wallet-kit";
const DEFAULT_EVM_WALLETS: EvmWalletId[] = ["injected"];
const DEFAULT_SOL_WALLETS: SolWalletId[] = ["phantom", "solflare", "backpack", "jupiter"];

export function normalizeConfig(config: WalletKitConfig = {}): NormalizedWalletKitConfig {
  const hasExplicitWalletSelection =
    Array.isArray(config.evm?.wallets) || Array.isArray(config.sol?.wallets);
  const evmWallets = config.evm?.wallets ?? (hasExplicitWalletSelection ? [] : DEFAULT_EVM_WALLETS);
  const solWallets = config.sol?.wallets ?? (hasExplicitWalletSelection ? [] : DEFAULT_SOL_WALLETS);

  return {
    evm: {
      enabled: config.evm?.enabled ?? evmWallets.length > 0,
      chains: config.evm?.chains ?? ["mainnet", "sepolia"],
      wallets: evmWallets,
      autoConnect: config.evm?.autoConnect ?? true,
      walletConnectProjectId: config.evm?.walletConnectProjectId,
      coinbaseAppName: config.evm?.coinbaseAppName,
    },
    sol: {
      enabled: config.sol?.enabled ?? solWallets.length > 0,
      wallets: solWallets,
      cluster: config.sol?.cluster ?? "mainnet-beta",
      autoConnect: config.sol?.autoConnect ?? true,
    },
    app: {
      storageKey: config.app?.storageKey ?? DEFAULT_STORAGE_KEY,
      autoReconnect: config.app?.autoReconnect ?? true,
      ssr: config.app?.ssr ?? true,
    },
  };
}

export enum WalletErrorCode {
  WalletNotFound = "WALLET_NOT_FOUND",
  WalletNotInstalled = "WALLET_NOT_INSTALLED",
  ConnectRejected = "CONNECT_REJECTED",
  ConnectFailed = "CONNECT_FAILED",
  DisconnectFailed = "DISCONNECT_FAILED",
  UnsupportedFeature = "UNSUPPORTED_FEATURE",
  ChainNotSupported = "CHAIN_NOT_SUPPORTED",
  ClusterNotSupported = "CLUSTER_NOT_SUPPORTED",
  AutoReconnectFailed = "AUTO_RECONNECT_FAILED",
  ProviderNotReady = "PROVIDER_NOT_READY",
}

export class WalletKitError extends Error {
  code: WalletErrorCode;
  namespace?: Namespace;
  walletId?: string;
  cause?: unknown;

  constructor(
    code: WalletErrorCode,
    message: string,
    options: {
      namespace?: Namespace;
      walletId?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "WalletKitError";
    this.code = code;
    this.namespace = options.namespace;
    this.walletId = options.walletId;
    this.cause = options.cause;
  }
}

export function normalizeWalletError(
  error: unknown,
  fallbackCode: WalletErrorCode,
  message: string,
  options: {
    namespace?: Namespace;
    walletId?: string;
  } = {},
): WalletKitError {
  if (error instanceof WalletKitError) {
    return error;
  }

  return new WalletKitError(fallbackCode, error instanceof Error ? error.message : message, {
    namespace: options.namespace,
    walletId: options.walletId,
    cause: error,
  });
}

export type WalletEventMap = {
  connected: WalletSession;
  disconnected: { namespace: Namespace; walletId: string | null };
  accountChanged: { namespace: Namespace; account: string | null };
  networkChanged: { namespace: Namespace; chainId?: number; cluster?: string };
  error: { code: string; message: string; cause?: unknown };
};

type EventKey = keyof WalletEventMap;
type Listener<K extends EventKey> = (payload: WalletEventMap[K]) => void;

export class WalletEventEmitter {
  private listeners = new Map<EventKey, Set<Listener<EventKey>>>();

  on<K extends EventKey>(event: K, listener: Listener<K>): () => void {
    const current = this.listeners.get(event) ?? new Set();
    current.add(listener as Listener<EventKey>);
    this.listeners.set(event, current);

    return () => {
      current.delete(listener as Listener<EventKey>);
      if (current.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends EventKey>(event: K, payload: WalletEventMap[K]): void {
    const current = this.listeners.get(event);
    if (!current) {
      return;
    }

    for (const listener of current) {
      listener(payload as WalletEventMap[EventKey]);
    }
  }
}

export function toMessageBytes(message: SignableMessage): Uint8Array {
  if (message instanceof Uint8Array) {
    return message;
  }

  return new TextEncoder().encode(message);
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
