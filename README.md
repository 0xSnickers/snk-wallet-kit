# snk-wallet-kit

[English](#english) | [简体中文](#简体中文)

## English

`snk-wallet-kit` is a React wallet connection SDK that unifies **EVM** and **Solana** wallet flows with ready-to-use UI components and headless hooks.

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

`snk-wallet-kit` 是一个面向 React 生态的钱包接入 SDK，统一了 **EVM** 和 **Solana** 两类钱包的连接流程，同时提供开箱即用的 UI 组件和可定制的 Hooks。

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
