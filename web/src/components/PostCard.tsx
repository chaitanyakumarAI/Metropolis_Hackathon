"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ACCESS_FOUNDING, ACCESS_PUBLIC } from "@/lib/config";
import { accessLabel, mon, timeAgo } from "@/lib/format";
import { useCreatorByAddress, useSupporter } from "@/lib/hooks";
import type { Creator, Post } from "@/lib/types";
import { useUnlock } from "@/lib/unlock";
import { Avatar, CheckIcon, DemoBadge, LockIcon, Spinner, StarIcon } from "./ui";

export function PostCard({ post, creator, showCreator = true }: { post: Post; creator?: Creator; showCreator?: boolean }) {
  const { address } = useAccount();
  const { data: profile } = useCreatorByAddress(post.creator);
  const c = creator ?? profile?.creator;
  const tiers = profile?.tiers ?? [];
  const gated = post.access !== ACCESS_PUBLIC;
  const { results, unlock, unlocking, error } = useUnlock();
  const outcome = results[post.id.toString()];
  const unlocked = outcome?.ok ? outcome.content : undefined;

  const { data: me } = useSupporter(gated ? post.creator : undefined, address);
  const isOwner = !!address && address.toLowerCase() === post.creator.toLowerCase();
  const eligible =
    isOwner ||
    (!!me && (post.access === ACCESS_FOUNDING ? me.founding : me.tier >= post.access));
  const requirement =
    post.access === ACCESS_FOUNDING
      ? `the first ${c?.foundingSlots ?? "few"} supporters`
      : tiers[post.access - 1]
        ? `${mon(tiers[post.access - 1].minTotal)} MON total support`
        : "";

  const image = unlocked?.imageURI || post.imageURI;

  return (
    <article className="card group overflow-hidden animate-fade-up">
      {showCreator && c && (
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <Link href={`/c/${c.handle}`} className="flex min-w-0 items-center gap-2.5">
            <Avatar src={c.avatarURI} name={c.name} seed={c.account} size={34} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">{c.name}</div>
              <div className="truncate text-xs text-ink-muted">
                @{c.handle} · {timeAgo(post.createdAt)}
              </div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <DemoBadge address={c.account} />
          </div>
        </div>
      )}

      {image && (
        <div className="relative aspect-[4/3] overflow-hidden bg-line/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={post.title}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-500 ${gated && !unlocked ? "scale-110 blur-xl brightness-90" : "group-hover:scale-[1.02]"}`}
          />
          {gated && !unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/25 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                <LockIcon className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold drop-shadow">{accessLabel(post.access, tiers)} only</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {gated ? (
            <span className={`chip ${post.access === ACCESS_FOUNDING ? "bg-gold-soft text-gold-ink" : "bg-accent-soft text-accent-dark"}`}>
              {post.access === ACCESS_FOUNDING ? <StarIcon className="h-3 w-3" /> : <LockIcon className="h-3 w-3" />}
              {accessLabel(post.access, tiers)}
            </span>
          ) : (
            <span className="chip bg-ink/5 text-ink-muted">Public</span>
          )}
          {!showCreator && <span className="text-xs text-ink-muted">{timeAgo(post.createdAt)}</span>}
        </div>
        <h3 className="font-display text-2xl leading-tight">{post.title}</h3>
        {post.body && <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{post.body}</p>}

        {gated && unlocked && (
          <div className="mt-3 rounded-xl border border-mint/30 bg-mint-soft/60 p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-mint">
              <CheckIcon className="h-3.5 w-3.5" /> Unlocked — eligibility verified on-chain
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{unlocked.body}</p>
            {unlocked.link && (
              <a href={unlocked.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
                Open exclusive link →
              </a>
            )}
          </div>
        )}

        {gated && !unlocked && (
          <div className="mt-3 rounded-xl bg-paper p-3.5 text-sm">
            {!address ? (
              <p className="text-ink-muted">Connect your wallet to check whether you can unlock this. {requirement && <>Requires {requirement}.</>}</p>
            ) : eligible ? (
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn-accent py-2" disabled={unlocking} onClick={() => unlock([post.id])}>
                  {unlocking ? <Spinner /> : <LockIcon className="h-4 w-4" />} Unlock
                </button>
                <span className="text-xs text-ink-muted">You qualify. Sign once (free, no transaction) to view.</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-ink-muted">Requires {requirement || accessLabel(post.access, tiers)}.</span>
                {c && (
                  <Link href={`/c/${c.handle}#support`} className="font-semibold text-accent hover:underline">
                    Support {c.name.split(" ")[0]} to unlock →
                  </Link>
                )}
              </div>
            )}
            {outcome && !outcome.ok && <p className="mt-2 text-xs text-ember">{outcome.reason}</p>}
            {error && !outcome && <p className="mt-2 text-xs text-ember">{error}</p>}
          </div>
        )}
      </div>
    </article>
  );
}
