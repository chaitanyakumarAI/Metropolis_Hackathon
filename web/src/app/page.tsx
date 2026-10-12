"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ActivityList, CreatorCard } from "@/components/Community";
import { PostCard } from "@/components/PostCard";
import { Empty, ErrorNote, Skeleton, StarIcon } from "@/components/ui";
import { ACCESS_PUBLIC, chain } from "@/lib/config";
import { mon } from "@/lib/format";
import { useCreatorMap, useRecentPosts, useRecentSupports, useStats } from "@/lib/hooks";

type Filter = "all" | "public" | "exclusive";

export default function DiscoverPage() {
  const { map, data: creators, isLoading: loadingCreators } = useCreatorMap();
  const posts = useRecentPosts();
  const supports = useRecentSupports(8);
  const stats = useStats();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => ["All", ...Array.from(new Set(creators?.map((c) => c.category) ?? []))], [creators]);
  const totalRaised = creators?.reduce((a, c) => a + c.totalRaised, 0n) ?? 0n;

  const visible = (posts.data ?? []).filter((p) => {
    if (filter === "public" && p.access !== ACCESS_PUBLIC) return false;
    if (filter === "exclusive" && p.access === ACCESS_PUBLIC) return false;
    if (category !== "All" && map.get(p.creator.toLowerCase())?.category !== category) return false;
    return true;
  });

  const rising = [...(creators ?? [])]
    .filter((c) => c.supporterCount < c.foundingSlots)
    .sort((a, b) => b.supportCount - a.supportCount)
    .slice(0, 3);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[28px] bg-ink px-6 py-10 text-paper sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-40 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="chip bg-paper/10 text-paper/80">
            <StarIcon className="h-3 w-3 text-gold" /> Early support, verifiably yours
          </span>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] sm:text-7xl">
            Be someone&apos;s <em className="text-[#C9BCFF]">first</em> fan.
          </h1>
          <p className="mt-4 max-w-xl text-base text-paper/75 sm:text-lg">
            Discover emerging campus photographers, illustrators and musicians. Support them early and your rank —
            fan #1, #2, #3 — is recorded on {chain.name} forever, unlocking the benefits they define.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#feed" className="btn bg-paper text-ink hover:bg-white">Explore the feed</a>
            <Link href="/studio" className="btn border border-paper/25 text-paper hover:bg-paper/10">I&apos;m a creator</Link>
          </div>
        </div>
        <dl className="relative mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Creators", stats.data?.creators],
            ["Supports", stats.data?.supports],
            ["Posts", stats.data?.posts],
            ["MON raised", creators ? mon(totalRaised, 3) : undefined],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-[11px] uppercase tracking-widest text-paper/50">{label}</dt>
              <dd className="mt-1 font-display text-3xl">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="relative mt-3 text-[11px] text-paper/45">
          Live counts read from the FirstFan contract. Includes clearly-labelled demo accounts seeded by our team.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section id="feed" className="scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-4xl">Fresh work</h2>
            <div className="flex rounded-full border border-line bg-card p-1 text-sm">
              {(["all", "public", "exclusive"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 capitalize ${filter === f ? "bg-ink text-paper" : "text-ink-soft"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {categories.length > 2 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`chip border text-xs ${category === c ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-soft"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {posts.error ? (
            <ErrorNote>Couldn&apos;t load posts from {chain.name}. Please retry in a moment.</ErrorNote>
          ) : posts.isLoading || loadingCreators ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-96" />)}
            </div>
          ) : visible.length === 0 ? (
            <Empty title="Nothing here yet">
              {posts.data?.length ? "Try another filter." : <>Creators publish here first. <Link className="text-accent" href="/studio">Start your page →</Link></>}
            </Empty>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {visible.map((p) => (
                <PostCard key={p.id.toString()} post={p} creator={map.get(p.creator.toLowerCase())} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-8">
          <div>
            <h2 className="mb-3 font-display text-3xl">Founding spots open</h2>
            {loadingCreators ? (
              <Skeleton className="h-40" />
            ) : rising.length ? (
              <div className="space-y-3">{rising.map((c) => <CreatorCard key={c.account} creator={c} />)}</div>
            ) : (
              <p className="text-sm text-ink-muted">Every founding spot is taken — check out all creators.</p>
            )}
            <Link href="/creators" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">All creators →</Link>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
              </span>
              <h2 className="font-display text-3xl">Live support</h2>
            </div>
            <ActivityList entries={supports.data} creators={map} loading={supports.isLoading} />
          </div>
        </aside>
      </div>
    </div>
  );
}
