"use client";

import type { Address } from "viem";
import { useCreatorByAddress } from "@/lib/hooks";
import { StarIcon } from "./ui";

/** Shows a fan's tier by the creator's own tier name. */
export function TierChip({ creator, tier }: { creator: Address; tier: number }) {
  const { data } = useCreatorByAddress(creator);
  if (tier <= 0) return null;
  return (
    <span className="chip bg-accent-soft text-accent-dark">
      <StarIcon className="h-3 w-3" /> {data?.tiers[tier - 1]?.name ?? `Tier ${tier}`}
    </span>
  );
}
