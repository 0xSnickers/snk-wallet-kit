# React Demo

## 目录

React 示例位于：

```text
examples/react-demo
```

## 功能

这个 demo 用来验证当前 SDK 的最小接入链路：

- 钱包发现
- 钱包连接
- 钱包断开
- 自动恢复
- `signMessage`
- 错误展示

## 运行方式

先在项目根目录确保主包依赖已安装，然后进入 demo：

```bash
cd examples/react-demo
npm install
npm run dev
```

默认会启动一个 Vite 开发服务。

## 当前配置

demo 当前启用：

- `EVM`: `injected`
- `SOL`: `phantom` / `solflare` / `backpack`
- `SOL cluster`: `devnet`

## 注意事项

- `walletConnect` 没有在 demo 里默认开启，因为它通常需要你自己的 `projectId`
- 这个 demo 优先用于浏览器扩展钱包联调
- `Next.js` 示例还没单独建工程，目前仍以文档说明为主
