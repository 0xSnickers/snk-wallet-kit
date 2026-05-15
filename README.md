# snk-wallet-kit

[English](#english) | [简体中文](#简体中文)

## English

`snk-wallet-kit` is a minimal React wallet connection toolkit built on top of wagmi. It unifies **EVM** and **Solana** wallet flows with ready-to-use UI components and headless hooks, supporting both React and Next.js.

---

## Features

- Unified wallet access for EVM and Solana.
- Automatic style injection with no manual CSS import.
- Built-in wallet icons for MetaMask, OKX Wallet, and WalletConnect.
- Precise wallet routing for multi-wallet browser environments.
- Core wallet actions including connect, disconnect, auto reconnect, sign message, send transaction, and switch chain for EVM.
- SSR-friendly behavior for Next.js and standard React apps.
- Flexible UI customization through hooks and modal controls.

---

## Installation

```bash
npm install snk-wallet-kit
```

## Quick Start

### 1. Configure `WalletProvider`

```tsx
import { WalletProvider } from "snk-wallet-kit";

const config = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: ["metaMask", "okxWallet", "walletConnect"],
    walletConnectProjectId: "YOUR_PROJECT_ID",
  },
  sol: {
    enabled: true,
    wallets: ["phantom", "jupiter"],
    cluster: "mainnet-beta",
  },
  app: {
    autoReconnect: true,
    storageKey: "snk-wallet-kit-demo",
  },
};

export function Root() {
  return (
    <WalletProvider config={config}>
      <App />
    </WalletProvider>
  );
}
```

### 2. Add a connect button

```tsx
import { ConnectWalletButton } from "snk-wallet-kit";

function Header() {
  return <ConnectWalletButton recommendedWalletIds={["metaMask", "phantom"]} />;
}
```

### 3. Use wallet actions

```tsx
import { useConnectWallet, useCurrentAccount } from "snk-wallet-kit";

function ActionPanel() {
  const account = useCurrentAccount();
  const { signMessage, sendTransaction } = useConnectWallet();

  const handleSign = async () => {
    const { signature } = await signMessage("Hello SNK!");
    console.log("Signature:", signature);
  };

  return (
    <div>
      <p>Connected: {account}</p>
      <button onClick={handleSign}>Sign Message</button>
    </div>
  );
}
```

### Vite Note

WalletConnect-related dependencies expect `global` in some Vite setups. Add this to `vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    global: "globalThis",
  },
});
```

### Styling

`snk-wallet-kit` injects its built CSS automatically when `WalletProvider` is used. No `import "snk-wallet-kit/dist/style.css"` step is required.

### Advanced Provider Composition

`WalletProvider` and `WalletKitProvider` share the same ready-to-use behavior. `WalletCoreProvider` works with your own `QueryClientProvider` and `WagmiProvider`, which keeps wagmi and react-query hooks available in the same tree.

```tsx
import {
  WalletCoreProvider,
  createWalletKitEvmConfig,
  type WalletKitConfig,
} from "snk-wallet-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

const config: WalletKitConfig = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: ["metaMask", "walletConnect"],
    walletConnectProjectId: "YOUR_PROJECT_ID",
  },
};

const queryClient = new QueryClient();
const wagmiConfig = createWalletKitEvmConfig(config);

export function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig!}>
        <WalletCoreProvider
          config={config}
          queryClient={queryClient}
          wagmiConfig={wagmiConfig}
        >
          <App />
        </WalletCoreProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
```

### Config Behavior

When you explicitly configure either `evm.wallets` or `sol.wallets`, the other namespace will be disabled by default. This ensures the wallet selection modal only shows the wallets you explicitly configure.

---

## API

### UI Components

#### `ConnectWalletButton`

Opens the wallet selection modal.

- `label`: Text shown before connection. Default is `"Connect Wallet"`.
- `recommendedWalletIds`: Preferred wallet ids for ordering and highlighting.
- `showAccount`: Shows a shortened account after connection. Default is `true`.

#### `WalletSelectModal`

Standalone wallet modal with custom filter and sorting support.

### Hooks

- `useConnectWallet()`: Returns `connect`, `disconnect`, `reconnect`, `signMessage`, `sendTransaction`, and `switchChain`.
- `useCurrentAccount()`: Returns the current connected account.
- `useWalletStatus()`: Returns `idle`, `connecting`, `connected`, `disconnected`, or `error`.
- `useAvailableWallets()`: Returns detected wallets in the current environment.
- `useWalletModal()`: Controls the wallet modal manually.
- `useWalletError()`: Returns the latest wallet error.

---

## Wallet Support

- EVM: MetaMask, OKX Wallet, Coinbase Wallet, WalletConnect.
- Solana: Phantom, Jupiter, Solflare, Backpack, and compatible `wallet-standard` wallets.

## Framework Support

- React `18.2.0+` / `19.0.0+`
- Next.js client components

---

## 简体中文

`snk-wallet-kit` 是一个基于 wagmi 的极简版 React 钱包连接工具，统一了 **EVM** 和 **Solana** 两类钱包的连接流程，同时提供开箱即用的 UI 组件和可定制的 Hooks，支持 React 和 Next.js。

---

## 功能特性

- 同时支持 EVM 和 Solana 钱包接入。
- 自动注入样式，无需手动引入 CSS。
- 内置 MetaMask、OKX Wallet、WalletConnect 品牌图标。
- 在多钱包浏览器环境中精确路由到目标钱包。
- 提供连接、断开、自动重连、消息签名、发送交易、EVM 切链等能力。
- 兼容 SSR，适用于 Next.js 和常规 React 应用。
- 支持通过 Hooks 和弹框控制实现自定义 UI。

---

## 安装

```bash
npm install snk-wallet-kit
```

## 快速开始

### 1. 配置 `WalletProvider`

```tsx
import { WalletProvider } from "snk-wallet-kit";

const config = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: ["metaMask", "okxWallet", "walletConnect"],
    walletConnectProjectId: "YOUR_PROJECT_ID",
  },
  sol: {
    enabled: true,
    wallets: ["phantom", "jupiter"],
    cluster: "mainnet-beta",
  },
  app: {
    autoReconnect: true,
    storageKey: "snk-wallet-kit-demo",
  },
};

export function Root() {
  return (
    <WalletProvider config={config}>
      <App />
    </WalletProvider>
  );
}
```

### 2. 放置连接按钮

```tsx
import { ConnectWalletButton } from "snk-wallet-kit";

function Header() {
  return <ConnectWalletButton recommendedWalletIds={["metaMask", "phantom"]} />;
}
```

### 3. 调用钱包能力

```tsx
import { useConnectWallet, useCurrentAccount } from "snk-wallet-kit";

function ActionPanel() {
  const account = useCurrentAccount();
  const { signMessage, sendTransaction } = useConnectWallet();

  const handleSign = async () => {
    const { signature } = await signMessage("Hello SNK!");
    console.log("Signature:", signature);
  };

  return (
    <div>
      <p>Connected: {account}</p>
      <button onClick={handleSign}>Sign Message</button>
    </div>
  );
}
```

### Vite 开发提示

部分 WalletConnect 相关依赖在 Vite 环境下需要 `global` 变量，可在 `vite.config.ts` 中加入：

```ts
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    global: "globalThis",
  },
});
```

### 样式说明

当使用 `WalletProvider` 时，`snk-wallet-kit` 会自动注入已构建样式，无需再手动引入 `import "snk-wallet-kit/dist/style.css"`。

### 高级 Provider 组合

`WalletProvider` 和 `WalletKitProvider` 提供同一套开箱即用行为。`WalletCoreProvider` 适合和你自己的 `QueryClientProvider`、`WagmiProvider` 组合使用，应用树内可以直接复用 wagmi 和 react-query hooks。

```tsx
import {
  WalletCoreProvider,
  createWalletKitEvmConfig,
  type WalletKitConfig,
} from "snk-wallet-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

const config: WalletKitConfig = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: ["metaMask", "walletConnect"],
    walletConnectProjectId: "YOUR_PROJECT_ID",
  },
};

const queryClient = new QueryClient();
const wagmiConfig = createWalletKitEvmConfig(config);

export function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig!}>
        <WalletCoreProvider
          config={config}
          queryClient={queryClient}
          wagmiConfig={wagmiConfig}
        >
          <App />
        </WalletCoreProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
```

### 配置行为

当你显式配置了 `evm.wallets` 或 `sol.wallets` 任一数组时，另一侧 namespace 默认不会启用。这确保钱包选择弹框只会展示你显式配置的钱包按钮。

---

## API 说明

### UI 组件

#### `ConnectWalletButton`

用于打开钱包选择弹框。

- `label`: 未连接时显示的文案，默认是 `"Connect Wallet"`。
- `recommendedWalletIds`: 用于排序和高亮的钱包 id 列表。
- `showAccount`: 连接后显示缩略账户地址，默认 `true`。

#### `WalletSelectModal`

独立钱包弹框，支持自定义过滤和排序。

### Hooks

- `useConnectWallet()`: 返回 `connect`、`disconnect`、`reconnect`、`signMessage`、`sendTransaction`、`switchChain`。
- `useCurrentAccount()`: 获取当前连接账户。
- `useWalletStatus()`: 返回 `idle`、`connecting`、`connected`、`disconnected`、`error`。
- `useAvailableWallets()`: 获取当前环境检测到的钱包列表。
- `useWalletModal()`: 手动控制钱包弹框。
- `useWalletError()`: 获取最近一次钱包错误。

---

## 钱包支持

- EVM: MetaMask、OKX Wallet、Coinbase Wallet、WalletConnect。
- Solana: Phantom、Jupiter、Solflare、Backpack，以及兼容 `wallet-standard` 的钱包。

## 框架支持

- React `18.2.0+` / `19.0.0+`
- Next.js 客户端组件

---

## Star History

[![GitHub Star History Chart](https://api.star-history.com/svg?repos=snk-labs/snk-wallet-kit&type=Date)](https://star-history.com/#snk-labs/snk-wallet-kit&Date)

---

## License

[MIT License](LICENSE)
