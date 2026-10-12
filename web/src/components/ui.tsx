"use client";

import Link from "next/link";
import { explorerAddress, explorerTx, isDemo } from "@/lib/config";
import { shortAddr } from "@/lib/format";

const GRADIENTS = [
  "from-[#5B3DF5] to-[#C084FC]",
  "from-[#F97316] to-[#FACC15]",
  "from-[#0F8A5F] to-[#5EEAD4]",
  "from-[#BE185D] to-[#FB7185]",
  "from-[#1D4ED8] to-[#38BDF8]",
  "from-[#16130F] to-[#77706A]",
];

function hashIndex(seed: string, n: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % n;
}

export function Avatar({
  src,
  name,
  seed,
  size = 40,
  className = "",
}: {
  src?: string;
  name?: string;
  seed: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name ?? ""} style={style} className={`shrink-0 rounded-full object-cover ring-2 ring-white ${className}`} />;
  }
  const initials = (name || seed.slice(2, 4)).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2 ring-white ${GRADIENTS[hashIndex(seed, GRADIENTS.length)]} ${className}`}
    >
      <span className="font-semibold text-white" style={{ fontSize: size * 0.38 }}>
        {initials}
      </span>
    </div>
  );
}

export function DemoBadge({ address }: { address?: string }) {
  if (!isDemo(address)) return null;
  return (
    <span title="Seeded by the FirstFan team for the demo. Its on-chain activity is real, but it is not a real community member." className="chip bg-ink/5 text-ink-muted">
      Demo account
    </span>
  );
}

export function FoundingBadge({ rank }: { rank?: number }) {
  return (
    <span className="chip bg-gold-soft text-gold-ink">
      <StarIcon className="h-3 w-3" /> Founding{rank ? ` #${rank}` : ""}
    </span>
  );
}

export function TxLink({ hash, label = "View transaction" }: { hash?: string; label?: string }) {
  if (!hash) return null;
  const url = explorerTx(hash);
  if (!url) return <span className="font-mono text-xs text-ink-muted">{shortAddr(hash)}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
      {label} <ExternalIcon className="h-3 w-3" />
    </a>
  );
}

export function AddressLink({ address, internal = true }: { address: string; internal?: boolean }) {
  if (internal) {
    return (
      <Link href={`/fan/${address}`} className="font-mono text-xs text-ink-soft hover:text-accent">
        {shortAddr(address)}
      </Link>
    );
  }
  const url = explorerAddress(address);
  return (
    <a href={url} target="_blank" rel="noreferrer" className="font-mono text-xs text-ink-soft hover:text-accent">
      {shortAddr(address)}
    </a>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-2xl">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-muted">{children}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-ember/30 bg-ember-soft px-4 py-3 text-sm text-ember">{children}</div>;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8L12 2.5z" />
    </svg>
  );
}

export function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

export function ExternalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="#16130F" />
      <path d="M27 19h10v28h-8V28.5l-5 2.2v-7.4L27 19z" fill="#F7F4EE" />
      <path d="M46.5 12.5l1.9 4 4.4.5-3.3 3 .9 4.4-3.9-2.2-3.9 2.2.9-4.4-3.3-3 4.4-.5 1.9-4z" fill="#F2B632" />
    </svg>
  );
}
