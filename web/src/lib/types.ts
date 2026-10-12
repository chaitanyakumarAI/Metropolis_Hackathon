import type { Address, Hex } from "viem";

export type Tier = { name: string; minTotal: bigint; perk: string };

export type Creator = {
  account: Address;
  handle: string;
  name: string;
  bio: string;
  avatarURI: string;
  category: string;
  foundingSlots: number;
  supporterCount: number;
  supportCount: number;
  createdAt: bigint;
  totalRaised: bigint;
  balance: bigint;
};

export type SupporterRecord = {
  rank: number;
  supportCount: number;
  firstSupportAt: bigint;
  lastSupportAt: bigint;
  total: bigint;
};

export type SupportEntry = {
  id: bigint;
  creator: Address;
  supporter: Address;
  amount: bigint;
  timestamp: bigint;
  blockNumber: bigint;
  rank: number;
  note: string;
};

export type Post = {
  id: bigint;
  creator: Address;
  createdAt: bigint;
  access: number;
  title: string;
  body: string;
  imageURI: string;
  sealedContent: Hex;
};

export type Poll = {
  id: bigint;
  creator: Address;
  createdAt: bigint;
  endsAt: bigint;
  access: number;
  question: string;
  options: readonly string[];
  votes: readonly number[];
};

export type UnlockedContent = { body: string; imageURI?: string; link?: string };
