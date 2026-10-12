import { formatEther } from "viem";
import { ACCESS_FOUNDING, ACCESS_PUBLIC } from "./config";
import type { Tier } from "./types";

export function mon(wei: bigint, maxDecimals = 4) {
  const s = formatEther(wei);
  const [i, d = ""] = s.split(".");
  const trimmed = d.slice(0, maxDecimals).replace(/0+$/, "");
  return trimmed ? `${i}.${trimmed}` : i;
}

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function timeAgo(seconds: bigint | number) {
  const diff = Math.max(0, Date.now() / 1000 - Number(seconds));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(Number(seconds) * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const fullDate = (seconds: bigint | number) =>
  new Date(Number(seconds) * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function timeLeft(endsAt: bigint) {
  const diff = Number(endsAt) - Date.now() / 1000;
  if (diff <= 0) return "Closed";
  if (diff < 3600) return `${Math.ceil(diff / 60)}m left`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h left`;
  return `${Math.floor(diff / 86400)}d left`;
}

export function accessLabel(access: number, tiers: readonly Tier[]) {
  if (access === ACCESS_PUBLIC) return "Public";
  if (access === ACCESS_FOUNDING) return "Founding fans";
  return tiers[access - 1]?.name ?? `Tier ${access}`;
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
