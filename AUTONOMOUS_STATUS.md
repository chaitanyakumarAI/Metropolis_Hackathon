# FirstFan — Autonomous Build Status

_Last updated: 2026-10-13 00:45 IST. Deadline: 2026-10-14 09:29 IST (portal)._

## Objective
Monad Metropolis 2026, track **Social, Attention & Culture**. FirstFan: on-chain early-supporter platform —
fans support emerging creators on Monad, get a permanent rank (fan #1, #2…), creator-defined tiers unlock
exclusive posts (server-enforced against contract state) and supporter-only polls (contract-enforced).
Sponsor bounties: Envio (HyperSync) and Alchemy (RPC) — both implemented with fallbacks, both need free keys.

## Repo
- Local git repo at `E:\Hackathons\Metropolis`, branch `main`. **No GitHub remote yet** (needs user).
- `contracts/` Hardhat 2 + viem. `contracts/contracts/FirstFan.sol` (single contract).
- `web/` Next.js 15 + React 19 + wagmi 2 + Tailwind 3.
- Secrets live only in `contracts/.env` and `web/.env.local` (gitignored). Never commit them.

## Verified (with evidence)
- Contract tests: `cd contracts && npx hardhat test` → **18 passing** (validation, ranks, tiers, founding,
  access, polls, withdraw, reentrancy attacker, rejecting receiver).
- Local deploy + seed on Hardhat node (`scripts/deploy.ts`, `scripts/seed.ts`) → all txs succeed; gas measured
  (deploy ≈3.57M gas ≈0.37 MON @102 gwei; full seed ≈1.3 MON).
- Server security checks: `node web/scripts/e2e-unlock.mjs http://localhost:3000 <demoFanKey> 31337` → **9/9 PASS**
  (eligible unlock, cross-creator denial, stranger denied, forged + expired signatures rejected, seal refuses
  non-creators, RPC proxy blocks write methods).
- Browser walkthrough on local chain with a test EIP-1193 shim: connect → support (pending→confirmed, "fan #3",
  founding) → unlock gated posts → vote → register creator → publish gated post (seal API) → withdraw. All worked.
- `cd web && npx tsc --noEmit` clean; `npx next build` passes (12 routes, lint+types).
- Monad testnet facts verified from docs.monad.xyz + live RPC: chain 10143, `https://testnet-rpc.monad.xyz`,
  explorer `https://testnet.monadscan.com`, faucet `https://faucet.monad.xyz`, Multicall3 present.
- Alchemy Monad testnet endpoint `https://monad-testnet.g.alchemy.com/v2/<key>` answers chain 0x279f (tested with `demo`).
- Envio HyperSync Monad testnet `https://10143.hypersync.xyz` live (height endpoint); queries require API token.

## Implemented, NOT yet verified
- HyperSync query path in `web/src/lib/pulse.ts` (needs `ENVIO_API_TOKEN` to test). Fallback path verified.
- Anything on Monad testnet (blocked: deployer unfunded).

## Blockers (need user)
1. Fund deployer `0x0260FB0941B15d53fE955B548f47EE481c3ef458` with ~2 testnet MON (faucet.monad.xyz).
2. Hosting: Vercel login (`npx vercel login`) or a Vercel token, to deploy `web/`.
3. GitHub: create public repo, add `metropolis@hackathon.monad.xyz` access, push.
4. Free Alchemy API key (Monad testnet app) → `ALCHEMY_API_KEY`.
5. Free Envio API token (app.envio.dev/api-tokens) → `ENVIO_API_TOKEN`.
6. Record videos, upload to portal, submit.

## Resume commands
```
cd contracts && npx hardhat test
cd contracts && npx hardhat run scripts/deploy.ts --network monadTestnet   # after funding
cd contracts && npx hardhat run scripts/seed.ts --network monadTestnet
cd contracts && npx ts-node scripts/export-abi.ts                           # after ABI changes
cd web && npm run dev     # local: run `npx hardhat node` + deploy/seed to localhost first
```

## Next actions (priority)
1. DONE: README, assets/ graphics, docs/ demo + pitch scripts + submission checklist. Mobile check OK.
2. On funding: deploy → seed → set web env → verify on Monadscan → e2e script against testnet.
3. On Vercel access: deploy, set env vars, verify `/api/health`.
