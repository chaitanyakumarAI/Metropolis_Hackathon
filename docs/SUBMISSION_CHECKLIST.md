# Submission checklist — Monad Metropolis 2026 (Social, Attention & Culture)

Deadline shown on portal: **14 Oct 2026, 09:29 IST**. Legend: ✅ done & verified · 🟡 needs your action · ⬜ not done.

## Portal fields
| Item | Status | Value / notes |
|---|---|---|
| Project name | 🟡 paste | FirstFan |
| Description | 🟡 paste | Text below |
| Logo/graphic (≤ 3 MB) | ✅ ready | `assets/logo.png` (1024², 36 KB) or `assets/firstfan-cover.png` (1600×900, 0.3 MB) |
| Public GitHub repo | ✅ | https://github.com/chaitanyakumarAI/Metropolis_Hackathon (public, so `metropolis@hackathon.monad.xyz` can access it) |
| Live product link | ✅ | https://firstfan-pink.vercel.app |
| Contract address | ✅ | `0xbd94cA0133E3dE9f57eD5111A6f48b901B6a5Aa8` (Monad Testnet, source verified on Sourcify) |
| Technical demo video ≤ 3 min | ⬜ | Script: `docs/DEMO_SCRIPT.md` — must show the live product |
| Pitch video ≤ 2 min | ⬜ | Script: `docs/PITCH_SCRIPT.md` |
| Bounty: Envio — Best Use of Envio | ✅ integration live / 🟡 select in portal | Pulse page shows "Indexed by Envio HyperSync"; show it in the demo |
| Bounty: Alchemy — Best Projects using Alchemy | ✅ integration live / 🟡 select in portal | https://firstfan-pink.vercel.app/api/health shows `"rpcProvider":"alchemy"`; show it in the demo |
| Optional 30s ad | ⬜ | Lowest priority |

## Description (portal)
FirstFan is an on-chain creator community that turns early support into verifiable participation and meaningful
creator-defined benefits. Fans discover and support emerging creators, while smart contracts on Monad record
contributions and enable transparent rewards, exclusive access, and community participation. Our goal is to help
creators build communities that share in the value they create.

## Judge access instructions (paste into portal)
Live app: https://firstfan-pink.vercel.app — no login needed to browse. To transact: install MetaMask or Rabby,
connect, accept the switch to Monad Testnet (chain 10143), and get free testnet MON at https://faucet.monad.xyz.
Support any creator (min 0.001 MON), then press Unlock on a gated post and vote in the creator's poll. Your record
is at /passport. Creator tools are under Studio (use a second wallet). Accounts labelled "Demo account" were seeded
by our team. Testnet MON has no monetary value. Contract: 0xbd94cA0133E3dE9f57eD5111A6f48b901B6a5Aa8 (source
verified on Sourcify).

## Bounty notes (paste if the portal asks how you used the sponsor)
- **Envio:** Our Pulse page (earliest-believer leaderboard, creators gaining fans this week, daily activity and the
  full tx-linked support history) is computed server-side from a full Envio HyperSync scan of FirstFan's `Supported`
  events on Monad Testnet (`10143.hypersync.xyz`), joined with transaction hashes and block timestamps.
  Code: `web/src/lib/pulse.ts`.
- **Alchemy:** All server-side chain reads (unlock eligibility checks, sealing checks, health, analytics fallback)
  and all browser reads (through our `/api/rpc` proxy, which keeps the key secret) use Alchemy's Monad Testnet RPC,
  with automatic fallback to the public RPC. Code: `web/src/lib/server.ts`, `web/src/app/api/rpc/route.ts`.
