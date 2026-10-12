# Technical demo — script (target 2:45, hard limit 3:00)

Record the **live deployed app** on Monad Testnet (not localhost, not slides). Screen + voice.
Before recording: wallet A (fan) funded with ~0.1 testnet MON and *not yet a supporter* of Maya;
wallet B (creator) funded with ~0.3 MON. Browser zoom 100%, 1440px wide. Have Monadscan open in a tab.

| Time | Screen | Say |
|---|---|---|
| 0:00–0:15 | Discover page hero + live counts | "FirstFan is an on-chain early-supporter platform on Monad. Fans back emerging creators early, and their rank — fan #1, #2, #3 — is recorded forever and unlocks benefits the creator defines." |
| 0:15–0:35 | Scroll feed: public posts, blurred gated posts, "Demo account" badge, Live support sidebar | "Everything here is read live from the FirstFan contract. Gated posts are encrypted on-chain. Demo creators are labelled — their transactions are real, but they're seeded by us." |
| 0:35–0:55 | Open Maya's page: stats, founding spots left, tiers, poll | "Maya sets founding spots and tiers on-chain. Seven founding spots are left — the next supporter becomes fan #N, permanently." |
| 0:55–1:25 | Connect wallet A → network check → Support panel shows "You'd become fan #N, Founding fan, unlocks Darkroom" → Support → wallet confirm → pending → **"You're fan #N"** → click explorer link | "I connect, FirstFan makes sure I'm on Monad Testnet, and I support. Nothing says success until the transaction is confirmed — here's the receipt on Monadscan with my rank in the Supported event." |
| 1:25–1:50 | Click **Unlock** on gated posts → sign message → exclusive content appears | "Unlocking is a free signature. The server checks my signature, then asks the contract `canAccess` before decrypting. Not a frontend flag — a stranger gets nothing." |
| 1:50–2:05 | Vote in poll → confirmed | "Supporters vote on creator decisions. One vote per eligible supporter, enforced in the contract." |
| 2:05–2:20 | Passport page | "My supporter passport: every creator I backed, my rank, tier and founding badges — portable, readable by any app." |
| 2:20–2:35 | Pulse page (Envio badge) + /api/health showing Alchemy | "Pulse indexes every support with Envio HyperSync — earliest believers, creators gaining fans this week, tx-linked history. Reads run through Alchemy's Monad RPC." |
| 2:35–2:50 | Wallet B: Studio → publish a Supporter-only post → confirmed; show withdraw card | "Creators publish gated work and withdraw support with a reentrancy-safe pull pattern. That's FirstFan: early support, verifiably yours." |

Tips: if a transaction is slow, keep talking over the pending state — it demonstrates honest status handling.
