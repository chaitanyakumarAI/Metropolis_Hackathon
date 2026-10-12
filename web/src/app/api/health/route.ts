import { NextResponse } from "next/server";
import { chain, CONTRACT_ADDRESS } from "@/lib/config";
import { envioConfigured } from "@/lib/pulse";
import { alchemyStatus, serverClient, serverRpcUrls } from "@/lib/server";

export const dynamic = "force-dynamic";

// Lightweight status endpoint: confirms the server's RPC (Alchemy or public)
// is on the expected chain and the configured contract has code.
export async function GET() {
  const started = Date.now();
  try {
    const client = serverClient();
    const [alchemy, chainId, blockNumber, code] = await Promise.all([
      alchemyStatus(),
      client.getChainId(),
      client.getBlockNumber(),
      CONTRACT_ADDRESS ? client.getCode({ address: CONTRACT_ADDRESS }) : Promise.resolve(undefined),
    ]);
    return NextResponse.json({
      ok: chainId === chain.id,
      chainId,
      expectedChainId: chain.id,
      blockNumber: blockNumber.toString(),
      rpcProvider: alchemy === "ok" ? "alchemy" : serverRpcUrls().at(-1)!.name,
      alchemy,
      contract: CONTRACT_ADDRESS || null,
      contractDeployed: !!code && code !== "0x",
      sealConfigured: !!process.env.SEAL_SECRET,
      envioHyperSync: envioConfigured(),
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message.slice(0, 200) : "error" },
      { status: 502 },
    );
  }
}
