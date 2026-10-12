import { NextResponse } from "next/server";
import { markAlchemyDown, serverRpcUrls } from "@/lib/server";

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
type RpcResponse = { error?: { code: number; message: string } };

function invalid(req: Partial<RpcRequest> | undefined, message: string) {
  return { jsonrpc: "2.0", id: req?.id ?? null, error: { code: -32601, message } };
}

/** Provider-level failure (bad key, network not enabled, rate limit) rather than a normal call result. */
function providerFailed(status: number, parsed: RpcResponse | RpcResponse[] | null) {
  if (status >= 400 || parsed === null) return true;
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.length > 0 && list.every((r) => r.error && [-32600, -32001, -32005, 429].includes(r.error.code));
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

  const payload = JSON.stringify(body);
  const upstreams = serverRpcUrls();
  for (const [i, upstream] of upstreams.entries()) {
    const last = i === upstreams.length - 1;
    try {
      const res = await fetch(upstream.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        cache: "no-store",
      });
      const text = await res.text();
      let parsed: RpcResponse | RpcResponse[] | null = null;
      try {
        parsed = JSON.parse(text);
      } catch {}
      if (!last && providerFailed(res.status, parsed)) {
        if (upstream.name === "alchemy") markAlchemyDown();
        continue;
      }
      return new NextResponse(text, {
        status: res.status,
        headers: { "content-type": "application/json", "x-rpc-provider": upstream.name },
      });
    } catch {
      if (upstream.name === "alchemy") markAlchemyDown();
      if (last) break;
    }
  }
  return NextResponse.json(invalid(batch[0], "Upstream RPC unavailable"), { status: 502 });
}
