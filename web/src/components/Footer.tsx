import Link from "next/link";
import { chain, CONTRACT_ADDRESS, explorerAddress } from "@/lib/config";
import { Logo } from "./ui";

export function Footer() {
  return (
    <footer className="border-t border-line bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span>FirstFan — early support, verifiably yours.</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/how-it-works" className="hover:text-ink">How it works</Link>
          {CONTRACT_ADDRESS && explorerAddress(CONTRACT_ADDRESS) && (
            <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="hover:text-ink">
              Contract on {chain.name}
            </a>
          )}
          {process.env.NEXT_PUBLIC_REPO_URL && (
            <a href={process.env.NEXT_PUBLIC_REPO_URL} target="_blank" rel="noreferrer" className="hover:text-ink">
              Source
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
