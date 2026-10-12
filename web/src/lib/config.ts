import { defineChain, type Address } from "viem";

const isLocal = process.env.NEXT_PUBLIC_CHAIN === "local";

export const monadTestnet = defineChain({
  id: 10_143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Testnet MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
  testnet: true,
});

export const localChain = defineChain({
  id: 31_337,
  name: "Hardhat Local",
  nativeCurrency: { name: "Local MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  testnet: true,
});

export const chain = isLocal ? localChain : monadTestnet;
export const EXPLORER_URL = isLocal ? "" : "https://testnet.monadscan.com";
export const FAUCET_URL = "https://faucet.monad.xyz";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as Address | "";
export const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "0");

/** Accounts seeded by the FirstFan team for the demo; badged as "Demo" everywhere. */
export const DEMO_ADDRESSES = new Set(
  (process.env.NEXT_PUBLIC_DEMO_ADDRESSES || "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean),
);

export const isDemo = (address?: string) => !!address && DEMO_ADDRESSES.has(address.toLowerCase());

export const ACCESS_PUBLIC = 0;
export const ACCESS_FOUNDING = 255;
export const MIN_SUPPORT = "0.001";

export const explorerTx = (hash: string) => (EXPLORER_URL ? `${EXPLORER_URL}/tx/${hash}` : "");
export const explorerAddress = (addr: string) => (EXPLORER_URL ? `${EXPLORER_URL}/address/${addr}` : "");
