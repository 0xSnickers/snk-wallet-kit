# Getting Started

## 1. 安装

```bash
npm install snk-wallet-kit wagmi viem @tanstack/react-query react react-dom
```

在你的入口文件（如 `App.tsx` 或 `main.tsx`）中进行配置。

如果业务里没有安装以下 peer 依赖，需要一并安装：

```bash
npm install wagmi viem @tanstack/react-query react react-dom
```

## 2. 初始化 Provider

```tsx
import "snk-wallet-kit/style.css";
import { WalletProvider } from "snk-wallet-kit";

const config = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: ["injected", "walletConnect"],
    walletConnectProjectId: "YOUR_PROJECT_ID",
    reconnectOnMount: true,
  },
  sol: {
    enabled: true,
    wallets: ["phantom", "solflare", "backpack"],
    cluster: "devnet",
    autoReconnect: true,
  },
  app: {
    storageKey: "snk-wallet-demo",
  },
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <WalletProvider config={config}>{children}</WalletProvider>;
}
```

## 2.1 自定义 EVM 链（例如 Anvil）

`evm.chains` 除了支持 `"mainnet"`、`"sepolia"`，也支持直接传入标准 `viem` `Chain` 对象。

```tsx
import { defineChain } from "viem";
import { WalletProvider } from "snk-wallet-kit";

const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
});

const config = {
  evm: {
    enabled: true,
    chains: [anvil],
    wallets: ["metaMask"],
    reconnectOnMount: true,
  },
};

export function LocalChainProviders({ children }: { children: React.ReactNode }) {
  return <WalletProvider config={config}>{children}</WalletProvider>;
}
```

如果你的项目已经有自己的 wagmi config，或者你需要自己控制 transport / storage / 多链策略，更推荐使用 `WalletCoreProvider`。

## 3. 连接钱包

推荐直接使用内置 Connect 按钮：

```tsx
import { ConnectWalletButton } from "snk-wallet-kit";

export function WalletEntry() {
  return <ConnectWalletButton recommendedWalletIds={["injected", "phantom"]} />;
}
```

你也可以继续使用 hooks 自定义列表：

```tsx
import { useAvailableWallets, useConnectWallet } from "snk-wallet-kit";

export function WalletList() {
  const wallets = useAvailableWallets();
  const { connect } = useConnectWallet();

  return (
    <div>
      {wallets.map((wallet) => (
        <button
          key={`${wallet.namespace}:${wallet.walletId}`}
          onClick={() =>
            connect({
              namespace: wallet.namespace,
              walletId: wallet.walletId,
            })
          }
        >
          Connect {wallet.name}
        </button>
      ))}
    </div>
  );
}
```

## 4. 读取状态

```tsx
import {
  useCurrentAccount,
  useWalletError,
  useWalletStatus,
} from "snk-wallet-kit";

export function WalletStatusPanel() {
  const account = useCurrentAccount();
  const status = useWalletStatus();
  const error = useWalletError();

  return (
    <div>
      <div>Status: {status}</div>
      <div>Account: {account ?? "-"}</div>
      <div>Error: {error?.message ?? "-"}</div>
    </div>
  );
}
```

## 5. 签名消息与发送交易

```tsx
import { useConnectWallet } from "snk-wallet-kit";

export function WalletActions() {
  const { signMessage, sendTransaction, switchChain, session } = useConnectWallet();

  return (
    <div>
      <button
        onClick={async () => {
          const result = await signMessage("hello from snk");
          console.log(result);
        }}
      >
        Sign Message
      </button>

      <button
        onClick={async () => {
          const result = await sendTransaction({
            namespace: "evm",
            to: "0x...",
            value: "1000000000000000000",
          });
          console.log(result.hash);
        }}
      >
        Send Transaction
      </button>

      {session.namespace === "evm" && (
        <button onClick={() => switchChain({ chainId: 1 })}>
          Switch to Ethereum Mainnet
        </button>
      )}
    </div>
  );
}
```

返回值结构：

```ts
type SignMessageResult = {
  namespace: "evm" | "sol";
  walletId: string;
  account: string;
  signature: string;
  signedMessage?: Uint8Array;
  signatureType?: string;
};
```

## 6. Provider ownership 模式

二选一使用：

- `WalletProvider` / `WalletKitProvider`：快速接入模式，由库内部创建 `QueryClientProvider` 和 `WagmiProvider`
- `WalletCoreProvider`：宿主接管模式，由业务自己提供唯一的 `QueryClientProvider` 和 `WagmiProvider`，并由宿主显式传入 wagmi 的 `reconnectOnMount` 行为，库只负责 UI 和 hooks 桥接

不要在同一棵树里同时使用外部 `WagmiProvider` 再叠加 `WalletKitProvider` 来共同接管 EVM 生命周期。

如果你选择 `WalletCoreProvider`：

- EVM 恢复行为由宿主 wagmi 的 `reconnectOnMount` 控制
- Solana 静默恢复由 `sol.autoReconnect` 控制

## 7. 配置语义

- `evm.reconnectOnMount`：控制 wagmi 是否在挂载时恢复 EVM 连接
- `sol.autoReconnect`：控制库是否在挂载时静默恢复 Solana 会话
- `app.storageKey`：控制库自身的本地存储命名空间

## 8. Next.js 使用方式

钱包 Provider 需要放在 Client Component 中：

```tsx
"use client";

import { WalletProvider } from "snk-wallet-kit";

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
```

当前兼容策略：

- 支持安全导入
- 支持 hydration 后自动恢复
- 不支持服务端直接读取真实钱包连接状态

## 9. 当前已实现能力

- EVM 钱包连接
- SOL 钱包发现与连接
- 统一连接状态
- 统一 `connect / disconnect / reconnect`
- 统一 `signMessage / sendTransaction / switchChain`
- 内置 `ConnectWalletButton` (命名空间 CSS)
- 内置 `WalletSelectModal` (命名空间 CSS + body portal)
- SSR-safe 基础处理

## 10. 当前未覆盖内容

- 更丰富的钱包元数据与主题定制
- 更多 demo 工程
- 自动化测试
