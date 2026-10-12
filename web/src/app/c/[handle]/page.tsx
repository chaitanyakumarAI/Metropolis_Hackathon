"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ActivityList, PollCard, SupporterWall, TierList } from "@/components/Community";
import { PostCard } from "@/components/PostCard";
import { SupportPanel } from "@/components/SupportPanel";
import { Avatar, DemoBadge, Empty, ErrorNote, ExternalIcon, FoundingBadge, Skeleton } from "@/components/ui";
import { explorerAddress } from "@/lib/config";
import { mon } from "@/lib/format";
import {
  useCreatorByHandle,
  useCreatorPolls,
  useCreatorPosts,
  useCreatorSupports,
  useSupporter,
  useSupporters,
} from "@/lib/hooks";
import { useUnlock } from "@/lib/unlock";

type Tab = "work" | "community" | "activity";

export default function CreatorPage() {
  const { handle } = useParams<{ handle: string }>();
  const { address } = useAccount();
  const { data, isLoading, error } = useCreatorByHandle(handle);
  const creator = data?.creator;
  const tiers = data?.tiers ?? [];
  const posts = useCreatorPosts(creator?.account);
  const supporters = useSupporters(creator?.account);
  const activity = useCreatorSupports(creator?.account);
  const polls = useCreatorPolls(creator?.account);
  const { data: me } = useSupporter(creator?.account, address);
  const { unlock, unlocking } = useUnlock();
  const [tab, setTab] = useState<Tab>("work");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (error) return <ErrorNote>Couldn&apos;t load this creator from the chain. Please retry.</ErrorNote>;
  if (!creator) {
    return (
      <Empty title={`@${handle} isn't on FirstFan yet`}>
        <Link href="/creators" className="text-accent">Browse creators</Link> or <Link href="/studio" className="text-accent">claim this handle</Link>.
      </Empty>
    );
  }

  const cover = posts.data?.find((p) => p.access === 0 && p.imageURI)?.imageURI;
  const foundingLeft = Math.max(0, creator.foundingSlots - creator.supporterCount);
  const isOwner = !!address && address.toLowerCase() === creator.account.toLowerCase();
  const gatedIds = (posts.data ?? []).filter((p) => p.access !== 0).map((p) => p.id);
  const eligibleCount = (posts.data ?? []).filter(
    (p) => p.access !== 0 && (isOwner || (me && (p.access === 255 ? me.founding : me.tier >= p.access))),
  ).length;

  return (
    <div className="space-y-8">
      <section className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-ink to-accent-dark sm:h-56">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
        </div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <Avatar src={creator.avatarURI} name={creator.name} seed={creator.account} size={96} className="ring-4" />
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-4xl leading-none sm:text-5xl">{creator.name}</h1>
                <DemoBadge address={creator.account} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                <span>@{creator.handle}</span>·<span>{creator.category}</span>
                {explorerAddress(creator.account) && (
                  <a href={explorerAddress(creator.account)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
                    · on-chain <ExternalIcon className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            {isOwner && (
              <Link href="/studio" className="btn-ghost ml-auto">Open studio</Link>
            )}
          </div>
          {creator.bio && <p className="mt-4 max-w-2xl text-ink-soft">{creator.bio}</p>}
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Supporters", creator.supporterCount],
              ["Total raised", `${mon(creator.totalRaised, 3)} MON`],
              ["Founding spots left", `${foundingLeft} / ${creator.foundingSlots}`],
              ["Posts", posts.data?.length ?? "—"],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-paper px-3.5 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-ink-muted">{k}</dt>
                <dd className="mt-0.5 text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {me && me.record.rank > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent/20 bg-accent-soft/60 px-4 py-3 text-sm">
              <span>
                You&apos;re <b>fan #{me.record.rank}</b> · {mon(me.record.total)} MON total
                {me.tier > 0 && <> · <b>{tiers[me.tier - 1]?.name}</b> tier</>}
              </span>
              {me.founding && <FoundingBadge rank={me.record.rank} />}
              <Link href={`/fan/${address}`} className="ml-auto text-xs font-semibold text-accent hover:underline">View passport →</Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="mb-5 flex gap-1 rounded-full border border-line bg-card p-1 text-sm sm:w-fit">
            {([
              ["work", "Work"],
              ["community", `Supporters (${creator.supporterCount})`],
              ["activity", "Activity"],
            ] as [Tab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full px-4 py-1.5 ${tab === t ? "bg-ink text-paper" : "text-ink-soft"}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === "work" && (
            <div className="space-y-5">
              {eligibleCount > 1 && (
                <button className="btn-accent" disabled={unlocking} onClick={() => unlock(gatedIds)}>
                  Unlock all {eligibleCount} posts you qualify for
                </button>
              )}
              {polls.data?.map((p) => <PollCard key={p.id.toString()} poll={p} tiers={tiers} creator={creator} />)}
              {posts.isLoading ? (
                <Skeleton className="h-96" />
              ) : posts.data?.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {posts.data.map((p) => <PostCard key={p.id.toString()} post={p} creator={creator} showCreator={false} />)}
                </div>
              ) : (
                <Empty title="No posts yet">{isOwner ? <Link href="/studio" className="text-accent">Publish your first post →</Link> : "Support early and be first to see new work."}</Empty>
              )}
            </div>
          )}
          {tab === "community" && (
            <div>
              <p className="mb-3 text-sm text-ink-muted">Ranked by who supported first. Every rank is read directly from the contract.</p>
              <SupporterWall supporters={supporters.data} tiers={tiers} loading={supporters.isLoading} />
            </div>
          )}
          {tab === "activity" && <ActivityList entries={activity.data} loading={activity.isLoading} showCreator={false} />}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <SupportPanel creator={creator} tiers={tiers} />
          <TierList creator={creator} tiers={tiers} myTier={me?.tier} myFounding={me?.founding} />
        </aside>
      </div>
    </div>
  );
}
