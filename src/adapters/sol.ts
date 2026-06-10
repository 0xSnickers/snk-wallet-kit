import { getWallets } from "@wallet-standard/app";
import type { Wallet } from "@wallet-standard/base";
import { SolanaSignAndSendTransaction, SolanaSignMessage } from "@solana/wallet-standard-features";

import type { NormalizedWalletKitConfig, WalletDescriptor } from "../core";
import { isBrowser } from "../runtime";

export type SolAdapter = {
  wallets: Wallet[];
  supportedWalletIds: string[];
  on: (event: "change", listener: () => void) => () => void;
};

function supportsSolana(wallet: Wallet): boolean {
  const chains = wallet.chains ?? [];
  const accounts = wallet.accounts ?? [];
  const features = wallet.features ?? {};

  if (chains.some((chain) => chain.startsWith("solana:"))) {
    return true;
  }

  if (SolanaSignMessage in features || SolanaSignAndSendTransaction in features) {
    return true;
  }

  return accounts.some(
    (account) =>
      account.chains?.some((chain) => chain.startsWith("solana:")) ||
      account.features?.includes(SolanaSignMessage) ||
      account.features?.includes(SolanaSignAndSendTransaction),
  );
}

export function resolveWalletId(wallet: Wallet): string {
  const normalizedName = wallet.name.toLowerCase().trim();
  const id = (wallet as any).id?.toLowerCase() || "";

  if (id === "phantom" || normalizedName === "phantom" || normalizedName === "phantom wallet") {
    return "phantom";
  }

  if (id === "jupiter" || normalizedName === "jupiter" || normalizedName === "jupiter wallet") {
    return "jupiter";
  }

  if (id === "solflare" || normalizedName === "solflare" || normalizedName === "solflare wallet") {
    return "solflare";
  }

  if (id === "backpack" || normalizedName === "backpack" || normalizedName === "backpack wallet") {
    return "backpack";
  }

  return id || normalizedName.replace(/\s+/g, "-");
}

export function createSolAdapter(config: NormalizedWalletKitConfig): SolAdapter | null {
  if (!config.sol.enabled) {
    return null;
  }

  if (!isBrowser()) {
    return {
      wallets: [],
      supportedWalletIds: [...config.sol.wallets],
      on: () => () => {},
    };
  }

  const registry = getWallets();

  return {
    get wallets() {
      return registry
        .get()
        .filter((wallet) => supportsSolana(wallet))
        .filter((wallet) => config.sol.wallets.includes(resolveWalletId(wallet) as never));
    },
    supportedWalletIds: [...config.sol.wallets],
    on(event, listener) {
      return registry.on("register", listener);
    },
  };
}

export function toSolWalletDescriptors(wallets: Wallet[]): WalletDescriptor[] {
  return wallets.map((wallet) => {
    const walletId = resolveWalletId(wallet);
    let downloadUrl: string | undefined;
    let description: string | undefined;

    if (walletId === "phantom") {
      downloadUrl = "https://phantom.app/";
      description = "Phantom is a friendly crypto wallet for Solana.";
    } else if (walletId === "jupiter") {
      downloadUrl = "https://jup.ag/";
      description = "Jupiter - The best swap experience on Solana.";
    } else if (walletId === "solflare") {
      downloadUrl = "https://solflare.com/";
      description = "The most popular Solana wallet.";
    } else if (walletId === "backpack") {
      downloadUrl = "https://backpack.app/";
      description = "Backpack is the home for your xNFTs.";
    }

    return {
      namespace: "sol",
      walletId,
      name: wallet.name,
      installed: true,
      ready: true,
      icon: wallet.icon,
      downloadUrl,
      description,
      _walletName: wallet.name,
    } as WalletDescriptor & { _walletName?: string };
  });
}
