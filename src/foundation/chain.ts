import type { Chain, ChainConfig } from "./types.js";

export const CHAINS: Record<Chain, ChainConfig> = {
  sol: {
    id: "sol",
    nativeCurrency: "SOL",
    nativeAddress: "So11111111111111111111111111111111111111112",
    nativeDecimals: 9,
    defaultFilters: {},
    explorerUrl: "https://solscan.io",
    applicableSecurityFields: {
      freezeAuthority: true,
      mintAuthority: true,
      honeypot: false,
      buyTax: false,
      sellTax: false,
    },
    displayLabel: "◎ SOL",
  },
  bsc: {
    id: "bsc",
    nativeCurrency: "BNB",
    nativeAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    nativeDecimals: 18,
    defaultFilters: {},
    explorerUrl: "https://bscscan.com",
    applicableSecurityFields: {
      freezeAuthority: false,
      mintAuthority: false,
      honeypot: true,
      buyTax: true,
      sellTax: true,
    },
    displayLabel: "⬢ BSC",
  },
  base: {
    id: "base",
    nativeCurrency: "ETH",
    nativeAddress: "0x4200000000000000000000000000000000000006",
    nativeDecimals: 18,
    defaultFilters: {},
    explorerUrl: "https://basescan.org",
    applicableSecurityFields: {
      freezeAuthority: false,
      mintAuthority: false,
      honeypot: true,
      buyTax: true,
      sellTax: true,
    },
    displayLabel: "▲ BASE",
  },
};

export function getChainConfig(chain: Chain): ChainConfig {
  return CHAINS[chain];
}

export function getExplorerTxUrl(chain: Chain, hash: string): string {
  const config = CHAINS[chain];
  return `${config.explorerUrl}/tx/${hash}`;
}

const VALID_CHAINS = ["sol", "bsc", "base"] as const satisfies readonly Chain[];

export function isValidChain(value: string): value is Chain {
  return (VALID_CHAINS as readonly string[]).includes(value);
}
