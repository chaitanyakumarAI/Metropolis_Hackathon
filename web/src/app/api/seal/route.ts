import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { firstFanAbi } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { seal } from "@/lib/seal";
import { serverClient } from "@/lib/server";

// Encrypts exclusive content for a creator so it can be stored on-chain.
// Only registered creators can seal, and only that address can publish the
// resulting post (publishPost is creator-only on-chain; the ciphertext is
// bound to the creator address, so it cannot be re-used by anyone else).
export async function POST(request: Request) {
  try {
    const { creator, body, imageURI, link } = await request.json();
    if (!CONTRACT_ADDRESS) return NextResponse.json({ error: "Contract not configured" }, { status: 503 });
    if (typeof creator !== "string" || !isAddress(creator)) {
      return NextResponse.json({ error: "Invalid creator address" }, { status: 400 });
    }
    if (typeof body !== "string" || body.trim().length === 0 || body.length > 1500) {
      return NextResponse.json({ error: "Exclusive text must be 1-1500 characters" }, { status: 400 });
    }
    for (const [name, v] of [
      ["Image URL", imageURI],
      ["Link", link],
    ] as const) {
      if (v !== undefined && v !== "" && (typeof v !== "string" || v.length > 400 || !/^https:\/\//.test(v))) {
        return NextResponse.json({ error: `${name} must be an https:// URL` }, { status: 400 });
      }
    }
    const registered = await serverClient().readContract({
      address: CONTRACT_ADDRESS,
      abi: firstFanAbi,
      functionName: "isCreator",
      args: [creator],
    });
    if (!registered) return NextResponse.json({ error: "Address is not a registered creator" }, { status: 403 });

    const sealed = seal(creator, { body: body.trim(), imageURI: imageURI || undefined, link: link || undefined });
    if ((sealed.length - 2) / 2 > 4096) {
      return NextResponse.json({ error: "Exclusive content is too large" }, { status: 400 });
    }
    return NextResponse.json({ sealed });
  } catch (err) {
    console.error("seal failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not seal content" }, { status: 500 });
  }
}
