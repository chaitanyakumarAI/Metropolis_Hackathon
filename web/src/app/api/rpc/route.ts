import { NextResponse } from "next/server";
import { serverRpcUrl } from "@/lib/server";

// Read-only JSON-RPC proxy: browsers read chain state through our server so the
// Alchemy key stays secret. Wallet writes never go through here.
const ALLOWED = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_call",
  "eth_getLogs",
  "eth_getBalance",
  "eth_getCode",
  "eth_getBlockByNumber",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_gasPrice",
  "net_version",
]);
const MAX_BATCH = 50;

type RpcRequest = { jsonrpc: string; id: number | string | null; method: string; params?: unknown[] };

function invalid(req: Partial<RpcRequest> | undefined, message: string) {
  return { jsonrpc: "2.0", id: req?.id ?? null, error: { code: -32601, message } };
}

export async function POST(request: Request) {
  let body: RpcRequest | RpcRequest[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(invalid(undefined, "Invalid JSON"), { status: 400 });
  }
  const batch = Array.isArray(body) ? body : [body];
  if (batch.length === 0 || batch.length > MAX_BATCH) {
    return NextResponse.json(invalid(undefined, "Batch too large"), { status: 400 });
  }
  if (batch.some((r) => !r || typeof r.method !== "string" || !ALLOWED.has(r.method))) {
    const errors = batch.map((r) => invalid(r, `Method not allowed: ${r?.method}`));
    return NextResponse.json(Array.isArray(body) ? errors : errors[0], { status: 400 });
  }

  try {
    const upstream = await fetch(serverRpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, { status: upstream.status, headers: { "content-type": "application/json" } });
  } catch {
    return NextResponse.json(invalid(batch[0], "Upstream RPC unavailable"), { status: 502 });
  }
}
