"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "./ConnectButton";
import { Logo } from "./ui";

export function Header() {
  const path = usePathname();
  const { address } = useAccount();
  const links = [
    { href: "/", label: "Discover" },
    { href: "/creators", label: "Creators" },
    { href: address ? `/fan/${address}` : "/passport", label: "Passport" },
    { href: "/studio", label: "Studio" },
    { href: "/how-it-works", label: "How it works" },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.split("/").slice(0, 2).join("/")));

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="font-display text-[26px] leading-none tracking-tight">FirstFan</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${active(l.href) ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/5"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <ConnectButton />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-line/60 px-4 py-2 md:hidden">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${active(l.href) ? "bg-ink text-paper" : "text-ink-soft"}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
