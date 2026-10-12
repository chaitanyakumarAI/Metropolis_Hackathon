import { NextResponse } from "next/server";
import { isAddress, isHex, type Address } from "viem";
import { firstFanAbi } from "@/lib/abi";
import { SESSION_TTL_MS, sessionMessage } from "@/lib/auth";
import { chain, CONTRACT_ADDRESS } from "@/lib/config";
import { unseal } from "@/lib/seal";
import { serverClient } from "@/lib/server";
import type { UnlockedContent } from "@/lib/types";

type Result = { ok: true; content: UnlockedContent } | { ok: false; reason: string };

// Unlocks exclusive posts. Two independent checks, both server-side:
//  1. the caller proves wallet ownership with a signature (no transaction), and
//  2. the FirstFan contract confirms that wallet satisfies the post's access rule.
export async function POST(request: Request) {
  try {
    const { address, issuedAt, signature, postIds } = await request.json();
    if (!CONTRACT_ADDRESS) return NextResponse.json({ error: "Contract not configured" }, { status: 503 });
    if (typeof address !== "string" || !isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    if (typeof signature !== "string" || !isHex(signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    if (!Array.isArray(postIds) || postIds.length === 0 || postIds.length > 50) {
      return NextResponse.json({ error: "postIds must be a non-empty array (max 50)" }, { status: 400 });
    }
    const issued = Date.parse(issuedAt);
    if (!Number.isFinite(issued) || issued > Date.now() + 60_000 || Date.now() - issued > SESSION_TTL_MS) {
      return NextResponse.json({ error: "Session expired. Verify your wallet again." }, { status: 401 });
    }

    const client = serverClient();
    const valid = await client.verifyMessage({
      address: address as Address,
      message: sessionMessage(address, issuedAt, chain.id),
      signature,
    });
    if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

    const results: Record<string, Result> = {};
    await Promise.all(
      postIds.map(async (raw: unknown) => {
        const key = String(raw);
        if (!/^\d{1,18}$/.test(key)) {
          results[key] = { ok: false, reason: "Invalid post id" };
          return;
        }
        try {
          const post = await client.readContract({
            address: CONTRACT_ADDRESS as Address,
            abi: firstFanAbi,
            functionName: "getPost",
            args: [BigInt(key)],
          });
          const allowed = await client.readContract({
            address: CONTRACT_ADDRESS as Address,
            abi: firstFanAbi,
            functionName: "canAccess",
            args: [post.creator, address as Address, post.access],
          });
          if (!allowed) results[key] = { ok: false, reason: "Not eligible yet" };
          else if (post.sealedContent === "0x") results[key] = { ok: false, reason: "Post is public" };
          else results[key] = { ok: true, content: unseal(post.creator, post.sealedContent) };
        } catch {
          results[key] = { ok: false, reason: "Post not found or unreadable" };
        }
      }),
    );
    return NextResponse.json({ results });
  } catch (err) {
    console.error("unlock failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Unlock failed" }, { status: 500 });
  }
}
