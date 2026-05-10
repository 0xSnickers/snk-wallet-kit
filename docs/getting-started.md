# Getting Started

## 1. 安装

```bash
npm install snk-wallet-kit
```

在你的入口文件（如 `App.tsx` 或 `main.tsx`）中进行配置。

如果业务里没有安装以下依赖，需要一并安装：

```bash
npm install react react-dom
```

## 2. 初始化 Provider

```tsx
import { WalletProvider } from "snk-wallet-kit";

const config = {
  evm: {
    enabled: true,
    chains: ["mainnet", "sepolia"],
    wallets: ["injected", "walletConnect"],
    walletConnectProjectId: "YOUR_PROJECT_ID",
  },
  sol: {
    enabled: true,
    wallets: ["phantom", "solflare", "backpack"],
    cluster: "devnet",
  },
  app: {
    autoReconnect: true,
    storageKey: "snk-wallet-demo",
  },
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <WalletProvider config={config}>{children}</WalletProvider>;
}
```

## 3. 连接钱包

推荐直接使用内置 Connect 按钮：

```tsx
import { ConnectWalletButton } from "snk-wallet-connect-plugin";

export function WalletEntry() {
  return <ConnectWalletButton recommendedWalletIds={["injected", "phantom"]} />;
}
```

你也可以继续使用 hooks 自定义列表：

```tsx
import { useAvailableWallets, useConnectWallet } from "snk-wallet-connect-plugin";

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
} from "snk-wallet-connect-plugin";

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
import { useConnectWallet } from "snk-wallet-connect-plugin";

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

## 6. Next.js 使用方式

钱包 Provider 需要放在 Client Component 中：

```tsx
"use client";

import { WalletProvider } from "snk-wallet-connect-plugin";

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
```

当前兼容策略：

- 支持安全导入
- 支持 hydration 后自动恢复
- 不支持服务端直接读取真实钱包连接状态

## 7. 当前已实现能力

- EVM 钱包连接
- SOL 钱包发现与连接
- 统一连接状态
- 统一 `connect / disconnect / reconnect`
- 统一 `signMessage / sendTransaction / switchChain`
- 内置 `ConnectWalletButton` (基于 Tailwind CSS)
- 内置 `WalletSelectModal` (基于 Tailwind CSS)
- SSR-safe 基础处理

## 8. 当前未覆盖内容

- 更丰富的钱包元数据与主题定制
- 更多 demo 工程
- 自动化测试
