// Server-only: platform analytics built from every Supported event.
// Primary source: Envio HyperSync (full event history incl. tx hashes and block times).
// Fallback when ENVIO_API_TOKEN is not configured: the contract's own support log.
import { decodeEventLog, encodeEventTopics, type Address, type Hex } from "viem";
import { firstFanAbi } from "./abi";
import { CONTRACT_ADDRESS, DEPLOY_BLOCK } from "./config";
import { serverClient } from "./server";

export type PulseEvent = {
  supportId: string;
  creator: Address;
  supporter: Address;
  amount: string; // wei
  rank: number;
  note: string;
  blockNumber: string;
  timestamp: number;
  txHash?: Hex;
};

export type Pulse = {
  source: "envio-hypersync" | "contract";
  generatedAt: number;
  scannedToBlock?: string;
  totals: { supports: number; uniqueSupporters: number; creatorsBacked: number; volume: string };
  daily: { day: string; supports: number; volume: string }[];
  believers: { address: Address; earlyBacks: number; creatorsBacked: number; bestRank: number; total: string }[];
  trending: { creator: Address; newSupporters7d: number; supports7d: number }[];
  recent: PulseEvent[];
};

const HYPERSYNC_URL = process.env.ENVIO_HYPERSYNC_URL || "https://10143.hypersync.xyz";
const EARLY_RANK = 10; // "early" = among a creator's first 10 supporters
const SUPPORTED_TOPIC = encodeEventTopics({ abi: firstFanAbi, eventName: "Supported" })[0];

export const envioConfigured = () => !!process.env.ENVIO_API_TOKEN;

const toBig = (v: unknown) => (v === null || v === undefined ? 0n : BigInt(v as string | number));

type HsLog = { block_number: unknown; transaction_index: unknown; log_index: unknown; data: Hex; topic0?: Hex; topic1?: Hex; topic2?: Hex; topic3?: Hex };
type HsTx = { block_number: unknown; transaction_index: unknown; hash: Hex };
type HsBlock = { number: unknown; timestamp: unknown };
type HsBatch = { logs?: HsLog[]; transactions?: HsTx[]; blocks?: HsBlock[] };

/** Fetch every Supported event for the contract via HyperSync's HTTP query API. */
async function fromHyperSync(): Promise<{ events: PulseEvent[]; scannedTo: bigint }> {
  const token = process.env.ENVIO_API_TOKEN!;
  const logs: HsLog[] = [];
  const txs = new Map<string, Hex>();
  const times = new Map<string, number>();
  let from = DEPLOY_BLOCK;
  let scannedTo = from;

  for (let page = 0; page < 50; page++) {
    const res = await fetch(`${HYPERSYNC_URL}/query`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        from_block: Number(from),
        logs: [{ address: [CONTRACT_ADDRESS], topics: [[SUPPORTED_TOPIC]] }],
        field_selection: {
          block: ["number", "timestamp"],
          transaction: ["block_number", "transaction_index", "hash"],
          log: ["block_number", "transaction_index", "log_index", "data", "topic0", "topic1", "topic2", "topic3"],
        },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HyperSync ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const body = (await res.json()) as { data?: HsBatch | HsBatch[]; next_block?: number | string; archive_height?: number | string };
    const batches = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
    for (const b of batches) {
      b.logs?.forEach((l) => logs.push(l));
      b.transactions?.forEach((t) => txs.set(`${toBig(t.block_number)}:${toBig(t.transaction_index)}`, t.hash));
      b.blocks?.forEach((blk) => times.set(toBig(blk.number).toString(), Number(toBig(blk.timestamp))));
    }
    const next = toBig(body.next_block);
    const height = toBig(body.archive_height);
    scannedTo = next;
    if (next <= from || (height && next >= height)) break;
    from = next;
  }

  const events: PulseEvent[] = [];
  for (const l of logs) {
    const topics = [l.topic0, l.topic1, l.topic2, l.topic3].filter(Boolean) as [Hex, ...Hex[]];
    try {
      const ev = decodeEventLog({ abi: firstFanAbi, data: l.data, topics });
      if (ev.eventName !== "Supported") continue;
      const bn = toBig(l.block_number);
      events.push({
        supportId: ev.args.supportId.toString(),
        creator: ev.args.creator,
        supporter: ev.args.supporter,
        amount: ev.args.amount.toString(),
        rank: Number(ev.args.rank),
        note: ev.args.note,
        blockNumber: bn.toString(),
        timestamp: times.get(bn.toString()) ?? 0,
        txHash: txs.get(`${bn}:${toBig(l.transaction_index)}`),
      });
    } catch {
      // ignore undecodable logs
    }
  }
  return { events, scannedTo };
}

/** Fallback: read the support log stored in the contract itself. */
async function fromContract(): Promise<PulseEvent[]> {
  const client = serverClient();
  const out: PulseEvent[] = [];
  for (let offset = 0n; offset < 5000n; offset += 500n) {
    const page = await client.readContract({
      address: CONTRACT_ADDRESS as Address,
      abi: firstFanAbi,
      functionName: "getRecentSupports",
      args: [offset, 500n],
    });
    page.forEach((e) =>
      out.push({
        supportId: e.id.toString(),
        creator: e.creator,
        supporter: e.supporter,
        amount: e.amount.toString(),
        rank: e.rank,
        note: e.note,
        blockNumber: e.blockNumber.toString(),
        timestamp: Number(e.timestamp),
      }),
    );
    if (page.length < 500) break;
  }
  return out;
}

export function aggregate(events: PulseEvent[], source: Pulse["source"], scannedTo?: bigint): Pulse {
  const sorted = [...events].sort((a, b) => Number(BigInt(b.supportId) - BigInt(a.supportId)));
  const now = Date.now() / 1000;
  let volume = 0n;
  const supporters = new Map<string, { early: Set<string>; creators: Set<string>; best: number; total: bigint; address: Address }>();
  const creators = new Set<string>();
  const days = new Map<string, { supports: number; volume: bigint }>();
  for (let i = 13; i >= 0; i--) {
    days.set(new Date((now - i * 86400) * 1000).toISOString().slice(0, 10), { supports: 0, volume: 0n });
  }
  const trending = new Map<string, { creator: Address; fans: number; supports: number }>();
  // When each (creator, supporter) pair first appeared — i.e. when the fan got their rank.
  const firstSeen = new Map<string, number>();
  for (const e of sorted) {
    const pair = `${e.creator.toLowerCase()}:${e.supporter.toLowerCase()}`;
    const t = firstSeen.get(pair);
    if (t === undefined || e.timestamp < t) firstSeen.set(pair, e.timestamp);
  }

  for (const e of sorted) {
    const amt = BigInt(e.amount);
    volume += amt;
    creators.add(e.creator.toLowerCase());
    const key = e.supporter.toLowerCase();
    const s = supporters.get(key) ?? { early: new Set(), creators: new Set(), best: Infinity, total: 0n, address: e.supporter };
    s.creators.add(e.creator.toLowerCase());
    if (e.rank <= EARLY_RANK) s.early.add(e.creator.toLowerCase());
    s.best = Math.min(s.best, e.rank);
    s.total += amt;
    supporters.set(key, s);

    if (!e.timestamp) continue;
    const d = days.get(new Date(e.timestamp * 1000).toISOString().slice(0, 10));
    if (d) {
      d.supports += 1;
      d.volume += amt;
    }
    if (now - e.timestamp < 7 * 86400) {
      const t = trending.get(e.creator.toLowerCase()) ?? { creator: e.creator, fans: 0, supports: 0 };
      t.supports += 1;
      if (firstSeen.get(`${e.creator.toLowerCase()}:${key}`) === e.timestamp && e.rank > 0) t.fans += 1;
      trending.set(e.creator.toLowerCase(), t);
    }
  }

  return {
    source,
    generatedAt: Date.now(),
    scannedToBlock: scannedTo?.toString(),
    totals: { supports: events.length, uniqueSupporters: supporters.size, creatorsBacked: creators.size, volume: volume.toString() },
    daily: [...days.entries()].map(([day, d]) => ({ day, supports: d.supports, volume: d.volume.toString() })),
    believers: [...supporters.values()]
      .map((s) => ({ address: s.address, earlyBacks: s.early.size, creatorsBacked: s.creators.size, bestRank: s.best, total: s.total.toString() }))
      .sort((a, b) => b.earlyBacks - a.earlyBacks || a.bestRank - b.bestRank || Number(BigInt(b.total) - BigInt(a.total)))
      .slice(0, 10),
    trending: [...trending.values()]
      .map((t) => ({ creator: t.creator, newSupporters7d: t.fans, supports7d: t.supports }))
      .sort((a, b) => b.newSupporters7d - a.newSupporters7d || b.supports7d - a.supports7d)
      .slice(0, 5),
    recent: sorted.slice(0, 40),
  };
}

export async function getPulse(): Promise<Pulse> {
  if (envioConfigured()) {
    try {
      const { events, scannedTo } = await fromHyperSync();
      return aggregate(events, "envio-hypersync", scannedTo);
    } catch (err) {
      console.error("HyperSync failed, falling back to contract reads:", err instanceof Error ? err.message : err);
    }
  }
  return aggregate(await fromContract(), "contract");
}
