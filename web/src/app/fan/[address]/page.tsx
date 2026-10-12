"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isAddress, type Address } from "viem";
import { useAccount } from "wagmi";
import { TierChip } from "@/components/TierChip";
import { Avatar, DemoBadge, Empty, ErrorNote, ExternalIcon, FoundingBadge, Skeleton } from "@/components/ui";
import { chain, explorerAddress } from "@/lib/config";
import { fullDate, mon, ordinal } from "@/lib/format";
import { useCreatorMap, usePassport } from "@/lib/hooks";

export default function PassportPage() {
  const params = useParams<{ address: string }>();
  const raw = params.address;
  const valid = isAddress(raw);
  const fan = valid ? (raw as Address) : undefined;
  const { address: me } = useAccount();
  const { data, isLoading, error } = usePassport(fan);
  const { map } = useCreatorMap();
  const mine = !!me && !!fan && me.toLowerCase() === fan.toLowerCase();

  if (!valid) return <ErrorNote>That isn&apos;t a valid wallet address.</ErrorNote>;

  const entries = [...(data ?? [])].sort((a, b) => Number(a.record.firstSupportAt - b.record.firstSupportAt));
  const founding = entries.filter((e) => e.founding).length;
  const total = entries.reduce((a, e) => a + e.record.total, 0n);
  const bestRank = entries.length ? Math.min(...entries.map((e) => e.record.rank)) : 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-ink p-6 text-paper sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <Avatar seed={fan!} size={64} />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-paper/50">Supporter passport</div>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">{mine ? "Your early-support record" : "Early-support record"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-paper/70">
              <span className="break-all">{fan}</span>
              <DemoBadge address={fan} />
              {explorerAddress(fan!) && (
                <a href={explorerAddress(fan!)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-paper/80 hover:text-white">
                  explorer <ExternalIcon className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
        <dl className="relative mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Creators backed", entries.length],
            ["Founding badges", founding],
            ["Earliest rank", bestRank ? `#${bestRank}` : "—"],
            ["Total support", `${mon(total, 3)} MON`],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-[11px] uppercase tracking-widest text-paper/50">{k}</dt>
              <dd className="mt-1 font-display text-3xl">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="relative mt-4 max-w-xl text-xs text-paper/50">
          Read live from the FirstFan contract on {chain.name}. Portable: any app can verify this wallet&apos;s ranks with <code>getFanPassport()</code>.
        </p>
      </section>

      {error ? (
        <ErrorNote>Couldn&apos;t load this passport. Please retry.</ErrorNote>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : entries.length === 0 ? (
        <Empty title={mine ? "You haven't backed anyone yet" : "No support recorded yet"}>
          <Link href="/creators" className="text-accent">Find a creator with founding spots open →</Link>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {entries.map((e) => {
            const c = map.get(e.creator.toLowerCase());
            return (
              <Link key={e.creator} href={c ? `/c/${c.handle}` : "#"} className="card group flex gap-4 p-5 transition hover:shadow-lift">
                <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ${e.founding ? "bg-gold-soft text-gold-ink" : "bg-paper text-ink-soft"}`}>
                  <span className="text-[10px] uppercase tracking-wider">Fan</span>
                  <span className="font-display text-3xl leading-none">#{e.record.rank}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {c && <Avatar src={c.avatarURI} name={c.name} seed={c.account} size={22} className="ring-0" />}
                    <span className="truncate font-semibold group-hover:text-accent">{c?.name ?? e.creator}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {ordinal(e.record.rank)} supporter · {mon(e.record.total)} MON across {e.record.supportCount} support{e.record.supportCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">Since {fullDate(e.record.firstSupportAt)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.founding && <FoundingBadge />}
                    <TierChip creator={e.creator} tier={e.tier} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
