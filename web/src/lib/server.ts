// Server-only chain access. Uses Alchemy's Monad testnet RPC when ALCHEMY_API_KEY is set.
import { createPublicClient, http } from "viem";
import { chain } from "./config";

export function serverRpcUrl() {
  if (process.env.NEXT_PUBLIC_CHAIN === "local") return "http://127.0.0.1:8545";
  if (process.env.ALCHEMY_API_KEY) return `https://monad-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  return process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
}

export const rpcProvider = () =>
  process.env.NEXT_PUBLIC_CHAIN === "local" ? "local" : process.env.ALCHEMY_API_KEY ? "alchemy" : "public";

export const serverClient = () => createPublicClient({ chain, transport: http(serverRpcUrl()) });
