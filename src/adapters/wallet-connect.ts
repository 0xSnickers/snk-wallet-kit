// @ts-nocheck
import {
  ChainNotConfiguredError,
  createConnector,
  type CreateConnectorFn,
  extractRpcUrls,
  ProviderNotFoundError,
} from "@wagmi/core";
import {
  getAddress,
  numberToHex,
  SwitchChainError,
  UserRejectedRequestError,
} from "viem";

type WalletConnectParameters = {
  projectId: string;
  showQrModal?: boolean;
  qrModalOptions?: Record<string, unknown>;
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  isNewChainsStale?: boolean;
};

type WalletConnectProvider = {
  accounts: string[];
  chainId: number;
  session?: {
    namespaces?: Record<string, { accounts?: string[] }>;
  };
  events?: {
    setMaxListeners?: (count: number) => void;
  };
  connect: (parameters: Record<string, unknown>) => Promise<void>;
  disconnect: () => Promise<void>;
  enable: () => Promise<string[]>;
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeListener: (event: string, listener: (...args: any[]) => void) => void;
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type WalletConnectProviderModule = {
  EthereumProvider: {
    init: (parameters: Record<string, unknown>) => Promise<WalletConnectProvider>;
  };
};

walletConnectConnector.type = "walletConnect";

export function walletConnectConnector(parameters: WalletConnectParameters) {
  const isNewChainsStale = parameters.isNewChainsStale ?? true;
  let provider_: any;
  let providerPromise: Promise<any> | undefined;
  const namespace = "eip155";
  let accountsChanged: ((...args: any[]) => void) | undefined;
  let chainChanged: ((...args: any[]) => void) | undefined;
  let connect: ((...args: any[]) => void) | undefined;
  let displayUri: ((...args: any[]) => void) | undefined;
  let sessionDelete: ((...args: any[]) => void) | undefined;
  let disconnect: ((...args: any[]) => void) | undefined;

  return createConnector((config) => ({
    id: "walletConnect",
    name: "WalletConnect",
    type: walletConnectConnector.type,
    async setup() {
      const provider = await this.getProvider().catch(() => null);
      if (!provider) return;
      if (!connect) {
        connect = this.onConnect.bind(this);
        provider.on("connect", connect);
      }
      if (!sessionDelete) {
        sessionDelete = this.onSessionDelete.bind(this);
        provider.on("session_delete", sessionDelete);
      }
    },
    async connect({ chainId, withCapabilities, ...rest } = {}) {
      try {
        const provider = await this.getProvider() as WalletConnectProvider;
        if (!provider) throw new ProviderNotFoundError();
        if (!displayUri) {
          displayUri = this.onDisplayUri;
          provider.on("display_uri", displayUri);
        }

        let targetChainId = chainId;
        if (!targetChainId) {
          const state = (await config.storage?.getItem("state")) ?? {};
          const storedChainId = (state as { chainId?: number }).chainId;
          const isChainSupported = config.chains.some((chain) => chain.id === storedChainId);
          targetChainId = isChainSupported ? storedChainId : config.chains[0]?.id;
        }
        if (!targetChainId) throw new Error("No chains found on connector.");

        const isChainsStale = await this.isChainsStale();
        if (provider.session && isChainsStale) await provider.disconnect();

        if (!provider.session || isChainsStale) {
          const optionalChains = config.chains
            .filter((chain) => chain.id !== targetChainId)
            .map((chain) => chain.id);
          await provider.connect({
            optionalChains: [targetChainId, ...optionalChains],
            ...("pairingTopic" in rest ? { pairingTopic: rest.pairingTopic } : {}),
          });
          this.setRequestedChainsIds(config.chains.map((chain) => chain.id));
        }

        const accounts = (await provider.enable()).map((account: string) => getAddress(account));
        let currentChainId = await this.getChainId();
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain({ chainId }).catch((error) => {
            if (
              error.code === UserRejectedRequestError.code &&
              error.cause?.message !== "Missing or invalid. request() method: wallet_addEthereumChain"
            ) {
              throw error;
            }
            return { id: currentChainId };
          });
          currentChainId = chain?.id ?? currentChainId;
        }

        if (displayUri) {
          provider.removeListener("display_uri", displayUri);
          displayUri = undefined;
        }
        if (connect) {
          provider.removeListener("connect", connect);
          connect = undefined;
        }
        if (!accountsChanged) {
          accountsChanged = this.onAccountsChanged.bind(this);
          provider.on("accountsChanged", accountsChanged);
        }
        if (!chainChanged) {
          chainChanged = this.onChainChanged.bind(this);
          provider.on("chainChanged", chainChanged);
        }
        if (!disconnect) {
          disconnect = this.onDisconnect.bind(this);
          provider.on("disconnect", disconnect);
        }
        if (!sessionDelete) {
          sessionDelete = this.onSessionDelete.bind(this);
          provider.on("session_delete", sessionDelete);
        }

        return {
          accounts: withCapabilities
            ? accounts.map((address: string) => ({ address, capabilities: {} }))
            : accounts,
          chainId: currentChainId,
        };
      } catch (error) {
        if (/(user rejected|connection request reset)/i.test((error as Error)?.message)) {
          throw new UserRejectedRequestError(error as Error);
        }
        throw error;
      }
    },
    async disconnect() {
      const provider = await this.getProvider();
      try {
        await provider?.disconnect();
      } catch (error) {
        if (!/No matching key/i.test((error as Error).message)) throw error;
      } finally {
        if (chainChanged) {
          provider?.removeListener("chainChanged", chainChanged);
          chainChanged = undefined;
        }
        if (disconnect) {
          provider?.removeListener("disconnect", disconnect);
          disconnect = undefined;
        }
        if (!connect) {
          connect = this.onConnect.bind(this);
          provider?.on("connect", connect);
        }
        if (accountsChanged) {
          provider?.removeListener("accountsChanged", accountsChanged);
          accountsChanged = undefined;
        }
        if (sessionDelete) {
          provider?.removeListener("session_delete", sessionDelete);
          sessionDelete = undefined;
        }
        this.setRequestedChainsIds([]);
      }
    },
    async getAccounts() {
      const provider = await this.getProvider() as WalletConnectProvider;
      return provider.accounts.map((account) => getAddress(account));
    },
    async getProvider({ chainId } = {}) {
      async function initProvider() {
        const optionalChains = config.chains.map((chain) => chain.id);
        if (!optionalChains.length) return undefined;
        const { EthereumProvider } = await import("@walletconnect/ethereum-provider")
          .catch(() => {
            throw new Error('dependency "@walletconnect/ethereum-provider" not found');
          }) as unknown as WalletConnectProviderModule;

        return EthereumProvider.init({
          ...parameters,
          disableProviderPing: true,
          optionalChains,
          projectId: parameters.projectId,
          rpcMap: Object.fromEntries(config.chains.map((chain) => {
            const [url] = extractRpcUrls({
              chain,
              transports: config.transports,
            });
            return [chain.id, url];
          })),
          showQrModal: parameters.showQrModal ?? true,
        });
      }

      if (!provider_) {
        if (!providerPromise) providerPromise = initProvider();
        provider_ = await providerPromise;
        provider_?.events?.setMaxListeners?.(Number.POSITIVE_INFINITY);
      }
      if (chainId) await this.switchChain?.({ chainId });
      return provider_ as any;
    },
    async getChainId() {
      const provider = await this.getProvider() as WalletConnectProvider;
      return provider.chainId;
    },
    async isAuthorized() {
      try {
        const [accounts, provider] = await Promise.all([
          this.getAccounts(),
          this.getProvider(),
        ]);
        if (!accounts.length) return false;
        const isChainsStale = await this.isChainsStale();
        if (isChainsStale && (provider as WalletConnectProvider).session) {
          await provider.disconnect().catch(() => {});
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    async switchChain({ addEthereumChainParameter, chainId }) {
      const provider = await this.getProvider() as WalletConnectProvider;
      if (!provider) throw new ProviderNotFoundError();
      const chain = config.chains.find((item) => item.id === chainId);
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

      let listener = () => {};
      try {
        await Promise.all([
          new Promise<void>((resolve) => {
            listener = ((opts: { chainId?: number }) => {
              if (opts.chainId === chainId) {
                config.emitter.off("change", listener);
                resolve();
              }
            }) as any;
            config.emitter.on("change", listener);
          }),
          provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: numberToHex(chainId) }],
          }),
        ]);
        const requestedChains = await this.getRequestedChainsIds();
        this.setRequestedChainsIds([...requestedChains, chainId]);
        return chain;
      } catch (error) {
        config.emitter.off("change", listener);
        if (/(user rejected)/i.test((error as Error).message)) {
          throw new UserRejectedRequestError(error as Error);
        }

        try {
          const blockExplorerUrls = addEthereumChainParameter?.blockExplorerUrls
            ?? (chain.blockExplorers?.default.url ? [chain.blockExplorers.default.url] : []);
          const rpcUrls = addEthereumChainParameter?.rpcUrls?.length
            ? addEthereumChainParameter.rpcUrls
            : [...chain.rpcUrls.default.http];
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              blockExplorerUrls,
              chainId: numberToHex(chainId),
              chainName: addEthereumChainParameter?.chainName ?? chain.name,
              iconUrls: addEthereumChainParameter?.iconUrls,
              nativeCurrency: addEthereumChainParameter?.nativeCurrency ?? chain.nativeCurrency,
              rpcUrls,
            }],
          });
          const requestedChains = await this.getRequestedChainsIds();
          this.setRequestedChainsIds([...requestedChains, chainId]);
          return chain;
        } catch (addError) {
          throw new UserRejectedRequestError(addError as Error);
        }
      }
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) this.onDisconnect();
      else config.emitter.emit("change", {
        accounts: accounts.map((account) => getAddress(account)),
      });
    },
    onChainChanged(chain) {
      config.emitter.emit("change", { chainId: Number(chain) });
    },
    async onConnect(connectInfo) {
      const chainId = Number(connectInfo.chainId);
      const accounts = await this.getAccounts();
      config.emitter.emit("connect", { accounts, chainId });
    },
    async onDisconnect() {
      this.setRequestedChainsIds([]);
      config.emitter.emit("disconnect");
      const provider = await this.getProvider();
      if (accountsChanged) {
        provider.removeListener("accountsChanged", accountsChanged);
        accountsChanged = undefined;
      }
      if (chainChanged) {
        provider.removeListener("chainChanged", chainChanged);
        chainChanged = undefined;
      }
      if (disconnect) {
        provider.removeListener("disconnect", disconnect);
        disconnect = undefined;
      }
      if (sessionDelete) {
        provider.removeListener("session_delete", sessionDelete);
        sessionDelete = undefined;
      }
      if (!connect) {
        connect = this.onConnect.bind(this);
        provider.on("connect", connect);
      }
    },
    onDisplayUri(uri: string) {
      config.emitter.emit("message", { type: "display_uri", data: uri });
    },
    onSessionDelete() {
      this.onDisconnect();
    },
    getNamespaceChainsIds() {
      if (!provider_) return [];
      const chainIds = provider_.session?.namespaces?.[namespace]?.accounts?.map((account: string) => {
        return Number.parseInt(account.split(":")[1] || "", 10);
      });
      return chainIds ?? [];
    },
    async getRequestedChainsIds() {
      return ((await config.storage?.getItem(this.requestedChainsStorageKey)) ?? []) as number[];
    },
    async isChainsStale() {
      if (!isNewChainsStale) return false;
      const connectorChains = config.chains.map((chain) => chain.id);
      const namespaceChains = this.getNamespaceChainsIds();
      if (namespaceChains.length && !namespaceChains.some((id: number) => connectorChains.includes(id))) {
        return false;
      }
      const requestedChains = await this.getRequestedChainsIds();
      return !connectorChains.every((id) => requestedChains.includes(id));
    },
    async setRequestedChainsIds(chains: number[]) {
      await config.storage?.setItem(this.requestedChainsStorageKey, chains);
    },
    get requestedChainsStorageKey() {
      return `${this.id}.requestedChains`;
    },
  })) as CreateConnectorFn;
}

export namespace walletConnectConnector {
  export let type: "walletConnect";
}
