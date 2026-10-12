"use client";

import Link from "next/link";
import { useState } from "react";
import { parseEther, type Address } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { TxStatus } from "@/components/TxStatus";
import { Avatar, ErrorNote, Skeleton, Spinner } from "@/components/ui";
import { ACCESS_FOUNDING, ACCESS_PUBLIC, chain } from "@/lib/config";
import { accessLabel, mon } from "@/lib/format";
import { useCreatorByAddress } from "@/lib/hooks";
import type { Creator, Tier } from "@/lib/types";
import { useTx } from "@/lib/useTx";

const CATEGORIES = ["Photography", "Illustration", "Music", "Design", "Film", "Writing", "Fashion", "Other"];
const isHttps = (s: string) => /^https:\/\/\S+$/.test(s);

type TierDraft = { name: string; min: string; perk: string };

function toTiers(drafts: TierDraft[]): { tiers: Tier[]; error?: string } {
  const tiers: Tier[] = [];
  let prev = 0n;
  for (const [i, d] of drafts.entries()) {
    if (!d.name.trim()) return { tiers, error: `Tier ${i + 1} needs a name` };
    let min: bigint;
    try {
      min = parseEther(d.min || "0");
    } catch {
      return { tiers, error: `Tier ${i + 1} has an invalid amount` };
    }
    if (min <= prev) return { tiers, error: "Each tier must require more MON than the one before (and more than 0)" };
    prev = min;
    tiers.push({ name: d.name.trim(), minTotal: min, perk: d.perk.trim() });
  }
  return { tiers };
}

function TierEditor({ drafts, setDrafts }: { drafts: TierDraft[]; setDrafts: (d: TierDraft[]) => void }) {
  const update = (i: number, patch: Partial<TierDraft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-3">
      {drafts.map((d, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_120px]">
          <input className="input" placeholder="Tier name (e.g. Insider)" maxLength={32} value={d.name} onChange={(e) => update(i, { name: e.target.value })} />
          <input className="input" placeholder="Min MON" inputMode="decimal" value={d.min} onChange={(e) => update(i, { min: e.target.value.replace(",", ".") })} />
          <input className="input sm:col-span-2" placeholder="What supporters get (e.g. raw files, vote on next shoot)" maxLength={140} value={d.perk} onChange={(e) => update(i, { perk: e.target.value })} />
          <button type="button" className="justify-self-start text-xs font-semibold text-ember" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}>
            Remove tier
          </button>
        </div>
      ))}
      {drafts.length < 5 && (
        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setDrafts([...drafts, { name: "", min: "", perk: "" }])}>
          + Add tier
        </button>
      )}
    </div>
  );
}

function Register() {
  const { state, send, busy } = useTx();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Photography");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [founding, setFounding] = useState("10");
  const [drafts, setDrafts] = useState<TierDraft[]>([
    { name: "Supporter", min: "0.005", perk: "Behind-the-scenes posts" },
    { name: "Insider", min: "0.02", perk: "Raw files and a vote on what I make next" },
  ]);

  const { tiers, error: tierError } = toTiers(drafts);
  const handleOk = /^[a-z0-9_]{3,20}$/.test(handle);
  const foundingN = Number(founding);
  const errors = [
    !handleOk && handle && "Handle: 3-20 lowercase letters, numbers or underscores",
    avatar && !isHttps(avatar) && "Avatar must be an https:// image URL",
    (!Number.isInteger(foundingN) || foundingN < 1 || foundingN > 1000) && "Founding spots must be 1-1000",
    tierError,
  ].filter(Boolean) as string[];
  const ready = handleOk && name.trim() && errors.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-5xl">Start your FirstFan page</h1>
      <p className="mt-2 text-ink-muted">Your profile and supporter rules live on {chain.name}. You can publish work right after.</p>
      <form
        className="card mt-6 space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          send({ functionName: "registerCreator", args: [handle, name.trim(), bio.trim(), avatar.trim(), category, foundingN, tiers] });
        }}
      >
        <div className="flex items-center gap-4">
          <Avatar src={isHttps(avatar) ? avatar : undefined} name={name || "?"} seed={handle || "new"} size={64} />
          <div className="flex-1">
            <label className="label">Avatar image URL (optional)</label>
            <input className="input" placeholder="https://…" value={avatar} onChange={(e) => setAvatar(e.target.value.trim())} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Handle</label>
            <input className="input" placeholder="maya_frames" maxLength={20} value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} />
          </div>
          <div>
            <label className="label">Display name</label>
            <input className="input" maxLength={48} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Craft</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Founding fan spots</label>
            <input className="input" inputMode="numeric" value={founding} onChange={(e) => setFounding(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input min-h-[80px]" maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you make, and for whom?" />
        </div>
        <div>
          <label className="label">Supporter tiers (cumulative MON support)</label>
          <TierEditor drafts={drafts} setDrafts={setDrafts} />
        </div>
        {errors.length > 0 && <ErrorNote>{errors[0]}</ErrorNote>}
        <button className="btn-accent w-full py-3" disabled={!ready || busy}>
          {busy && <Spinner />} Create my page on-chain
        </button>
        <TxStatus state={state} successText="Your creator page is live." />
      </form>
    </div>
  );
}

function PublishPost({ creator, tiers }: { creator: Creator; tiers: readonly Tier[] }) {
  const { state, send, busy } = useTx();
  const [access, setAccess] = useState<number>(ACCESS_PUBLIC);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [secretBody, setSecretBody] = useState("");
  const [secretImage, setSecretImage] = useState("");
  const [secretLink, setSecretLink] = useState("");
  const [sealing, setSealing] = useState(false);
  const [sealError, setSealError] = useState("");
  const gated = access !== ACCESS_PUBLIC;

  const errors = [
    image && !isHttps(image) && "Image must be an https:// URL",
    gated && !secretBody.trim() && "Add the exclusive content supporters unlock",
    gated && secretImage && !isHttps(secretImage) && "Exclusive image must be an https:// URL",
    gated && secretLink && !isHttps(secretLink) && "Exclusive link must be an https:// URL",
  ].filter(Boolean) as string[];
  const ready = title.trim().length > 0 && errors.length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSealError("");
    let sealed: `0x${string}` = "0x";
    if (gated) {
      setSealing(true);
      try {
        const res = await fetch("/api/seal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ creator: creator.account, body: secretBody, imageURI: secretImage, link: secretLink }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not seal content");
        sealed = data.sealed;
      } catch (err) {
        setSealError(err instanceof Error ? err.message : "Could not seal content");
        setSealing(false);
        return;
      }
      setSealing(false);
    }
    const receipt = await send({ functionName: "publishPost", args: [access, title.trim(), body.trim(), image.trim(), sealed] });
    if (receipt) {
      setTitle(""); setBody(""); setImage(""); setSecretBody(""); setSecretImage(""); setSecretLink("");
    }
  }

  return (
    <form className="card space-y-4 p-5" onSubmit={submit}>
      <h2 className="font-display text-3xl">Publish work</h2>
      <div>
        <label className="label">Who can see the full post?</label>
        <div className="flex flex-wrap gap-2">
          {[ACCESS_PUBLIC, ...tiers.map((_, i) => i + 1), ACCESS_FOUNDING].map((a) => (
            <button type="button" key={a} onClick={() => setAccess(a)} className={`chip border px-3 py-1.5 text-xs ${access === a ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-soft"}`}>
              {accessLabel(a, tiers)}{a > 0 && a !== ACCESS_FOUNDING ? ` · ${mon(tiers[a - 1].minTotal)}+ MON` : ""}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Title</label>
        <input className="input" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">{gated ? "Public teaser (everyone sees this)" : "Caption"}</label>
        <textarea className="input min-h-[70px]" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div>
        <label className="label">{gated ? "Cover image URL (shown blurred until unlocked)" : "Image URL"}</label>
        <input className="input" placeholder="https://…" value={image} onChange={(e) => setImage(e.target.value.trim())} />
        {isHttps(image) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="Preview" className="mt-2 h-40 w-full rounded-xl object-cover" />
        )}
      </div>
      {gated && (
        <div className="space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
          <p className="text-xs text-accent-dark">
            Exclusive content is encrypted by the FirstFan server and stored on-chain. It is only decrypted for wallets the contract confirms as eligible.
          </p>
          <div>
            <label className="label">Exclusive text</label>
            <textarea className="input min-h-[90px]" maxLength={1500} value={secretBody} onChange={(e) => setSecretBody(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Exclusive image URL (optional)" value={secretImage} onChange={(e) => setSecretImage(e.target.value.trim())} />
            <input className="input" placeholder="Exclusive link (optional)" value={secretLink} onChange={(e) => setSecretLink(e.target.value.trim())} />
          </div>
        </div>
      )}
      {errors.length > 0 && (title || body || image) ? <ErrorNote>{errors[0]}</ErrorNote> : null}
      {sealError && <ErrorNote>{sealError}</ErrorNote>}
      <button className="btn-accent w-full py-3" disabled={!ready || busy || sealing}>
        {(busy || sealing) && <Spinner />} {sealing ? "Encrypting…" : "Publish on-chain"}
      </button>
      <TxStatus state={state} successText="Post published." />
    </form>
  );
}

function CreatePoll({ tiers }: { tiers: readonly Tier[] }) {
  const { state, send, busy } = useTx();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [access, setAccess] = useState(0);
  const [days, setDays] = useState("7");
  const clean = options.map((o) => o.trim()).filter(Boolean);
  const ready = question.trim() && clean.length >= 2 && Number(days) >= 1 && Number(days) <= 30;

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready) return;
        const r = await send({ functionName: "createPoll", args: [access, question.trim(), clean, BigInt(Math.round(Number(days) * 86400))] });
        if (r) { setQuestion(""); setOptions(["", ""]); }
      }}
    >
      <h2 className="font-display text-3xl">Ask your supporters</h2>
      <p className="-mt-2 text-sm text-ink-muted">One vote per eligible supporter, enforced by the contract.</p>
      <input className="input" placeholder="Where should the next shoot be?" maxLength={140} value={question} onChange={(e) => setQuestion(e.target.value)} />
      {options.map((o, i) => (
        <input key={i} className="input" placeholder={`Option ${i + 1}`} maxLength={60} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
      ))}
      {options.length < 4 && (
        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setOptions([...options, ""])}>+ Add option</button>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Who can vote</label>
          <select className="input" value={access} onChange={(e) => setAccess(Number(e.target.value))}>
            <option value={0}>All supporters</option>
            {tiers.map((t, i) => <option key={t.name} value={i + 1}>{t.name}+</option>)}
            <option value={ACCESS_FOUNDING}>Founding fans</option>
          </select>
        </div>
        <div>
          <label className="label">Duration (days)</label>
          <input className="input" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/[^\d.]/g, ""))} />
        </div>
      </div>
      <button className="btn-primary w-full" disabled={!ready || busy}>{busy && <Spinner />} Start vote</button>
      <TxStatus state={state} successText="Poll is live." />
    </form>
  );
}

function Earnings({ creator, account }: { creator: Creator; account: Address }) {
  const { state, send, busy } = useTx();
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-widest text-ink-muted">Available to withdraw</div>
      <div className="mt-1 font-display text-5xl">{mon(creator.balance)} <span className="text-2xl text-ink-muted">MON</span></div>
      <p className="mt-1 text-sm text-ink-muted">{mon(creator.totalRaised)} MON raised from {creator.supporterCount} supporter{creator.supporterCount === 1 ? "" : "s"} across {creator.supportCount} support{creator.supportCount === 1 ? "" : "s"}.</p>
      <button className="btn-primary mt-4 w-full" disabled={busy || creator.balance === 0n} onClick={() => send({ functionName: "withdraw", args: [account] })}>
        {busy && <Spinner />} Withdraw to my wallet
      </button>
      <TxStatus state={state} successText="Withdrawn." />
    </div>
  );
}

function EditTiers({ tiers }: { tiers: readonly Tier[] }) {
  const { state, send, busy } = useTx();
  const [drafts, setDrafts] = useState<TierDraft[]>(tiers.map((t) => ({ name: t.name, min: mon(t.minTotal, 18), perk: t.perk })));
  const { tiers: next, error } = toTiers(drafts);
  return (
    <div className="card space-y-3 p-5">
      <h2 className="font-display text-3xl">Supporter tiers</h2>
      <p className="-mt-1 text-sm text-ink-muted">Tiers are based on each fan&apos;s cumulative support. Changing them re-evaluates every fan instantly.</p>
      <TierEditor drafts={drafts} setDrafts={setDrafts} />
      {error && <ErrorNote>{error}</ErrorNote>}
      <button className="btn-ghost w-full" disabled={!!error || busy} onClick={() => send({ functionName: "setTiers", args: [next] })}>
        {busy && <Spinner />} Save tiers on-chain
      </button>
      <TxStatus state={state} successText="Tiers updated." />
    </div>
  );
}

export default function StudioPage() {
  const { address, isConnected } = useAccount();
  const { data, isLoading } = useCreatorByAddress(address);

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h1 className="font-display text-5xl">Creator studio</h1>
        <p className="mt-3 text-ink-muted">Connect a wallet to create your page, publish work, run supporter votes and withdraw support.</p>
        <div className="mt-6 flex justify-center"><ConnectButton /></div>
      </div>
    );
  }
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <Register />;

  const { creator, tiers } = data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar src={creator.avatarURI} name={creator.name} seed={creator.account} size={56} />
        <div>
          <h1 className="font-display text-4xl leading-none">Studio</h1>
          <p className="text-sm text-ink-muted">@{creator.handle}</p>
        </div>
        <Link href={`/c/${creator.handle}`} className="btn-ghost ml-auto">View my page</Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <PublishPost creator={creator} tiers={tiers} />
          <CreatePoll tiers={tiers} />
        </div>
        <div className="space-y-6">
          <Earnings creator={creator} account={address!} />
          <EditTiers key={tiers.map((t) => t.name + t.minTotal).join()} tiers={tiers} />
        </div>
      </div>
    </div>
  );
}
