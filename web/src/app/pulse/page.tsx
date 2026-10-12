"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Avatar, DemoBadge, Empty, ErrorNote, Skeleton, StarIcon, TxLink } from "@/components/ui";
import { mon, shortAddr, timeAgo } from "@/lib/format";
import { useCreatorMap } from "@/lib/hooks";
import type { Pulse } from "@/lib/pulse";

export default function PulsePage() {
  const { map } = useCreatorMap();
  const { data, isLoading, error } = useQuery({
    queryKey: ["pulse"],
    queryFn: async () => {
      const res = await fetch("/api/pulse");
      if (!res.ok) throw new Error("pulse");
      return (await res.json()) as Pulse;
    },
    refetchInterval: 20_000,
  });

  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.supports) ?? [1]));
  const creatorName = (a: string) => map.get(a.toLowerCase());

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Pulse</h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Who is backing creators first, and who is gaining supporters fastest — computed from every <code>Supported</code> event on-chain.
          </p>
        </div>
        {data && (
          <span className={`chip px-3 py-1.5 ${data.source === "envio-hypersync" ? "bg-accent-soft text-accent-dark" : "bg-ink/5 text-ink-muted"}`}>
            {data.source === "envio-hypersync" ? "Indexed by Envio HyperSync" : "Source: contract storage (indexer offline)"}
          </span>
        )}
      </header>

      {error ? (
        <ErrorNote>Couldn&apos;t load on-chain activity. Please retry.</ErrorNote>
      ) : isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : data.totals.supports === 0 ? (
        <Empty title="No support yet">The first support on FirstFan will show up here.</Empty>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Supports", data.totals.supports],
              ["Unique supporters", data.totals.uniqueSupporters],
              ["Creators backed", data.totals.creatorsBacked],
              ["Testnet MON sent", mon(BigInt(data.totals.volume), 3)],
            ].map(([k, v]) => (
              <div key={k as string} className="card px-4 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-ink-muted">{k}</dt>
                <dd className="mt-1 font-display text-3xl">{v}</dd>
              </div>
            ))}
          </dl>

          <section className="card p-5">
            <h2 className="font-display text-3xl">Supports per day</h2>
            <div className="mt-4 flex h-36 items-end gap-1.5">
              {data.daily.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
                  <div className="relative w-full flex-1">
                    <div
                      className="absolute bottom-0 w-full rounded-t-md bg-accent/80 transition group-hover:bg-accent"
                      style={{ height: `${(d.supports / maxDaily) * 100}%`, minHeight: d.supports ? 4 : 0 }}
                      title={`${d.day}: ${d.supports} supports, ${mon(BigInt(d.volume))} MON`}
                    />
                  </div>
                  <span className="text-[10px] text-ink-faint">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted">Last 14 days (UTC). Hover a bar for details.</p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-display text-3xl">Earliest believers</h2>
              <p className="mt-1 text-sm text-ink-muted">Wallets that were among the first 10 supporters of the most creators.</p>
              <ol className="mt-4 space-y-2">
                {data.believers.map((b, i) => (
                  <li key={b.address} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2.5">
                    <span className="w-6 font-display text-xl text-ink-faint">{i + 1}</span>
                    <Avatar seed={b.address} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/fan/${b.address}`} className="font-mono text-xs hover:text-accent">{shortAddr(b.address)}</Link>
                        <DemoBadge address={b.address} />
                      </div>
                      <div className="text-xs text-ink-muted">
                        Early for {b.earlyBacks} · backed {b.creatorsBacked} · best rank #{b.bestRank}
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{mon(BigInt(b.total))}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-3xl">Gaining fans this week</h2>
              <p className="mt-1 text-sm text-ink-muted">New supporters in the last 7 days.</p>
              {data.trending.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">No support in the last 7 days.</p>
              ) : (
                <ol className="mt-4 space-y-2">
                  {data.trending.map((t) => {
                    const c = creatorName(t.creator);
                    return (
                      <li key={t.creator}>
                        <Link href={c ? `/c/${c.handle}` : "#"} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2.5 hover:bg-line/50">
                          <Avatar src={c?.avatarURI} name={c?.name} seed={t.creator} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{c?.name ?? shortAddr(t.creator)}</div>
                            <div className="text-xs text-ink-muted">{t.supports7d} support{t.supports7d === 1 ? "" : "s"} this week</div>
                          </div>
                          <span className="chip bg-mint-soft text-mint">+{t.newSupporters7d} fan{t.newSupporters7d === 1 ? "" : "s"}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>

          <section>
            <h2 className="mb-3 font-display text-3xl">Full support history</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {data.recent.map((e) => {
                const c = creatorName(e.creator);
                return (
                  <li key={e.supportId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                    <Link href={`/fan/${e.supporter}`} className="font-mono text-xs hover:text-accent">{shortAddr(e.supporter)}</Link>
                    <span className="text-ink-muted">→</span>
                    <Link href={c ? `/c/${c.handle}` : "#"} className="font-semibold hover:text-accent">{c?.name ?? shortAddr(e.creator)}</Link>
                    <span>{mon(BigInt(e.amount))} MON</span>
                    <span className={`chip ${e.rank <= 10 ? "bg-gold-soft text-gold-ink" : "bg-ink/5 text-ink-muted"}`}>
                      {e.rank <= 10 && <StarIcon className="h-3 w-3" />} fan #{e.rank}
                    </span>
                    <span className="ml-auto flex items-center gap-3 text-xs text-ink-muted">
                      {e.timestamp ? timeAgo(e.timestamp) : `block ${e.blockNumber}`}
                      <TxLink hash={e.txHash} label="tx" />
                    </span>
                  </li>
                );
              })}
            </ul>
            {data.source === "envio-hypersync" && data.scannedToBlock && (
              <p className="mt-2 text-xs text-ink-muted">HyperSync scanned through block {data.scannedToBlock}.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
