# nextjs-demo

This demo shows the recommended **host-owned wagmi** integration for `snk-wallet-kit`.

## What it demonstrates

- Your app owns the single `QueryClientProvider` and `WagmiProvider`
- `WalletCoreProvider` bridges `snk-wallet-kit` UI/hooks into that existing host tree
- EVM reconnect is controlled by wagmi via `reconnectOnMount`
- Solana silent restore is controlled by the kit via `sol.autoReconnect`
- Demo UI compares kit session state with wagmi connection state side by side
- EVM chain switching across Mainnet, Sepolia, and a local Anvil node

## Run locally

From this directory:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## WalletConnect

Set a WalletConnect project id if you want the WalletConnect option to appear:

```bash
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

Without that variable, the demo still runs and only shows the configured injected wallets.

## Public RPCs

The default public RPCs may not be reachable from every network. Override them
in `.env.local` when needed:

```bash
NEXT_PUBLIC_MAINNET_RPC_URL=https://your-mainnet-rpc
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://your-sepolia-rpc
```

## Local Anvil chain

The demo includes a local Anvil chain definition:

- chain id: `31337`
- default rpc url: `http://127.0.0.1:8545`

Override the Anvil RPC URL in `.env.local` when the node runs at another
address:

```bash
NEXT_PUBLIC_ANVIL_URL=http://your-anvil-host:8545
```

Start Anvil before trying the `Switch to Anvil` action:

```bash
anvil
```

If Anvil is not running, switching to chain `31337` is expected to fail and the demo will show the wallet error in the result panel.

## Key files

- `config/wallet.config.ts` — shared wallet config for the demo, including the Anvil chain
- `components/ProviderWrapper.tsx` — host-owned `QueryClientProvider` + `WagmiProvider` + `WalletCoreProvider`
- `components/StatusDisplay.tsx` — compares kit state with wagmi state
- `components/WalletActions.tsx` — exercises reconnect, disconnect, sign, send transaction, and EVM chain switching
