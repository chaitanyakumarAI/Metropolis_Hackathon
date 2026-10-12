import { NextResponse } from "next/server";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { getPulse, type Pulse } from "@/lib/pulse";

export const dynamic = "force-dynamic";

// Small in-memory cache so bursts of visitors don't re-scan history.
let cached: { at: number; data: Pulse } | null = null;
const TTL_MS = 15_000;

export async function GET() {
  if (!CONTRACT_ADDRESS) return NextResponse.json({ error: "Contract not configured" }, { status: 503 });
  try {
    if (!cached || Date.now() - cached.at > TTL_MS) cached = { at: Date.now(), data: await getPulse() };
    return NextResponse.json(cached.data, { headers: { "cache-control": "public, max-age=10" } });
  } catch (err) {
    console.error("pulse failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not load activity" }, { status: 502 });
  }
}
