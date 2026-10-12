"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";

export default function PassportLanding() {
  const { address } = useAccount();
  const router = useRouter();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (address) router.replace(`/fan/${address}`);
  }, [address, router]);

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <h1 className="font-display text-5xl">Supporter passport</h1>
      <p className="mt-3 text-ink-muted">
        Every creator a wallet has backed, its rank among their supporters, founding badges and tiers — all verifiable on-chain.
      </p>
      <div className="mt-6 flex justify-center">
        <ConnectButton />
      </div>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (isAddress(value.trim())) router.push(`/fan/${value.trim()}`);
        }}
      >
        <input className="input" placeholder="…or look up any 0x address" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn-primary" disabled={!isAddress(value.trim())}>View</button>
      </form>
    </div>
  );
}
