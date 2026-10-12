"use client";

import { useMemo, useState } from "react";
import { decodeEventLog, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { firstFanAbi } from "@/lib/abi";
import { chain, FAUCET_URL, MIN_SUPPORT } from "@/lib/config";
import { mon, ordinal } from "@/lib/format";
import { useSupporter } from "@/lib/hooks";
import type { Creator, Tier } from "@/lib/types";
import { useTx } from "@/lib/useTx";
import { ConnectButton } from "./ConnectButton";
import { TxStatus } from "./TxStatus";
import { StarIcon, TxLink } from "./ui";

export function SupportPanel({ creator, tiers }: { creator: Creator; tiers: readonly Tier[] }) {
  const { address, isConnected } = useAccount();
  const { data: me } = useSupporter(creator.account, address);
  const { data: balance } = useBalance({ address, chainId: chain.id });
  const { state, send, busy, reset } = useTx();
  const [amount, setAmount] = useState("0.005");
  const [note, setNote] = useState("");

  const isSelf = !!address && address.toLowerCase() === creator.account.toLowerCase();
  const current = me?.record.total ?? 0n;
  const isNew = !me || me.record.rank === 0;
  const nextRank = creator.supporterCount + 1;
  const foundingLeft = Math.max(0, creator.foundingSlots - creator.supporterCount);

  let wei: bigint | null = null;
  let amountError = "";
  try {
    wei = parseEther(amount || "0");
    if (wei < parseEther(MIN_SUPPORT)) amountError = `Minimum is ${MIN_SUPPORT} MON`;
  } catch {
    amountError = "Enter a valid amount";
  }
  if (!amountError && wei !== null && balance && wei > balance.value) amountError = "More than your testnet balance";

  const presets = useMemo(() => {
    const p = tiers
      .map((t) => ({ label: `Reach ${t.name}`, value: t.minTotal - current }))
      .filter((x) => x.value > 0n)
      .map((x) => ({ ...x, value: x.value < parseEther(MIN_SUPPORT) ? parseEther(MIN_SUPPORT) : x.value }));
    if (p.length === 0) p.push({ label: "Tip", value: parseEther("0.005") });
    return p.slice(0, 3);
  }, [tiers, current]);

  const projectedTotal = current + (wei ?? 0n);
  const projectedTier = tiers.reduce((acc, t, i) => (projectedTotal >= t.minTotal ? i + 1 : acc), 0);

  const confirmed = state.status === "success" ? decodeSupported(state.receipt.logs) : null;

  async function submit() {
    if (!wei || amountError) return;
    const receipt = await send({ functionName: "support", args: [creator.account, note.trim()], value: wei });
    if (receipt) setNote("");
  }

  return (
    <div id="support" className="card scroll-mt-24 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-3xl leading-none">Support {creator.name.split(" ")[0]}</h3>
          <p className="mt-1.5 text-sm text-ink-muted">Recorded on {chain.name}. Testnet MON only — no real money.</p>
        </div>
      </div>

      {confirmed ? (
        <div className="mt-4 animate-fade-up rounded-2xl bg-ink p-5 text-paper">
          <div className="text-xs uppercase tracking-widest text-paper/60">Confirmed on-chain</div>
          <div className="mt-1 font-display text-4xl">You&apos;re fan #{confirmed.rank}</div>
          <p className="mt-1 text-sm text-paper/75">
            {confirmed.rank <= creator.foundingSlots ? "Founding fan status locked in forever. " : ""}
            Your total support to {creator.name} is now {mon(confirmed.total)} MON.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <TxLink hash={state.status === "success" ? state.hash : undefined} label="See proof on explorer" />
            <button className="text-xs font-semibold text-paper/70 hover:text-paper" onClick={reset}>
              Support again
            </button>
          </div>
        </div>
      ) : (
        <>
          {isConnected && !isSelf && (
            <div className="mt-4 rounded-xl bg-paper p-3.5 text-sm">
              {isNew ? (
                <p>
                  You&apos;d become <b>fan #{nextRank}</b>
                  {foundingLeft > 0 ? (
                    <> — one of the first {creator.foundingSlots}. <span className="text-gold-ink">Founding fan ✦</span></>
                  ) : (
                    "."
                  )}
                </p>
              ) : (
                <p>
                  You&apos;re {creator.name.split(" ")[0]}&apos;s <b>{ordinal(me!.record.rank)} supporter</b>
                  {me!.founding && <span className="text-gold-ink"> · Founding fan ✦</span>} with {mon(current)} MON so far.
                </p>
              )}
              {wei !== null && !amountError && projectedTier > (me?.tier ?? 0) && (
                <p className="mt-1 text-mint">This unlocks the {tiers[projectedTier - 1].name} tier.</p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`btn-ghost px-3 py-1.5 text-xs ${amount === mon(p.value, 6) ? "border-accent text-accent" : ""}`}
                onClick={() => setAmount(mon(p.value, 6))}
              >
                {p.label} · {mon(p.value)}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3">
            <div>
              <label className="label" htmlFor="amt">Amount (MON)</label>
              <input id="amt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
              {amountError && amount !== "" && <p className="mt-1 text-xs text-ember">{amountError}</p>}
            </div>
            <div>
              <label className="label" htmlFor="note">Note (optional, public, on-chain)</label>
              <input id="note" className="input" maxLength={140} placeholder="Why are you supporting early?" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            {!isConnected ? (
              <ConnectButton className="w-full" />
            ) : isSelf ? (
              <p className="text-sm text-ink-muted">This is your creator page — creators can&apos;t support themselves.</p>
            ) : (
              <button className="btn-accent w-full py-3" disabled={busy || !!amountError} onClick={submit}>
                <StarIcon className="h-4 w-4" /> Support with {amountError ? "…" : `${amount} MON`}
              </button>
            )}
          </div>
          {isConnected && balance && balance.value < parseEther("0.02") && (
            <p className="mt-2 text-xs text-ink-muted">
              Low on testnet MON?{" "}
              <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
                Use the Monad faucet
              </a>
              .
            </p>
          )}
        </>
      )}
      <TxStatus state={state} successText="Support confirmed on Monad." />
    </div>
  );
}

function decodeSupported(logs: readonly { data: `0x${string}`; topics: readonly `0x${string}`[] }[]) {
  for (const log of logs) {
    try {
      const ev = decodeEventLog({ abi: firstFanAbi, data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      if (ev.eventName === "Supported") return { rank: Number(ev.args.rank), total: ev.args.supporterTotal };
    } catch {}
  }
  return null;
}
