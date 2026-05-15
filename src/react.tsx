"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
  type WalletWithStandardFeatures,
} from "@wallet-standard/features";
import {
  connect as wagmiConnect,
  disconnect as wagmiDisconnect,
  getConnection as getWagmiConnection,
  reconnect as wagmiReconnect,
  sendTransaction as wagmiSendTransaction,
  signMessage as wagmiSignMessage,
  switchChain as wagmiSwitchChain,
  watchConnection,
} from "@wagmi/core";
import { WagmiProvider, type Config } from "wagmi";

import { createEvmAdapter, createWagmiConfig } from "./adapters/evm";
import { createSolAdapter, resolveWalletId, toSolWalletDescriptors } from "./adapters/sol";
import {
  bytesToHex,
  DEFAULT_SESSION,
  WalletErrorCode,
  WalletKitError,
  normalizeConfig,
  normalizeWalletError,
  toMessageBytes,
  type ConnectOptions,
  type NormalizedWalletKitConfig,
  type SignMessageResult,
  type SignableMessage,
  type SwitchChainOptions,
  type TransactionRequest,
  type TransactionResult,
  type WalletDescriptor,
  type WalletKitConfig,
  type WalletSession,
} from "./core";
import {
  clearPersistedSession,
  createDefaultStorage,
  readPersistedSession,
  writePersistedSession,
  type StorageAdapter,
} from "./runtime";
import { WalletContext, WalletModalContext } from "./hooks/use-wallet";
import { SolanaSignAndSendTransaction, SolanaSignMessage } from "@solana/wallet-standard-features";
import { injectStyles } from "./ui/index";

export * from "./hooks/index";
export * from "./hooks/use-wallet";
export { createWagmiConfig as createWalletKitEvmConfig } from "./adapters/evm";

type WalletProviderEnvironment = {
  queryClient: QueryClient;
  wagmiConfig: Config | null;
};

const WalletProviderEnvironmentContext = createContext<WalletProviderEnvironment | null>(null);

export type WalletKitProviderProps = PropsWithChildren<{
  config?: WalletKitConfig;
  storage?: StorageAdapter;
}>;

export type WalletProviderProps = WalletKitProviderProps;

export type WalletCoreProviderProps = PropsWithChildren<{
  config?: WalletKitConfig;
  storage?: StorageAdapter;
  queryClient: QueryClient;
  wagmiConfig: Config | null;
}>;

type WalletProviderBaseProps = PropsWithChildren<{
  normalizedConfig: NormalizedWalletKitConfig;
  storage?: StorageAdapter;
  queryClient: QueryClient;
  wagmiConfig: Config | null;
}>;

function useWalletProviderEnvironment(): WalletProviderEnvironment {
  const context = useContext(WalletProviderEnvironmentContext);
  if (!context) {
    throw new Error("Wallet provider environment requires WalletKitProvider or WalletCoreProvider.");
  }
  return context;
}

export function useWalletKitQueryClient(): QueryClient {
  return useWalletProviderEnvironment().queryClient;
}

export function useWalletKitWagmiConfig(): Config | null {
  return useWalletProviderEnvironment().wagmiConfig;
}

function WalletProviderBase({
  children,
  normalizedConfig,
  storage,
  queryClient,
  wagmiConfig,
}: WalletProviderBaseProps): ReactElement {
  useEffect(() => {
    injectStyles();
  }, []);

  const evmAdapter = useMemo(
    () => createEvmAdapter(normalizedConfig, wagmiConfig),
    [normalizedConfig, wagmiConfig],
  );
  const solAdapter = useMemo(() => createSolAdapter(normalizedConfig), [normalizedConfig]);
  const resolvedStorage = useMemo(() => storage ?? createDefaultStorage(), [storage]);
  const [session, setSession] = useState<WalletSession>(DEFAULT_SESSION);
  const [wallets, setWallets] = useState<WalletDescriptor[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<WalletKitError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const solEventsCleanupRef = useRef<(() => void) | null>(null);
  const autoReconnectAttemptedRef = useRef(false);
  const connectInFlightRef = useRef(false);

  const inferEvmWalletIdFromConnector = useCallback((connector: { id?: string; name?: string }): string => {
    const id = connector.id?.toLowerCase() ?? "";
    const name = connector.name?.toLowerCase() ?? "";
    if (id === "metamask" || id === "io.metamask" || name.includes("metamask")) return "metaMask";
    if (id === "okxwallet" || id === "com.okx.wallet" || id === "okx" || name.includes("okx")) return "okxWallet";
    if (id === "walletconnect" || name.includes("walletconnect")) return "walletConnect";
    if (id === "coinbasewallet" || name.includes("coinbase")) return "coinbaseWallet";
    return connector.id ?? "injected";
  }, []);

  const resolveEvmConnector = useCallback(
    async (walletId: string) => {
      if (!evmAdapter) return null;
      const connectors = evmAdapter.config.connectors;
      const directMatch = connectors.find((item) => item.id === walletId);
      if (directMatch) return directMatch;

      const idMap: Record<string, string[]> = {
        metaMask: ["io.metamask", "metamask", "injected"],
        okxWallet: ["com.okx.wallet", "okxwallet", "okx", "injected"],
      };

      for (const id of idMap[walletId] || [walletId]) {
        const match = connectors.find((c) => c.id === id);
        if (match) {
          try {
            const provider = await match.getProvider();
            if (!provider) continue;
            if (id === "injected") {
              const p = provider as any;
              if (walletId === "metaMask" && (!p.isMetaMask || p.isOKXWallet || p.isOkxWallet)) continue;
              if (walletId === "okxWallet" && !p.isOKXWallet && !p.isOkxWallet) continue;
            }
            return match;
          } catch { continue; }
        }
      }
      return connectors.find((item) => {
        const name = item.name.toLowerCase();
        return walletId === "metaMask" ? name.includes("metamask") : name.includes("okx");
      }) ?? null;
    },
    [evmAdapter],
  );

  useEffect(() => {
    const updateWallets = () => {
      const nextWallets: WalletDescriptor[] = [];
      if (evmAdapter) nextWallets.push(...evmAdapter.wallets);
      if (solAdapter) nextWallets.push(...toSolWalletDescriptors(solAdapter.wallets));
      
      const seen = new Set<string>();
      const uniqueWallets: WalletDescriptor[] = [];
      
      nextWallets.forEach((wallet) => {
        if (wallet.namespace === "sol") {
          const key = `${wallet.namespace}:${wallet.name}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueWallets.push(wallet);
          }
        } else {
          const key = `${wallet.namespace}:${wallet.walletId}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueWallets.push(wallet);
          }
        }
      });
      
      setWallets(uniqueWallets);
    };
    updateWallets();
    if (solAdapter) return solAdapter.on("change", updateWallets);
  }, [evmAdapter, solAdapter]);

  useEffect(() => {
    const persisted = readPersistedSession(resolvedStorage, normalizedConfig.app.storageKey);
    if (!persisted) {
      setSession({ ...DEFAULT_SESSION, status: "disconnected" });
    } else {
      setSession({ ...DEFAULT_SESSION, namespace: persisted.namespace, walletId: persisted.walletId, status: "disconnected" });
    }
    setHydrated(true);
  }, [normalizedConfig.app.storageKey, resolvedStorage]);

  useEffect(() => {
    if (!evmAdapter) return;
    return watchConnection(evmAdapter.config, {
      onChange(connection) {
        if (connection.status === "connected" && connection.connector) {
          setError(null);
          setSession((current) => ({
            namespace: "evm",
            walletId: current.namespace === "evm" && current.walletId ? current.walletId : inferEvmWalletIdFromConnector(connection.connector),
            account: connection.address,
            status: "connected",
            connected: true,
            evm: { chainId: connection.chainId },
          }));
        } else if (connection.status === "connecting" || connection.status === "reconnecting") {
          setSession((current) => ({ ...current, status: "connecting" }));
        } else {
          setSession((current) => current.namespace === "evm" ? { ...DEFAULT_SESSION, status: "disconnected" } : current);
        }
      },
    });
  }, [evmAdapter, inferEvmWalletIdFromConnector]);

  const subscribeToSolWallet = useCallback((wallet: WalletWithStandardFeatures) => {
    solEventsCleanupRef.current?.();
    const eventsFeature = (wallet.features as any)[StandardEvents];
    if (!eventsFeature) return;
    solEventsCleanupRef.current = eventsFeature.on("change", ({ accounts }: any) => {
      if (!accounts || accounts.length === 0) {
        setSession({ ...DEFAULT_SESSION, status: "disconnected", namespace: "sol" });
        return;
      }
      const primaryAccount = accounts[0];
      setError(null);
      setSession({
        namespace: "sol",
        walletId: resolveWalletId(wallet),
        account: primaryAccount.address,
        status: "connected",
        connected: true,
        sol: { cluster: normalizedConfig.sol.cluster, publicKey: primaryAccount.address },
      });
    });
  }, [normalizedConfig.sol.cluster]);

  const connectSolWallet = useCallback(async (walletId: string, silent = false): Promise<void> => {
    if (!solAdapter) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "Solana adapter is not available.");
    
    const candidates = solAdapter.wallets.filter((w) => resolveWalletId(w) === walletId);
    
    let wallet: WalletWithStandardFeatures | undefined;
    if (candidates.length === 1) {
      wallet = candidates[0] as WalletWithStandardFeatures;
    } else if (candidates.length > 1) {
      const targetName = walletId.toLowerCase();
      wallet = candidates.find(w => 
        w.name.toLowerCase() === targetName || 
        w.name.toLowerCase() === `${targetName} wallet` ||
        (w as any).id?.toLowerCase() === targetName
      ) as WalletWithStandardFeatures;
      
      if (!wallet) {
        wallet = candidates[0] as WalletWithStandardFeatures;
      }
    }

    if (!wallet) throw new WalletKitError(WalletErrorCode.WalletNotFound, "Solana wallet was not found.");
    const connectFeature = (wallet.features as any)[StandardConnect];
    if (!connectFeature) throw new WalletKitError(WalletErrorCode.UnsupportedFeature, "Wallet does not support standard:connect.");

    setError(null);
    setSession((current) => ({ ...current, namespace: "sol", walletId, status: "connecting" }));
    try {
      const result = await connectFeature.connect(silent ? { silent: true } : undefined);
      const primaryAccount = result.accounts[0] ?? wallet.accounts[0];
      if (!primaryAccount) throw new WalletKitError(WalletErrorCode.ConnectFailed, "No authorized account returned.");
      subscribeToSolWallet(wallet);
      setSession({
        namespace: "sol",
        walletId,
        account: primaryAccount.address,
        status: "connected",
        connected: true,
        sol: { cluster: normalizedConfig.sol.cluster, publicKey: primaryAccount.address },
      });
      writePersistedSession(resolvedStorage, normalizedConfig.app.storageKey, { namespace: "sol", walletId, version: 1 });
    } catch (caughtError) {
      const err = normalizeWalletError(caughtError, WalletErrorCode.ConnectFailed, "Failed to connect Solana wallet.");
      setError(err);
      setSession((current) => ({ ...current, status: "error" }));
      throw err;
    }
  }, [normalizedConfig.app.storageKey, normalizedConfig.sol.cluster, resolvedStorage, solAdapter, subscribeToSolWallet]);

  const connectWallet = useCallback(async (options: ConnectOptions): Promise<void> => {
    if (connectInFlightRef.current) return;
    connectInFlightRef.current = true;
    try {
      if (options.namespace === "sol") {
        await connectSolWallet(options.walletId);
        return;
      }
      if (!evmAdapter) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "EVM adapter not available.");
      const connector = await resolveEvmConnector(options.walletId);
      if (!connector) throw new WalletKitError(WalletErrorCode.WalletNotFound, "EVM wallet not found.");

      if (session.namespace === "evm" && session.connected && options.walletId !== session.walletId) {
        const currentConnection = getWagmiConnection(evmAdapter.config);
        if (currentConnection.connector) await wagmiDisconnect(evmAdapter.config, { connector: currentConnection.connector });
      }

      setError(null);
      setSession((current) => ({ ...current, namespace: "evm", walletId: options.walletId, status: "connecting" }));
      const result = await wagmiConnect(evmAdapter.config, { connector });
      
      // Clear error if success
      setError(null);

      setSession({
        namespace: "evm",
        walletId: options.walletId,
        account: result.accounts[0] ?? null,
        status: "connected",
        connected: true,
        evm: { chainId: result.chainId },
      });
      writePersistedSession(resolvedStorage, normalizedConfig.app.storageKey, { namespace: "evm", walletId: options.walletId, version: 1 });
    } catch (caughtError) {
      console.error("Wallet connection failed:", caughtError);
      const message = caughtError instanceof Error ? caughtError.message.toLowerCase() : "";
      const isRejected = message.includes("user rejected") || message.includes("user denied") || (typeof caughtError === "object" && caughtError !== null && "code" in caughtError && ((caughtError as any).code === 4001 || (caughtError as any).code === "ACTION_REJECTED"));
      const err = normalizeWalletError(caughtError, isRejected ? WalletErrorCode.ConnectRejected : WalletErrorCode.ConnectFailed, "Connection failed.");
      setError(err);
      setSession({ ...DEFAULT_SESSION, status: "disconnected" });
      throw err;
    } finally { connectInFlightRef.current = false; }
  }, [connectSolWallet, evmAdapter, normalizedConfig.app.storageKey, resolveEvmConnector, resolvedStorage, session.connected, session.namespace, session.walletId]);

  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      if (session.namespace === "sol") {
        const wallet = solAdapter?.wallets.find((w) => resolveWalletId(w) === session.walletId) as any;
        await wallet?.features?.[StandardDisconnect]?.disconnect();
        solEventsCleanupRef.current?.();
        solEventsCleanupRef.current = null;
      } else if (session.namespace === "evm" && evmAdapter) {
        const connection = getWagmiConnection(evmAdapter.config);
        if (connection.connector) await wagmiDisconnect(evmAdapter.config, { connector: connection.connector });
      }
      setError(null);
      clearPersistedSession(resolvedStorage, normalizedConfig.app.storageKey);
      setSession({ ...DEFAULT_SESSION, status: "disconnected" });
    } catch (caughtError) {
      const err = normalizeWalletError(caughtError, WalletErrorCode.DisconnectFailed, "Failed to disconnect.");
      setError(err);
      throw err;
    }
  }, [evmAdapter, normalizedConfig.app.storageKey, resolvedStorage, session.namespace, session.walletId, solAdapter]);

  const reconnectWallet = useCallback(async (): Promise<void> => {
    const persisted = readPersistedSession(resolvedStorage, normalizedConfig.app.storageKey);
    if (!persisted) return;
    if (persisted.namespace === "sol") {
      await connectSolWallet(persisted.walletId, true);
      return;
    }
    if (!evmAdapter) return;
    try {
      setError(null);
      await wagmiReconnect(evmAdapter.config);
      const connection = getWagmiConnection(evmAdapter.config);
      if (connection.status === "connected" && connection.connector) {
        setSession({
          namespace: "evm",
          walletId: persisted.walletId,
          account: connection.address,
          status: "connected",
          connected: true,
          evm: { chainId: connection.chainId },
        });
      }
    } catch (caughtError) {
      const err = normalizeWalletError(caughtError, WalletErrorCode.AutoReconnectFailed, "Reconnect failed.");
      setError(err);
      throw err;
    }
  }, [connectSolWallet, evmAdapter, normalizedConfig.app.storageKey, resolvedStorage]);

  const signMessage = useCallback(async (message: SignableMessage): Promise<SignMessageResult> => {
    if (!session.namespace || !session.walletId || !session.account) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "No connected wallet.");
    try {
      if (session.namespace === "evm") {
        if (!evmAdapter) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "EVM adapter not available.");
        const signature = await wagmiSignMessage(evmAdapter.config, { message: typeof message === "string" ? message : { raw: message } });
        setError(null);
        return { namespace: "evm", walletId: session.walletId, account: session.account, signature };
      }
      const wallet = solAdapter?.wallets.find((w) => resolveWalletId(w) === session.walletId) as any;
      if (!wallet) throw new WalletKitError(WalletErrorCode.WalletNotFound, "Solana wallet not found.");
      const account = wallet.accounts.find((item: any) => item.address === session.account) ?? wallet.accounts[0];
      const signMessageFeature = wallet.features[SolanaSignMessage];
      if (!signMessageFeature) throw new WalletKitError(WalletErrorCode.UnsupportedFeature, "Wallet does not support signMessage.");
      const [result] = await signMessageFeature.signMessage({ account, message: toMessageBytes(message) });
      setError(null);
      return { namespace: "sol", walletId: session.walletId, account: session.account, signature: bytesToHex(result.signature), signedMessage: result.signedMessage, signatureType: result.signatureType };
    } catch (caughtError) {
      const err = normalizeWalletError(caughtError, WalletErrorCode.UnsupportedFeature, "Failed to sign message.");
      setError(err);
      throw err;
    }
  }, [evmAdapter, session.account, session.namespace, session.walletId, solAdapter]);

  const sendTransaction = useCallback(async (request: TransactionRequest): Promise<TransactionResult> => {
    if (!session.namespace || !session.walletId || !session.account) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "No connected wallet.");
    try {
      if (session.namespace === "evm") {
        if (!evmAdapter) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "EVM adapter not available.");
        const hash = await wagmiSendTransaction(evmAdapter.config, { to: request.to as `0x${string}`, value: request.value ? BigInt(request.value) : undefined, data: request.data as `0x${string}` | undefined });
        return { hash, namespace: "evm" };
      }
      const wallet = solAdapter?.wallets.find((w) => resolveWalletId(w) === session.walletId) as any;
      const account = wallet?.accounts.find((item: any) => item.address === session.account) ?? wallet?.accounts[0];
      const signAndSendFeature = wallet?.features[SolanaSignAndSendTransaction];
      if (!signAndSendFeature) throw new WalletKitError(WalletErrorCode.UnsupportedFeature, "Wallet does not support signAndSendTransaction.");
      const [result] = await signAndSendFeature.signAndSendTransaction({ account, transaction: request.data as any, chain: `solana:${normalizedConfig.sol.cluster}` as any });
      return { hash: bytesToHex(result.signature), namespace: "sol" };
    } catch (caughtError) {
      const err = normalizeWalletError(caughtError, WalletErrorCode.ConnectFailed, "Transaction failed.");
      setError(err);
      throw err;
    }
  }, [evmAdapter, normalizedConfig.sol.cluster, session, solAdapter]);

  const switchChain = useCallback(async (options: SwitchChainOptions): Promise<void> => {
    if (session.namespace !== "evm" || !evmAdapter) throw new WalletKitError(WalletErrorCode.UnsupportedFeature, "Switching chain is only supported for EVM.");
    try { await wagmiSwitchChain(evmAdapter.config, { chainId: options.chainId }); }
    catch (caughtError) {
      const err = normalizeWalletError(caughtError, WalletErrorCode.ChainNotSupported, "Failed to switch chain.");
      setError(err);
      throw err;
    }
  }, [evmAdapter, session.namespace]);

  useEffect(() => {
    if (hydrated && !autoReconnectAttemptedRef.current && normalizedConfig.app.autoReconnect) {
      autoReconnectAttemptedRef.current = true;
      reconnectWallet().catch(() => setSession((current) => ({ ...current, status: "disconnected" })));
    }
  }, [hydrated, normalizedConfig.app.autoReconnect, reconnectWallet]);

  useEffect(() => {
    if (session.connected) setModalOpen(false);
  }, [session.connected]);

  const contextValue = useMemo(() => ({
    config: normalizedConfig, session, wallets, hydrated, error, connect: connectWallet, disconnect: disconnectWallet, reconnect: reconnectWallet, signMessage, sendTransaction, switchChain,
  }), [connectWallet, disconnectWallet, error, hydrated, normalizedConfig, reconnectWallet, session, signMessage, sendTransaction, switchChain, wallets]);

  const modalContextValue = useMemo(() => ({
    open: modalOpen, setOpen: setModalOpen, openModal: () => setModalOpen(true), closeModal: () => setModalOpen(false),
  }), [modalOpen]);

  return (
    <WalletProviderEnvironmentContext.Provider value={{ queryClient, wagmiConfig }}>
      <WalletModalContext.Provider value={modalContextValue}>
        <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>
      </WalletModalContext.Provider>
    </WalletProviderEnvironmentContext.Provider>
  );
}

export function WalletCoreProvider({
  children,
  config,
  storage,
  queryClient,
  wagmiConfig,
}: WalletCoreProviderProps): ReactElement {
  const normalizedConfig = useMemo(() => normalizeConfig(config), [config]);

  return (
    <WalletProviderBase
      normalizedConfig={normalizedConfig}
      storage={storage}
      queryClient={queryClient}
      wagmiConfig={wagmiConfig}
    >
      {children}
    </WalletProviderBase>
  );
}

export function WalletKitProvider({
  children,
  config,
  storage,
}: WalletKitProviderProps): ReactElement {
  const normalizedConfig = useMemo(() => normalizeConfig(config), [config]);
  const [queryClient] = useState(() => new QueryClient());
  const wagmiConfig = useMemo(() => createWagmiConfig(normalizedConfig), [normalizedConfig]);

  const provider = (
    <WalletProviderBase
      normalizedConfig={normalizedConfig}
      storage={storage}
      queryClient={queryClient}
      wagmiConfig={wagmiConfig}
    >
      {children}
    </WalletProviderBase>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {wagmiConfig ? (
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          {provider}
        </WagmiProvider>
      ) : (
        provider
      )}
    </QueryClientProvider>
  );
}

export const WalletProvider = WalletKitProvider;
