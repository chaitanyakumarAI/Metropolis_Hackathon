"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { chain } from "@/lib/config";
import { mon, shortAddr } from "@/lib/format";
import { useCreatorByAddress } from "@/lib/hooks";
import { Avatar, Spinner } from "./ui";

export function ConnectButton({ className = "" }: { className?: string }) {
  const { address, chainId, isConnected, status } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: balance } = useBalance({ address, chainId: chain.id });
  const { data: me } = useCreatorByAddress(address);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!mounted || status === "reconnecting") {
    return <div className={`h-10 w-36 rounded-full bg-line/60 ${className}`} />;
  }

  if (!isConnected) {
    const hasInjected = typeof window !== "undefined" && "ethereum" in window;
    if (!hasInjected) {
      return (
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className={`btn-primary ${className}`}>
          Install a wallet
        </a>
      );
    }
    return (
      <div className="flex flex-col items-end">
        <button
          className={`btn-primary ${className}`}
          disabled={isPending}
          onClick={() => connect({ connector: connectors[0], chainId: chain.id })}
        >
          {isPending && <Spinner />} Connect wallet
        </button>
        {error && <span className="mt-1 max-w-[220px] text-right text-[11px] text-ember">{/reject/i.test(error.message) ? "Connection cancelled" : error.message.split("\n")[0]}</span>}
      </div>
    );
  }

  if (chainId !== chain.id) {
    return (
      <button className={`btn bg-ember text-white hover:bg-ember/90 ${className}`} disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
        {switching && <Spinner />} Switch to {chain.name}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button className={`btn-ghost pl-1.5 ${className}`} onClick={() => setOpen((o) => !o)}>
        <Avatar seed={address!} src={me?.creator.avatarURI} name={me?.creator.name} size={28} className="ring-0" />
        <span className="font-mono text-xs">{shortAddr(address)}</span>
        {balance && <span className="hidden text-xs text-ink-muted sm:inline">{mon(balance.value, 3)} MON</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 animate-fade-up overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-lift">
          <div className="px-3 py-2 text-xs text-ink-muted">
            Connected to <span className="font-semibold text-ink">{chain.name}</span>
          </div>
          <Link href={`/fan/${address}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-paper" onClick={() => setOpen(false)}>
            My supporter passport
          </Link>
          {me ? (
            <Link href={`/c/${me.creator.handle}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-paper" onClick={() => setOpen(false)}>
              My creator page
            </Link>
          ) : null}
          <Link href="/studio" className="block rounded-xl px-3 py-2 text-sm hover:bg-paper" onClick={() => setOpen(false)}>
            {me ? "Creator studio" : "Become a creator"}
          </Link>
          <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-ember hover:bg-ember-soft" onClick={() => { disconnect(); setOpen(false); }}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
