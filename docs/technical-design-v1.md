# SNK Wallet Connect Plugin 技术设计 V1

## 1. 产品目标

- 产出一个面向 React 生态的钱包接入 SDK，支持 EVM + SOL 两类钱包的统一接入体验。
- EVM 侧基于 wagmi 实现，复用其连接器、状态管理和生态兼容性。
- SOL 侧基于 wallet-standard 实现，避免被 Solana 专属 React Provider 体系绑定。
- 同时兼容 React SPA、Next.js Pages Router、Next.js App Router。
- 业务方通过 npm install 安装后，只需提供一份配置并包裹一个 Provider，即可完成接入。
- 对外提供统一的配置、状态、事件、错误和 hooks，不要求业务方分别理解 wagmi 与 wallet-standard。

## 2. 技术选型结论

- EVM：wagmi + viem
- SOL：wallet-standard
- 框架层：React
- 运行时目标：浏览器优先，SSR-safe
- 打包目标：esm + cjs + dts
- 状态策略：内部统一状态模型，对接 wagmi 与 wallet-standard
- 持久化策略：默认浏览器 localStorage，允许用户注入自定义 storage
- UI 策略：V1 不内置复杂钱包弹窗，仅提供基础接入能力

### 2.1 选型理由

- wagmi 适合承接 EVM 钱包连接，不需要重复造轮子。
- wallet-standard 更适合做统一中间层，不会把整个项目绑定成 Solana React SDK。
- React 作为对外主要接入层，可以天然覆盖普通 React 和 Next.js。
- SSR-safe 设计比强 SSR 钱包态更现实，也更符合钱包连接的实际运行环境。

## 3. 模块架构

项目内部按以下模块分层：

- core
- adapters/evm
- adapters/sol
- react
- runtime

### 3.1 core

职责：

- 定义统一抽象，不依赖 React，不直接访问 window
- 定义配置协议、基础类型、统一状态模型
- 定义错误码与事件协议
- 提供配置归一化与通用工具

### 3.2 adapters/evm

职责：

- 把用户配置转换为 wagmi 可消费配置
- 桥接 wagmi 状态到统一状态模型
- 管理 EVM 钱包连接器
- 提供 EVM 相关扩展信息，如 chainId、connector、address

### 3.3 adapters/sol

职责：

- 基于 wallet-standard 发现可用钱包
- 发起 Solana 钱包连接、断开和能力检测
- 桥接账户、公钥、钱包特性到统一状态模型
- 提供 SOL 相关扩展信息，如 cluster、features、publicKey

### 3.4 react

职责：

- 对业务方暴露统一 React 接入层
- 提供 WalletProvider 与统一 hooks
- 在客户端初始化适配器、同步状态、处理 hydration 后恢复

### 3.5 runtime

职责：

- 负责浏览器环境检测与 SSR-safe 处理
- 负责 storage 封装与持久化恢复
- 负责 hydration 后自动重连逻辑

## 4. 对外 API 草案

### 4.1 初始化配置

```ts
export type WalletKitConfig = {
  evm?: {
    enabled?: boolean;
    chains?: string[];
    wallets?: Array<"injected" | "walletConnect" | "coinbaseWallet">;
    autoConnect?: boolean;
  };
  sol?: {
    enabled?: boolean;
    wallets?: Array<"phantom" | "solflare" | "backpack">;
    cluster?: "mainnet-beta" | "devnet" | "testnet";
    autoConnect?: boolean;
  };
  app?: {
    storageKey?: string;
    autoReconnect?: boolean;
    ssr?: boolean;
  };
};
```

设计原则：

- 业务方描述想支持什么，库内部决定怎么实现
- 尽量不让业务方直接配置 wagmi 和 wallet-standard 细节
- 配置应支持默认值、归一化和后续扩展

### 4.2 Provider

```tsx
<WalletProvider config={config}>
  <App />
</WalletProvider>
```

Provider 职责：

- 初始化 EVM 与 SOL 适配器
- 建立统一上下文
- 处理客户端挂载后的状态恢复
- 监听账户和网络变化
- 对外提供统一 hooks 所需的数据源

### 4.3 Hooks

- useWallet()
- useConnectWallet()
- useAvailableWallets()
- useCurrentAccount()
- useWalletStatus()

### 4.4 通用类型草案

```ts
export type Namespace = "evm" | "sol";

export type WalletStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type WalletDescriptor = {
  namespace: Namespace;
  walletId: string;
  name: string;
  installed: boolean;
  ready: boolean;
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
    cluster?: "mainnet-beta" | "devnet" | "testnet";
    publicKey?: string;
  };
};

export type ConnectOptions = {
  namespace: Namespace;
  walletId: string;
};
```

### 4.5 事件草案

- connected
- disconnected
- accountChanged
- networkChanged
- error

## 5. React / Next.js 兼容策略

### 5.1 兼容目标

- 支持普通 React 项目直接接入
- 支持 Next.js Pages Router
- 支持 Next.js App Router
- 支持客户端 hydration 后恢复钱包状态
- 保证包在服务端导入时不因访问浏览器 API 报错

### 5.2 设计原则

- 钱包连接能力只在客户端执行
- 顶层模块不直接访问 window、document、localStorage
- 所有浏览器相关访问都延迟到运行期判断
- WalletProvider 必须能在 client component 中安全使用
- 不承诺 SSR 阶段完整钱包连接态

### 5.3 Next.js 使用边界

- 在 Next.js 中，WalletProvider 应放在 client component 内使用
- 服务端仅输出静态页面壳，钱包状态在客户端挂载后恢复
- 如果用户需要根据钱包态控制页面内容，应基于 hydration 后状态，而不是 SSR 初始状态
- V1 不支持服务端直接读取用户真实钱包连接态

### 5.4 hydration 恢复策略

- 初始化时先进入 idle 或 disconnected
- 客户端挂载后读取持久化信息
- 若配置开启 autoReconnect，则尝试恢复上次连接的 namespace + walletId
- 恢复失败时记录非致命错误，并回退为未连接态
- 不因为单一钱包不可用而阻塞整个 Provider

## 6. V1 范围与非目标

### 6.1 V1 范围

- 支持 EVM + SOL
- EVM 使用 wagmi
- SOL 使用 wallet-standard
- 提供统一配置
- 提供统一 Provider
- 提供统一 hooks
- 支持钱包发现
- 支持连接与断开
- 支持获取当前账户
- 支持账户变化监听
- 支持网络或集群变化监听
- 支持自动重连
- 支持基础消息签名
- 支持统一错误体系

### 6.2 首批钱包范围

- EVM：injected、walletConnect、coinbaseWallet
- SOL：phantom、solflare、backpack

### 6.3 V1 非目标

- 不统一 EVM 与 SOL 的交易对象结构
- 不统一 sendTransaction 与 signTransaction
- 不把 cluster 强行抽象为 chainId
- 不提供服务端钱包连接能力
- 不保证 SSR 阶段钱包状态可用
- 不覆盖所有钱包高级功能
- 不内置复杂钱包选择弹窗和 UI 系统
- 不优先处理移动端 deep link 全场景兼容

## 7. 统一状态模型

### 7.1 目标

- 统一业务接入体验，而不是统一底层协议
- 让业务方通过一套 hooks 获取主要连接状态

### 7.2 统一内容

- 当前是否连接
- 当前 namespace
- 当前钱包标识
- 当前账户
- 当前连接状态
- 当前错误
- 当前可用钱包列表

### 7.3 不统一内容

- EVM 的 typed data 签名能力
- SOL 的 transaction 特性集合
- EVM chainId 与 SOL cluster
- 原始 provider 或 connector 对象结构

## 8. 错误体系设计

建议统一错误码：

- WALLET_NOT_FOUND
- WALLET_NOT_INSTALLED
- CONNECT_REJECTED
- CONNECT_FAILED
- DISCONNECT_FAILED
- UNSUPPORTED_FEATURE
- CHAIN_NOT_SUPPORTED
- CLUSTER_NOT_SUPPORTED
- AUTO_RECONNECT_FAILED
- PROVIDER_NOT_READY

## 9. 配置设计原则

- 配置优先声明式，不要求用户传入过多底层实例
- 配置需要可扩展，便于后续增加钱包、链、UI、存储策略
- 配置要支持合理默认值，降低接入门槛
- 配置校验应在初始化阶段完成，错误尽量早失败

## 10. 里程碑建议

### 阶段 1：架构骨架

- 定义配置协议
- 定义统一状态模型
- 定义错误与事件系统
- 定义 runtime 和 storage 抽象

### 阶段 2：EVM 接入

- 接入 wagmi
- 跑通 injected 连接
- 打通账户和链变化监听
- 接入自动重连

### 阶段 3：SOL 接入

- 接入 wallet-standard
- 跑通 phantom
- 打通账户与钱包变化监听
- 接入自动重连

### 阶段 4：React 封装

- 完成 WalletProvider
- 完成统一 hooks
- 验证在 React SPA 中可用

### 阶段 5：Next.js 验证

- 验证 Pages Router
- 验证 App Router
- 验证 hydration 恢复
- 验证 SSR-safe 导入

### 阶段 6：文档与发布

- 补充接入文档
- 补充配置文档
- 补充错误码文档
- 输出最小 demo
- 发布 npm 包
