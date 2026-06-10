# nextjs-demo

This demo shows the recommended **host-owned wagmi** integration for `snk-wallet-kit`.

## What it demonstrates

- Your app owns the single `QueryClientProvider` and `WagmiProvider`
- `WalletCoreProvider` bridges `snk-wallet-kit` UI/hooks into that existing host tree
- EVM reconnect is controlled by wagmi via `reconnectOnMount`
- Solana silent restore is controlled by the kit via `sol.autoReconnect`
- Demo UI compares kit session state with wagmi connection state side by side

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

## Key files

- `config/wallet.config.ts` — shared wallet config for the demo
- `components/ProviderWrapper.tsx` — host-owned `QueryClientProvider` + `WagmiProvider` + `WalletCoreProvider`
- `components/StatusDisplay.tsx` — compares kit state with wagmi state
- `components/WalletActions.tsx` — exercises reconnect, disconnect, sign, send transaction, and EVM chain switching
