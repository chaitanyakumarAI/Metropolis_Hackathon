// Server-only chain access. Prefers Alchemy's Monad testnet RPC when ALCHEMY_API_KEY is set,
// and falls back to the public Monad RPC if Alchemy is unreachable or rejects the request.
import { createPublicClient, fallback, http } from "viem";
import { chain } from "./config";

const PUBLIC_RPC = () => process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const alchemyUrl = () =>
  process.env.ALCHEMY_API_KEY ? `https://monad-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null;

// Remember a failed Alchemy check briefly so every request doesn't pay for a doomed first attempt.
let alchemyDownUntil = 0;
export const markAlchemyDown = () => {
  alchemyDownUntil = Date.now() + 5 * 60_000;
};

/** RPC endpoints in priority order. */
export function serverRpcUrls(): { name: "alchemy" | "public" | "local"; url: string }[] {
  if (process.env.NEXT_PUBLIC_CHAIN === "local") return [{ name: "local", url: "http://127.0.0.1:8545" }];
  const a = Date.now() < alchemyDownUntil ? null : alchemyUrl();
  return [...(a ? [{ name: "alchemy" as const, url: a }] : []), { name: "public" as const, url: PUBLIC_RPC() }];
}

export const serverClient = () =>
  createPublicClient({
    chain,
    transport: fallback(serverRpcUrls().map((r) => http(r.url, { timeout: 10_000 }))),
  });

/** Checks whether Alchemy currently serves Monad testnet for our key. */
export async function alchemyStatus(): Promise<"ok" | "not-configured" | string> {
  const url = alchemyUrl();
  if (!url) return "not-configured";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId" }),
      cache: "no-store",
    });
    const body = await res.json();
    if (body.result && parseInt(body.result, 16) === chain.id) return "ok";
    markAlchemyDown();
    return `error: ${String(body.error?.message ?? res.status).split(".")[0].slice(0, 80)}`;
  } catch {
    markAlchemyDown();
    return "error: unreachable";
  }
}
