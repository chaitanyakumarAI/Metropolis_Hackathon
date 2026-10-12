"use client";

import type { TxState } from "@/lib/useTx";
import { CheckIcon, Spinner, TxLink } from "./ui";

export function TxStatus({ state, successText = "Confirmed on Monad." }: { state: TxState; successText?: string }) {
  if (state.status === "idle") return null;
  const base = "mt-3 flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm";
  switch (state.status) {
    case "switching":
      return (
        <div className={`${base} bg-accent-soft text-accent-dark`}>
          <Spinner /> Switch to Monad Testnet in your wallet…
        </div>
      );
    case "signing":
      return (
        <div className={`${base} bg-accent-soft text-accent-dark`}>
          <Spinner /> Confirm the transaction in your wallet…
        </div>
      );
    case "pending":
      return (
        <div className={`${base} bg-accent-soft text-accent-dark`}>
          <Spinner /> Waiting for confirmation on Monad… <TxLink hash={state.hash} />
        </div>
      );
    case "success":
      return (
        <div className={`${base} bg-mint-soft text-mint`}>
          <CheckIcon /> {successText} <TxLink hash={state.hash} />
        </div>
      );
    case "error":
      return (
        <div className={`${base} bg-ember-soft text-ember`}>
          {state.message} {state.hash && <TxLink hash={state.hash} />}
        </div>
      );
  }
}
