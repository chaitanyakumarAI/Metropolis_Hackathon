"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { chain, CONTRACT_ADDRESS, FAUCET_URL } from "@/lib/config";

export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  if (!CONTRACT_ADDRESS) {
    return (
      <div className="border-b border-ember/20 bg-ember-soft px-4 py-2 text-center text-xs text-ember">
        The FirstFan contract address is not configured for this deployment (set NEXT_PUBLIC_CONTRACT_ADDRESS).
      </div>
    );
  }
  if (isConnected && chainId !== chain.id) {
    return (
      <div className="border-b border-ember/20 bg-ember-soft px-4 py-2 text-center text-xs text-ember">
        Your wallet is on another network. FirstFan runs on <b>{chain.name}</b> (chain ID {chain.id}).{" "}
        <button className="font-semibold underline" onClick={() => switchChain({ chainId: chain.id })}>
          Switch network
        </button>
      </div>
    );
  }
  return (
    <div className="border-b border-line/70 bg-card/60 px-4 py-1.5 text-center text-[11px] text-ink-muted">
      Running on <b className="text-ink-soft">{chain.name}</b>. Testnet MON has no monetary value —{" "}
      <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
        get free testnet MON
      </a>
      .
    </div>
  );
}
