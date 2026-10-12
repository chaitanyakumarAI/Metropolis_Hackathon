"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BaseError, ContractFunctionRevertedError, type TransactionReceipt } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { firstFanAbi } from "./abi";
import { chain, CONTRACT_ADDRESS } from "./config";

export type TxState =
  | { status: "idle" }
  | { status: "switching" }
  | { status: "signing" }
  | { status: "pending"; hash: `0x${string}` }
  | { status: "success"; hash: `0x${string}`; receipt: TransactionReceipt }
  | { status: "error"; message: string; hash?: `0x${string}` };

const REVERT_MESSAGES: Record<string, string> = {
  AlreadyRegistered: "This wallet is already registered as a creator.",
  NotRegistered: "That account is not a registered creator.",
  HandleTaken: "That handle is already taken. Try another.",
  InvalidHandle: "Handles are 3-20 characters: lowercase letters, numbers and underscores.",
  InvalidTiers: "Tiers must have increasing minimums above zero (max 5).",
  InvalidAccess: "That access level doesn't match one of your tiers.",
  SupportTooSmall: "The minimum support is 0.001 MON.",
  CannotSupportSelf: "Creators can't support themselves.",
  NothingToWithdraw: "There's nothing to withdraw yet.",
  TransferFailed: "The withdrawal transfer failed.",
  InvalidPoll: "Invalid poll or option.",
  PollClosed: "This poll has closed.",
  AlreadyVoted: "You've already voted in this poll.",
  NotEligible: "Your support tier doesn't meet this poll's requirement yet.",
  InvalidLength: "One of the fields is empty or too long.",
};

export function friendlyError(err: unknown): string {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && REVERT_MESSAGES[name]) return REVERT_MESSAGES[name];
      if (name) return `Transaction would fail: ${name}`;
    }
    const text = `${err.shortMessage} ${err.details ?? ""}`.toLowerCase();
    if (text.includes("user rejected") || text.includes("user denied") || err.name === "UserRejectedRequestError") {
      return "You cancelled the request in your wallet.";
    }
    if (text.includes("insufficient funds") || text.includes("exceeds the balance")) {
      return "Not enough testnet MON for this amount plus gas. Get free testnet MON from the faucet.";
    }
    return err.shortMessage || err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

type WriteArgs = {
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

/** Sends a FirstFan transaction and tracks it until it is confirmed on-chain. */
export function useTx() {
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient();
  const queryClient = useQueryClient();
  const [state, setState] = useState<TxState>({ status: "idle" });

  async function send({ functionName, args, value }: WriteArgs): Promise<TransactionReceipt | null> {
    let hash: `0x${string}` | undefined;
    try {
      if (!isConnected) throw new Error("Connect a wallet first.");
      if (!CONTRACT_ADDRESS) throw new Error("FirstFan contract is not configured.");
      if (chainId !== chain.id) {
        setState({ status: "switching" });
        await switchChainAsync({ chainId: chain.id });
      }
      setState({ status: "signing" });
      hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: firstFanAbi,
        functionName,
        args,
        value,
        chainId: chain.id,
      } as never);
      setState({ status: "pending", hash });
      const receipt = await client!.waitForTransactionReceipt({ hash, timeout: 90_000 });
      if (receipt.status !== "success") throw new Error("The transaction reverted on-chain.");
      setState({ status: "success", hash, receipt });
      await queryClient.invalidateQueries({ queryKey: ["ff"] });
      return receipt;
    } catch (err) {
      setState({ status: "error", message: friendlyError(err), hash });
      return null;
    }
  }

  const busy = state.status === "switching" || state.status === "signing" || state.status === "pending";
  return { state, send, busy, reset: () => setState({ status: "idle" }) };
}
