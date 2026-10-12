"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SESSION_TTL_MS, sessionMessage } from "./auth";
import { chain } from "./config";
import type { UnlockedContent } from "./types";

type Session = { address: string; issuedAt: string; signature: `0x${string}` };
type Outcome = { ok: true; content: UnlockedContent } | { ok: false; reason: string };

type Ctx = {
  results: Record<string, Outcome>;
  unlocking: boolean;
  error?: string;
  unlock: (postIds: bigint[]) => Promise<void>;
};

const UnlockContext = createContext<Ctx | null>(null);
const storageKey = (address: string) => `firstfan.session.${address.toLowerCase()}`;

function loadSession(address: string): Session | null {
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (Date.now() - Date.parse(s.issuedAt) > SESSION_TTL_MS - 60_000) return null;
    return s;
  } catch {
    return null;
  }
}

export function UnlockProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [results, setResults] = useState<Record<string, Outcome>>({});
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string>();

  // Unlocked content belongs to the wallet that proved eligibility.
  useEffect(() => {
    setResults({});
    setError(undefined);
  }, [address]);

  const unlock = useCallback(
    async (postIds: bigint[]) => {
      if (!address || postIds.length === 0) return;
      setUnlocking(true);
      setError(undefined);
      try {
        let session = loadSession(address);
        if (!session) {
          const issuedAt = new Date().toISOString();
          const signature = await signMessageAsync({ message: sessionMessage(address, issuedAt, chain.id) });
          session = { address, issuedAt, signature };
          try {
            localStorage.setItem(storageKey(address), JSON.stringify(session));
          } catch {}
        }
        const res = await fetch("/api/unlock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...session, postIds: postIds.map(String) }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            try {
              localStorage.removeItem(storageKey(address));
            } catch {}
          }
          throw new Error(data.error || "Unlock failed");
        }
        setResults((prev) => ({ ...prev, ...data.results }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unlock failed";
        setError(/reject|denied/i.test(msg) ? "Signature cancelled." : msg);
      } finally {
        setUnlocking(false);
      }
    },
    [address, signMessageAsync],
  );

  return <UnlockContext.Provider value={{ results, unlocking, error, unlock }}>{children}</UnlockContext.Provider>;
}

export function useUnlock() {
  const ctx = useContext(UnlockContext);
  if (!ctx) throw new Error("useUnlock must be used inside UnlockProvider");
  return ctx;
}
