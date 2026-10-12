"use client";

import { useState } from "react";
import { CreatorCard } from "@/components/Community";
import { Empty, ErrorNote, Skeleton } from "@/components/ui";
import { useCreators } from "@/lib/hooks";

type Sort = "newest" | "supporters" | "founding";

export default function CreatorsPage() {
  const { data, isLoading, error } = useCreators();
  const [sort, setSort] = useState<Sort>("founding");
  const [q, setQ] = useState("");

  const list = [...(data ?? [])]
    .filter((c) => !q || `${c.name} ${c.handle} ${c.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === "supporters") return b.supporterCount - a.supporterCount;
      if (sort === "founding") return (b.foundingSlots - b.supporterCount) - (a.foundingSlots - a.supporterCount);
      return Number(b.createdAt - a.createdAt);
    });

  return (
    <div>
      <h1 className="font-display text-5xl">Creators</h1>
      <p className="mt-2 max-w-xl text-ink-muted">Emerging artists building their first community. Founding spots go to the earliest supporters — and stay theirs.</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Search name, handle or craft" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="founding">Most founding spots left</option>
          <option value="supporters">Most supporters</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <div className="mt-6">
        {error ? (
          <ErrorNote>Couldn&apos;t load creators. Please retry.</ErrorNote>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : list.length === 0 ? (
          <Empty title="No creators found" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <CreatorCard key={c.account} creator={c} />)}</div>
        )}
      </div>
    </div>
  );
}
