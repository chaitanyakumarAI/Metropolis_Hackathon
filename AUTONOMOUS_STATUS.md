# FirstFan — Autonomous Build Status

_Last updated: 2026-10-13 ~01:30 IST. Deadline: 2026-10-14 09:29 IST (portal)._

## Objective
Monad Metropolis 2026, track **Social, Attention & Culture**. FirstFan: on-chain early-supporter platform —
fans support emerging creators on Monad, get a permanent rank (fan #1, #2…), creator-defined tiers unlock
exclusive posts (server-enforced against contract state) and supporter-only polls (contract-enforced).
Bounties: Envio (HyperSync powers Pulse — **verified live**), Alchemy (RPC — **verified live**: /api/health rpcProvider "alchemy").

## Live
- App: https://firstfan-pink.vercel.app (Vercel project `firstfan`, account `chaitanyakumarai`, deployed via CLI from `web/`)
- Health: https://firstfan-pink.vercel.app/api/health
- Contract (Monad Testnet 10143): `0xbd94cA0133E3dE9f57eD5111A6f48b901B6a5Aa8`, deploy tx `0x3ba3c69e…cd1a6`, block 70479257
- Source verified (Sourcify full match): https://testnet.monadvision.com/contracts/full_match/10143/0xbd94cA0133E3dE9f57eD5111A6f48b901B6a5Aa8/
- Repo: https://github.com/chaitanyakumarAI/Metropolis_Hackathon (public, `main`)

## Verified (with evidence)
- `cd contracts && npx hardhat test` → 18 passing.
- On-chain bytecode == compiled artifact; Sourcify full match.
- Seed on testnet: 3 demo creators, 9 posts, 2 polls, 4 supports, 1 vote — all txs status 1.
- `node web/scripts/e2e-unlock.mjs https://firstfan-pink.vercel.app <fanKey> 10143` → 9/9 PASS on production.
- Real UI flow on testnet (localhost dev → Monad Testnet, team test wallet `0x6301…96DF`, in-page signer shim):
  support → "You're fan #3" (tx `0xbbf06dac…20e8aa`, receipt status 1) → unlock 2 posts → vote → all confirmed.
- `/api/pulse` on production: `source: envio-hypersync`, 4+ supports with correct tx hashes/timestamps.
- `/api/health` on production: chain 10143, contractDeployed true, sealConfigured true, envioHyperSync true,
  alchemy "MONAD_TESTNET is not enabled for this app" → serving via public RPC (fallback works).
- `npx tsc --noEmit` clean; `npx next build` passes.

## Vercel env (production) — set, values never printed
NEXT_PUBLIC_CONTRACT_ADDRESS, NEXT_PUBLIC_DEPLOY_BLOCK, NEXT_PUBLIC_DEMO_ADDRESSES (6 addrs incl. test wallet),
NEXT_PUBLIC_REPO_URL, SEAL_SECRET, ALCHEMY_API_KEY, ENVIO_API_TOKEN, MONAD_RPC_URL.
Gotcha: write env files with LF endings (CRLF leaked `\r` into Vercel values once; fixed).

## Remaining (user actions)
1. DONE: Alchemy key from app "Chaitanya Kumar's first app" (Monad Testnet enabled) set on Vercel; verified.

2. Record technical demo (≤3 min) and pitch (≤2 min) — scripts in `docs/`. Upload to YouTube/Loom.
3. Fill the portal (text in `docs/SUBMISSION_CHECKLIST.md`), select Envio + Alchemy bounties, upload `assets/logo.png`, submit.

## Resume commands
```
cd contracts && npx hardhat test
cd contracts && npx hardhat run scripts/seed.ts --network monadTestnet        # idempotent
cd contracts && npx hardhat run scripts/fund-test-wallet.ts --network monadTestnet
cd web && npm run dev                                                          # .env.local points at testnet
cd web && npx vercel deploy --prod --yes
```
Deployer balance after seeding ≈3.25 MON (enough for redeploys).
