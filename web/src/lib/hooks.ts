"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { firstFanAbi } from "./abi";
import { CONTRACT_ADDRESS } from "./config";
import type { Creator, Poll, Post, SupportEntry, SupporterRecord, Tier } from "./types";

const ff = { address: CONTRACT_ADDRESS as Address, abi: firstFanAbi } as const;
const ZERO = "0x0000000000000000000000000000000000000000";

function useChainQuery<T>(
  key: (string | number | undefined)[],
  fn: (client: PublicClient) => Promise<T>,
  opts: { enabled?: boolean; refetchInterval?: number } = {},
) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["ff", ...key],
    queryFn: () => fn(client as PublicClient),
    enabled: !!client && !!CONTRACT_ADDRESS && (opts.enabled ?? true),
    refetchInterval: opts.refetchInterval,
  });
}

export function useStats() {
  return useChainQuery(["stats"], async (c) => {
    const [creators, supports, posts] = await Promise.all([
      c.readContract({ ...ff, functionName: "creatorCount" }),
      c.readContract({ ...ff, functionName: "supportCount" }),
      c.readContract({ ...ff, functionName: "postCount" }),
    ]);
    return { creators: Number(creators), supports: Number(supports), posts: Number(posts) };
  }, { refetchInterval: 15_000 });
}

export function useCreators() {
  return useChainQuery(["creators"], async (c) => {
    const list = await c.readContract({ ...ff, functionName: "getCreators", args: [0n, 200n] });
    return list as readonly Creator[];
  }, { refetchInterval: 30_000 });
}

export function useCreatorByHandle(handle?: string) {
  return useChainQuery(["creator-handle", handle], async (c) => {
    const [creator, tiers] = await c.readContract({ ...ff, functionName: "getCreatorByHandle", args: [handle!] });
    if (creator.createdAt === 0n) return null;
    return { creator: creator as Creator, tiers: tiers as readonly Tier[] };
  }, { enabled: !!handle });
}

export function useCreatorByAddress(address?: Address) {
  return useChainQuery(["creator-addr", address], async (c) => {
    const [creator, tiers] = await c.readContract({ ...ff, functionName: "getCreator", args: [address!] });
    if (creator.createdAt === 0n) return null;
    return { creator: creator as Creator, tiers: tiers as readonly Tier[] };
  }, { enabled: !!address });
}

export function useRecentPosts(limit = 60) {
  return useChainQuery(["posts", limit], async (c) => {
    return (await c.readContract({ ...ff, functionName: "getRecentPosts", args: [0n, BigInt(limit)] })) as readonly Post[];
  }, { refetchInterval: 30_000 });
}

export function useCreatorPosts(creator?: Address) {
  return useChainQuery(["creator-posts", creator], async (c) => {
    return (await c.readContract({ ...ff, functionName: "getCreatorPosts", args: [creator!, 0n, 100n] })) as readonly Post[];
  }, { enabled: !!creator });
}

export function useRecentSupports(limit = 12) {
  return useChainQuery(["supports", limit], async (c) => {
    return (await c.readContract({ ...ff, functionName: "getRecentSupports", args: [0n, BigInt(limit)] })) as readonly SupportEntry[];
  }, { refetchInterval: 10_000 });
}

export function useCreatorSupports(creator?: Address, limit = 25) {
  return useChainQuery(["creator-supports", creator, limit], async (c) => {
    return (await c.readContract({
      ...ff,
      functionName: "getCreatorSupports",
      args: [creator!, 0n, BigInt(limit)],
    })) as readonly SupportEntry[];
  }, { enabled: !!creator, refetchInterval: 10_000 });
}

export type SupporterView = { supporter: Address; record: SupporterRecord; tier: number; founding: boolean };

export function useSupporters(creator?: Address) {
  return useChainQuery(["supporters", creator], async (c) => {
    return (await c.readContract({ ...ff, functionName: "getSupporters", args: [creator!, 0n, 200n] })) as readonly SupporterView[];
  }, { enabled: !!creator });
}

export function useSupporter(creator?: Address, fan?: Address) {
  return useChainQuery(["supporter", creator, fan], async (c) => {
    const [record, tier, founding] = await c.readContract({ ...ff, functionName: "getSupporter", args: [creator!, fan!] });
    return { record: record as SupporterRecord, tier: Number(tier), founding };
  }, { enabled: !!creator && !!fan && fan !== ZERO });
}

export type PassportEntry = { creator: Address; record: SupporterRecord; tier: number; founding: boolean };

export function usePassport(fan?: Address) {
  return useChainQuery(["passport", fan], async (c) => {
    return (await c.readContract({ ...ff, functionName: "getFanPassport", args: [fan!] })) as readonly PassportEntry[];
  }, { enabled: !!fan });
}

export function useCreatorPolls(creator?: Address) {
  return useChainQuery(["polls", creator], async (c) => {
    return (await c.readContract({ ...ff, functionName: "getCreatorPolls", args: [creator!] })) as readonly Poll[];
  }, { enabled: !!creator });
}

export function useMyVotes(pollIds: bigint[], voter?: Address) {
  return useChainQuery(["votes", voter, pollIds.join(",")], async (c) => {
    const votes = await Promise.all(
      pollIds.map((id) => c.readContract({ ...ff, functionName: "voteOf", args: [id, voter!] })),
    );
    return Object.fromEntries(pollIds.map((id, i) => [id.toString(), Number(votes[i])]));
  }, { enabled: !!voter && pollIds.length > 0 });
}

/** Resolve each support record to the transaction that emitted it (exact-block log lookup). */
export function useSupportTxHashes(entries?: readonly SupportEntry[]) {
  const ids = entries?.map((e) => e.id.toString()).join(",");
  return useChainQuery(["support-tx", ids], async (c) => {
    const pairs = await Promise.all(
      (entries ?? []).map(async (e) => {
        try {
          const logs = await c.getContractEvents({
            ...ff,
            eventName: "Supported",
            args: { supportId: e.id },
            fromBlock: e.blockNumber,
            toBlock: e.blockNumber,
          });
          return [e.id.toString(), logs[0]?.transactionHash] as const;
        } catch {
          return [e.id.toString(), undefined] as const;
        }
      }),
    );
    return Object.fromEntries(pairs) as Record<string, `0x${string}` | undefined>;
  }, { enabled: !!entries && entries.length > 0 });
}

/** Lookup table address -> creator for rendering feeds. */
export function useCreatorMap() {
  const q = useCreators();
  const map = new Map<string, Creator>();
  q.data?.forEach((c) => map.set(c.account.toLowerCase(), c));
  return { ...q, map };
}
