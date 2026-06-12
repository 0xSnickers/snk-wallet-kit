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
  getConnections as getWagmiConnections,
  sendTransaction as wagmiSendTransaction,
  signMessage as wagmiSignMessage,
  switchChain as wagmiSwitchChain,
  watchConnection,
} from "@wagmi/core";
import { WagmiProvider, type Config } from "wagmi";

import { createEvmAdapter, createWagmiConfig } from "./adapters/evm";
import { createSolAdapter, resolveWalletId, toSolWalletDescriptors } from "./adapters/sol";
import {
  bytesToBase58,
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

export * from "./hooks/index";
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
  const solConnectPromiseRef = useRef<Promise<void> | null>(null);
  const solConnectedWalletRef = useRef<WalletWithStandardFeatures | null>(null);
  const solConnectedAccountRef = useRef<any>(null);

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
    } else if (persisted.namespace === "sol") {
      setSession({
        ...DEFAULT_SESSION,
        namespace: persisted.namespace,
        walletId: persisted.walletId,
        status: "disconnected",
      });
    } else {
      clearPersistedSession(resolvedStorage, normalizedConfig.app.storageKey);
      setSession({ ...DEFAULT_SESSION, status: "disconnected" });
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
        solConnectedWalletRef.current = null;
        solConnectedAccountRef.current = null;
        setSession({ ...DEFAULT_SESSION, status: "disconnected", namespace: "sol" });
        return;
      }
      const primaryAccount = resolveSolAccount(wallet, accounts);
      if (!primaryAccount) {
        solConnectedWalletRef.current = null;
        solConnectedAccountRef.current = null;
        setSession({ ...DEFAULT_SESSION, status: "disconnected", namespace: "sol" });
        return;
      }
      const publicKey = getSolAccountAddress(primaryAccount);
      if (!publicKey) {
        solConnectedWalletRef.current = null;
        solConnectedAccountRef.current = null;
        setSession({ ...DEFAULT_SESSION, status: "disconnected", namespace: "sol" });
        return;
      }
      solConnectedWalletRef.current = wallet;
      solConnectedAccountRef.current = primaryAccount;
      setError(null);
      setSession({
        namespace: "sol",
        walletId: resolveWalletId(wallet),
        account: publicKey,
        status: "connected",
        connected: true,
        sol: { cluster: normalizedConfig.sol.cluster, publicKey },
      });
    });
  }, [normalizedConfig.sol.cluster]);


  const resolveSolWallet = useCallback((walletId: string): WalletWithStandardFeatures | undefined => {
    const candidates = solAdapter?.wallets.filter((wallet) => resolveWalletId(wallet) === walletId) ?? [];
    if (candidates.length === 0) return undefined;

    const ranked = [...candidates].reverse();
    const targetName = walletId.toLowerCase();

    return ranked.find((wallet) => {
      const name = wallet.name.toLowerCase();
      const id = (wallet as any).id?.toLowerCase() ?? "";
      return id === targetName || name === targetName || name === `${targetName} wallet`;
    }) as WalletWithStandardFeatures | undefined ?? ranked[0] as WalletWithStandardFeatures;
  }, [solAdapter]);

  const getSolAccountAddress = useCallback((account: any): string | null => {
    if (account?.publicKey instanceof Uint8Array && account.publicKey.length > 0) {
      return bytesToBase58(account.publicKey);
    }

    if (typeof account?.address === "string" && account.address.length > 0 && !account.address.startsWith("0x")) {
      return account.address;
    }

    return null;
  }, []);

  const resolveSolAccount = useCallback((wallet: WalletWithStandardFeatures, accounts?: readonly any[]) => {
    const candidates = (accounts && accounts.length > 0 ? accounts : wallet.accounts) as readonly any[];
    const targetChain = `solana:${normalizedConfig.sol.cluster}`;

    return candidates.find((account) => account?.chains?.includes(targetChain))
      ?? candidates.find((account) => account?.chains?.some((chain: string) => chain.startsWith("solana:")))
      ?? candidates.find((account) => account?.features?.includes(SolanaSignMessage))
      ?? candidates.find((account) => account?.features?.includes(SolanaSignAndSendTransaction))
      ?? candidates[0]
      ?? null;
  }, [normalizedConfig.sol.cluster]);


  const disconnectAllEvmConnections = useCallback(async () => {
    if (!evmAdapter) return;

    const connections = getWagmiConnections(evmAdapter.config);
    if (connections.length === 0) return;

    for (const connection of connections) {
      await wagmiDisconnect(evmAdapter.config, { connector: connection.connector });
    }
  }, [evmAdapter]);
  const connectSolWallet = useCallback(async (walletId: string, silent = false): Promise<void> => {
    if (!solAdapter) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "Solana adapter is not available.");
    if (solConnectPromiseRef.current) return solConnectPromiseRef.current;

    const run = (async () => {
      const wallet = resolveSolWallet(walletId);

      if (!wallet) throw new WalletKitError(WalletErrorCode.WalletNotFound, "Solana wallet was not found.");
      const connectFeature = (wallet.features as any)[StandardConnect];
      if (!connectFeature) throw new WalletKitError(WalletErrorCode.UnsupportedFeature, "Wallet does not support standard:connect.");

      setError(null);
      setSession((current) => ({ ...current, namespace: "sol", walletId, status: "connecting" }));
      try {
        const result = await connectFeature.connect(silent ? { silent: true } : undefined);
        const primaryAccount = resolveSolAccount(wallet, result.accounts.length > 0 ? result.accounts : wallet.accounts);
        if (!primaryAccount) throw new WalletKitError(WalletErrorCode.ConnectFailed, "No authorized Solana account returned.");
        const publicKey = getSolAccountAddress(primaryAccount);
        if (!publicKey) throw new WalletKitError(WalletErrorCode.ConnectFailed, "No authorized Solana account returned.");
        solConnectedWalletRef.current = wallet;
        solConnectedAccountRef.current = primaryAccount;
        subscribeToSolWallet(wallet);
        setSession({
          namespace: "sol",
          walletId,
          account: publicKey,
          status: "connected",
          connected: true,
          sol: { cluster: normalizedConfig.sol.cluster, publicKey },
        });
        writePersistedSession(resolvedStorage, normalizedConfig.app.storageKey, { namespace: "sol", walletId, version: 1 });
      } catch (caughtError) {
        const rawMessage = caughtError instanceof Error ? caughtError.message : "";
        const normalizedMessage = rawMessage.toLowerCase();
        const isRejected = normalizedMessage.includes("user rejected") || normalizedMessage.includes("user denied") || normalizedMessage.includes("rejected the request");
        const isPhantomPortError = walletId === "phantom" && (
          normalizedMessage === "unexpected error" ||
          normalizedMessage.includes("disconnected port object") ||
          normalizedMessage.includes("failed to send message to service worker")
        );
        const err = isPhantomPortError
          ? new WalletKitError(
              WalletErrorCode.ConnectFailed,
              "Phantom extension connection was interrupted. Please unlock Phantom, reopen the extension popup, and try connecting again.",
              { namespace: "sol", walletId, cause: caughtError },
            )
          : normalizeWalletError(
              caughtError,
              isRejected ? WalletErrorCode.ConnectRejected : WalletErrorCode.ConnectFailed,
              "Failed to connect Solana wallet.",
              { namespace: "sol", walletId },
            );
        setError(err);
        setSession((current) => ({ ...DEFAULT_SESSION, namespace: current.namespace === "sol" ? "sol" : null, walletId: current.namespace === "sol" ? walletId : null, status: "disconnected" }));
        throw err;
      }
    })();

    solConnectPromiseRef.current = run;
    try {
      await run;
    } finally {
      solConnectPromiseRef.current = null;
    }
  }, [normalizedConfig.app.storageKey, normalizedConfig.sol.cluster, resolveSolWallet, resolvedStorage, solAdapter, subscribeToSolWallet]);



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

      const currentConnection = getWagmiConnection(evmAdapter.config);
      const isSwitchingWallet = session.namespace === "evm" && session.walletId !== options.walletId;
      const hasStaleCurrentConnector = currentConnection.connector?.uid === connector.uid;
      const hasOtherActiveConnections = getWagmiConnections(evmAdapter.config).some(
        (connection) => connection.connector.uid !== connector.uid,
      );

      if (isSwitchingWallet || hasStaleCurrentConnector || hasOtherActiveConnections) {
        await disconnectAllEvmConnections();
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
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message.toLowerCase() : "";
      const isRejected = message.includes("user rejected") || message.includes("user denied") || (typeof caughtError === "object" && caughtError !== null && "code" in caughtError && ((caughtError as any).code === 4001 || (caughtError as any).code === "ACTION_REJECTED"));
      const err = normalizeWalletError(caughtError, isRejected ? WalletErrorCode.ConnectRejected : WalletErrorCode.ConnectFailed, "Connection failed.");
      setError(err);
      setSession({ ...DEFAULT_SESSION, status: "disconnected" });
      throw err;
    } finally { connectInFlightRef.current = false; }
  }, [connectSolWallet, disconnectAllEvmConnections, evmAdapter, resolveEvmConnector, session.namespace, session.walletId]);

  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      if (session.namespace === "sol") {
        const wallet = solConnectedWalletRef.current ?? (session.walletId ? resolveSolWallet(session.walletId) as any : null);
        await wallet?.features?.[StandardDisconnect]?.disconnect();
        solEventsCleanupRef.current?.();
        solEventsCleanupRef.current = null;
        solConnectedWalletRef.current = null;
        solConnectedAccountRef.current = null;
        clearPersistedSession(resolvedStorage, normalizedConfig.app.storageKey);
      } else if (session.namespace === "evm" && evmAdapter) {
        await disconnectAllEvmConnections();
      }
      setError(null);
      setSession({ ...DEFAULT_SESSION, status: "disconnected" });
    } catch (caughtError) {
      const err = normalizeWalletError(caughtError, WalletErrorCode.DisconnectFailed, "Failed to disconnect.");
      setError(err);
      throw err;
    }
  }, [disconnectAllEvmConnections, evmAdapter, normalizedConfig.app.storageKey, resolveSolWallet, resolvedStorage, session.namespace, session.walletId]);

  const reconnectWallet = useCallback(async (): Promise<void> => {
    const persisted = readPersistedSession(resolvedStorage, normalizedConfig.app.storageKey);
    if (!persisted || persisted.namespace !== "sol") return;
    await connectSolWallet(persisted.walletId, true);
  }, [connectSolWallet, normalizedConfig.app.storageKey, resolvedStorage]);

  const signMessage = useCallback(async (message: SignableMessage): Promise<SignMessageResult> => {
    if (!session.namespace || !session.walletId || !session.account) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "No connected wallet.");
    try {
      if (session.namespace === "evm") {
        if (!evmAdapter) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "EVM adapter not available.");
        const signature = await wagmiSignMessage(evmAdapter.config, { message: typeof message === "string" ? message : { raw: message } });
        setError(null);
        return { namespace: "evm", walletId: session.walletId, account: session.account, signature };
      }
      const wallet = solConnectedWalletRef.current ?? (session.walletId ? resolveSolWallet(session.walletId) as any : null);
      if (!wallet) throw new WalletKitError(WalletErrorCode.WalletNotFound, "Solana wallet not found.");
      const account = getSolAccountAddress(solConnectedAccountRef.current) === session.account
        ? solConnectedAccountRef.current
        : resolveSolAccount(wallet);
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
  }, [evmAdapter, resolveSolAccount, resolveSolWallet, session.account, session.namespace, session.walletId]);

  const sendTransaction = useCallback(async (request: TransactionRequest): Promise<TransactionResult> => {
    if (!session.namespace || !session.walletId || !session.account) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "No connected wallet.");
    try {
      if (session.namespace === "evm") {
        if (!evmAdapter) throw new WalletKitError(WalletErrorCode.ProviderNotReady, "EVM adapter not available.");
        const hash = await wagmiSendTransaction(evmAdapter.config, { to: request.to as `0x${string}`, value: request.value ? BigInt(request.value) : undefined, data: request.data as `0x${string}` | undefined });
        return { hash, namespace: "evm" };
      }
      const wallet = solConnectedWalletRef.current ?? (session.walletId ? resolveSolWallet(session.walletId) as any : null);
      const account = getSolAccountAddress(solConnectedAccountRef.current) === session.account
        ? solConnectedAccountRef.current
        : wallet ? resolveSolAccount(wallet) : null;
      const signAndSendFeature = wallet?.features[SolanaSignAndSendTransaction];
      if (!signAndSendFeature) throw new WalletKitError(WalletErrorCode.UnsupportedFeature, "Wallet does not support signAndSendTransaction.");
      const [result] = await signAndSendFeature.signAndSendTransaction({ account, transaction: request.data as any, chain: `solana:${normalizedConfig.sol.cluster}` as any });
      return { hash: bytesToHex(result.signature), namespace: "sol" };
    } catch (caughtError) {
      const err = normalizeWalletError(caughtError, WalletErrorCode.ConnectFailed, "Transaction failed.");
      setError(err);
      throw err;
    }
  }, [evmAdapter, normalizedConfig.sol.cluster, resolveSolAccount, resolveSolWallet, session]);


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
    if (hydrated && !autoReconnectAttemptedRef.current && normalizedConfig.sol.autoReconnect) {
      autoReconnectAttemptedRef.current = true;
      reconnectWallet().catch(() => setSession((current) => ({ ...current, status: "disconnected" })));
    }
  }, [hydrated, normalizedConfig.sol.autoReconnect, reconnectWallet]);

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
        <WagmiProvider config={wagmiConfig} reconnectOnMount={normalizedConfig.evm.reconnectOnMount}>
          {provider}
        </WagmiProvider>
      ) : (
        provider
      )}
    </QueryClientProvider>
  );
}

export const WalletProvider = WalletKitProvider;
