"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ACCESS_FOUNDING } from "@/lib/config";
import { accessLabel, fullDate, mon, timeAgo, timeLeft } from "@/lib/format";
import { useMyVotes, useSupportTxHashes, useSupporter, type SupporterView } from "@/lib/hooks";
import type { Creator, Poll, SupportEntry, Tier } from "@/lib/types";
import { useTx } from "@/lib/useTx";
import { TxStatus } from "./TxStatus";
import { AddressLink, Avatar, CheckIcon, DemoBadge, Empty, FoundingBadge, Skeleton, StarIcon, TxLink } from "./ui";

export function TierList({ creator, tiers, myTier, myFounding }: { creator: Creator; tiers: readonly Tier[]; myTier?: number; myFounding?: boolean }) {
  return (
    <div className="card p-5">
      <h3 className="font-display text-2xl">Supporter benefits</h3>
      <p className="mt-1 text-sm text-ink-muted">Set by {creator.name}. Checked against on-chain support before anything unlocks.</p>
      <ul className="mt-4 space-y-2.5">
        <li className={`rounded-xl border p-3.5 ${myFounding ? "border-gold/50 bg-gold-soft/60" : "border-line"}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <StarIcon className="h-4 w-4 text-gold" /> Founding fan
            </span>
            <span className="text-xs text-ink-muted">First {creator.foundingSlots} supporters</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Permanent on-chain rank and access to founding-only posts.</p>
          {myFounding && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-gold-ink"><CheckIcon className="h-3.5 w-3.5" /> You hold this</p>}
        </li>
        {tiers.map((t, i) => {
          const have = (myTier ?? 0) >= i + 1;
          return (
            <li key={t.name} className={`rounded-xl border p-3.5 ${have ? "border-mint/40 bg-mint-soft/50" : "border-line"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{t.name}</span>
                <span className="text-xs text-ink-muted">{mon(t.minTotal)} MON total</span>
              </div>
              {t.perk && <p className="mt-1 text-sm text-ink-soft">{t.perk}</p>}
              {have && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-mint"><CheckIcon className="h-3.5 w-3.5" /> Unlocked</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SupporterWall({ supporters, tiers, loading }: { supporters?: readonly SupporterView[]; tiers: readonly Tier[]; loading?: boolean }) {
  if (loading) return <Skeleton className="h-40" />;
  if (!supporters?.length) return <Empty title="No supporters yet">Be fan #1 — your rank is recorded on-chain forever.</Empty>;
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
      {supporters.map((s) => (
        <li key={s.supporter} className="flex items-center gap-3 px-4 py-3">
          <span className={`w-9 shrink-0 font-display text-2xl ${s.founding ? "text-gold" : "text-ink-faint"}`}>#{s.record.rank}</span>
          <Avatar seed={s.supporter} size={30} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <AddressLink address={s.supporter} />
              {s.founding && <FoundingBadge />}
              {s.tier > 0 && <span className="chip bg-accent-soft text-accent-dark">{tiers[s.tier - 1]?.name}</span>}
              <DemoBadge address={s.supporter} />
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">First supported {fullDate(s.record.firstSupportAt)}</div>
          </div>
          <div className="text-right text-sm font-semibold">{mon(s.record.total)} <span className="text-xs font-normal text-ink-muted">MON</span></div>
        </li>
      ))}
    </ol>
  );
}

export function ActivityList({
  entries,
  creators,
  loading,
  showCreator = true,
}: {
  entries?: readonly SupportEntry[];
  creators?: Map<string, Creator>;
  loading?: boolean;
  showCreator?: boolean;
}) {
  const { data: hashes } = useSupportTxHashes(entries);
  if (loading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!entries?.length) return <Empty title="No support yet">The first supporter shows up here, with an on-chain receipt.</Empty>;
  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const c = creators?.get(e.creator.toLowerCase());
        return (
          <li key={e.id.toString()} className="animate-fade-up rounded-xl border border-line bg-card px-3.5 py-3">
            <div className="flex items-start gap-3">
              <Avatar seed={e.supporter} size={30} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="leading-snug">
                  <AddressLink address={e.supporter} /> supported{" "}
                  {showCreator && c ? (
                    <Link href={`/c/${c.handle}`} className="font-semibold hover:text-accent">{c.name}</Link>
                  ) : showCreator ? "a creator" : null}{" "}
                  with <b>{mon(e.amount)} MON</b>
                  {e.rank === 1 && <span className="text-gold-ink"> · first fan ever</span>}
                </p>
                {e.note && <p className="mt-1 text-ink-soft">&ldquo;{e.note}&rdquo;</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span>Fan #{e.rank}</span>
                  <span>{timeAgo(e.timestamp)}</span>
                  <span>Block {e.blockNumber.toString()}</span>
                  <TxLink hash={hashes?.[e.id.toString()]} label="Receipt" />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PollCard({ poll, tiers, creator }: { poll: Poll; tiers: readonly Tier[]; creator: Creator }) {
  const { address } = useAccount();
  const { data: me } = useSupporter(creator.account, address);
  const { data: votes } = useMyVotes([poll.id], address);
  const { state, send, busy } = useTx();
  const myVote = votes?.[poll.id.toString()] ?? 0;
  const total = poll.votes.reduce((a, b) => a + b, 0);
  const open = Number(poll.endsAt) > Date.now() / 1000;
  const isCreator = !!address && address.toLowerCase() === creator.account.toLowerCase();
  const supported = !!me && me.record.rank > 0;
  const eligible =
    supported && (poll.access === 0 || (poll.access === ACCESS_FOUNDING ? me!.founding : me!.tier >= poll.access));
  const canVote = open && eligible && myVote === 0 && !isCreator;

  let hint = "";
  if (!open) hint = "Voting has closed.";
  else if (!address) hint = "Connect your wallet to vote.";
  else if (isCreator) hint = "Creators can't vote in their own polls.";
  else if (myVote) hint = "Your vote is recorded on-chain.";
  else if (!supported) hint = "Only supporters can vote.";
  else if (!eligible) hint = `Requires ${accessLabel(poll.access, tiers)} tier.`;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <span className="chip bg-accent-soft text-accent-dark">Community vote</span>
        <span>{poll.access === 0 ? "All supporters" : `${accessLabel(poll.access, tiers)}+`}</span>
        <span>· {timeLeft(poll.endsAt)}</span>
        <span>· {total} vote{total === 1 ? "" : "s"}</span>
      </div>
      <h4 className="mt-2 font-display text-2xl leading-tight">{poll.question}</h4>
      <div className="mt-3 space-y-2">
        {poll.options.map((opt, i) => {
          const pct = total ? Math.round((poll.votes[i] / total) * 100) : 0;
          const mine = myVote === i + 1;
          return (
            <button
              key={opt}
              disabled={!canVote || busy}
              onClick={() => send({ functionName: "vote", args: [poll.id, i] })}
              className={`relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${mine ? "border-accent" : "border-line"} ${canVote ? "hover:border-accent" : "cursor-default"}`}
            >
              <span className="absolute inset-y-0 left-0 bg-accent-soft transition-all" style={{ width: `${pct}%` }} />
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  {mine && <CheckIcon className="h-4 w-4 text-accent" />}
                  {opt}
                </span>
                <span className="text-xs text-ink-muted">{poll.votes[i]} · {pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-2 text-xs text-ink-muted">{hint}</p>}
      <TxStatus state={state} successText="Vote recorded on Monad." />
    </div>
  );
}

export function CreatorCard({ creator }: { creator: Creator }) {
  const left = Math.max(0, creator.foundingSlots - creator.supporterCount);
  return (
    <Link href={`/c/${creator.handle}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center gap-3">
        <Avatar src={creator.avatarURI} name={creator.name} seed={creator.account} size={48} />
        <div className="min-w-0">
          <div className="truncate font-semibold group-hover:text-accent">{creator.name}</div>
          <div className="truncate text-xs text-ink-muted">@{creator.handle} · {creator.category}</div>
        </div>
      </div>
      {creator.bio && <p className="line-clamp-2 text-sm text-ink-soft">{creator.bio.replace(/^Demo creator · /, "")}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-ink/5 text-ink-soft">{creator.supporterCount} supporter{creator.supporterCount === 1 ? "" : "s"}</span>
        {left > 0 ? (
          <span className="chip bg-gold-soft text-gold-ink"><StarIcon className="h-3 w-3" /> {left} founding spot{left === 1 ? "" : "s"} left</span>
        ) : (
          <span className="chip bg-ink/5 text-ink-muted">Founding spots filled</span>
        )}
        <DemoBadge address={creator.account} />
      </div>
    </Link>
  );
}
