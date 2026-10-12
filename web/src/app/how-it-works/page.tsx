import Link from "next/link";
import { chain, CONTRACT_ADDRESS, explorerAddress, FAUCET_URL } from "@/lib/config";

export const metadata = { title: "How FirstFan works" };

const steps = [
  {
    t: "Creators set the rules",
    d: "A creator registers a handle, a number of founding-fan spots, and up to five supporter tiers (cumulative MON thresholds with a perk). All of it lives in the FirstFan contract.",
  },
  {
    t: "Fans support early",
    d: "Each support is a real transaction. The contract assigns a permanent rank on a fan's first support (fan #1, #2 …), adds to their running total and emits a Supported event with the note.",
  },
  {
    t: "Benefits unlock from on-chain state",
    d: "Exclusive posts are encrypted and stored on-chain. Our server decrypts one only after the wallet signs in and the contract's canAccess() confirms its tier or founding status. Polls check eligibility inside the contract itself.",
  },
  {
    t: "Recognition is portable",
    d: "getFanPassport(address) returns every creator a wallet backed, with rank, tier and founding status — a verifiable record of being early that any app can read.",
  },
];

export default function HowItWorks() {
  const explorer = CONTRACT_ADDRESS ? explorerAddress(CONTRACT_ADDRESS) : "";
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header>
        <h1 className="font-display text-6xl leading-none">How FirstFan works</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Platforms reward likes and follower counts. FirstFan rewards being <em>early</em>: the people who back a creator before
          anyone else get a permanent, verifiable place in that creator&apos;s story — and the benefits the creator chooses to give them.
        </p>
      </header>

      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.t} className="card flex gap-4 p-5">
            <span className="font-display text-4xl leading-none text-accent">{i + 1}</span>
            <div>
              <h2 className="text-lg font-semibold">{s.t}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <section id="judges" className="card scroll-mt-24 space-y-4 p-6">
        <h2 className="font-display text-4xl">Try it in 3 minutes</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>Browse without a wallet: the feed, creator pages, supporter walls and activity all read live from the contract.</li>
          <li>
            Install an EVM wallet (MetaMask, Rabby…) and click <b>Connect wallet</b>. FirstFan will ask to add/switch to{" "}
            <b>{chain.name}</b> (chain ID {chain.id}).
          </li>
          <li>
            Get free testnet MON from the{" "}
            <a className="font-semibold text-accent" href={FAUCET_URL} target="_blank" rel="noreferrer">Monad faucet</a>. Testnet MON has no monetary value.
          </li>
          <li>Open a creator (e.g. a demo creator), choose an amount and press <b>Support</b>. You&apos;ll see pending → confirmed with an explorer link, and your rank.</li>
          <li>Press <b>Unlock</b> on a gated post you now qualify for. Sign the free message; the server checks the contract before decrypting.</li>
          <li>Vote in the creator&apos;s poll, then open your <Link className="font-semibold text-accent" href="/passport">supporter passport</Link>.</li>
          <li>Want the creator side? Open <Link className="font-semibold text-accent" href="/studio">Studio</Link> with a second wallet to register, publish a gated post and withdraw.</li>
        </ol>
        <p className="text-xs text-ink-muted">
          Accounts marked <b>Demo account</b> were created and funded by the FirstFan team to make the product explorable. Their transactions are real, but they are not real community members.
        </p>
      </section>

      <section className="card space-y-3 p-6 text-sm">
        <h2 className="font-display text-3xl">Verify it yourself</h2>
        <p className="text-ink-soft">
          Network: <b>{chain.name}</b> · Chain ID <b>{chain.id}</b>
        </p>
        <p className="break-all text-ink-soft">
          Contract:{" "}
          {CONTRACT_ADDRESS ? (
            explorer ? <a className="font-mono text-accent" href={explorer} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS}</a> : <span className="font-mono">{CONTRACT_ADDRESS}</span>
          ) : (
            "not configured"
          )}
        </p>
        {CONTRACT_ADDRESS && (
          <p className="text-ink-soft">
            Source code:{" "}
            <a className="text-accent" href={`https://testnet.monadvision.com/contracts/full_match/${chain.id}/${CONTRACT_ADDRESS}/`} target="_blank" rel="noreferrer">
              verified on Sourcify (full match)
            </a>
          </p>
        )}
        <p className="text-ink-soft">
          Useful reads: <code>getSupporter(creator, fan)</code>, <code>canAccess(creator, fan, access)</code>, <code>getFanPassport(fan)</code>,{" "}
          <code>getCreatorSupports(creator, 0, 25)</code>. Events: <code>Supported</code>, <code>PostPublished</code>, <code>Voted</code>, <code>Withdrawn</code>.
        </p>
        <p className="text-ink-soft">
          Server status (RPC provider, chain, contract code): <a className="text-accent" href="/api/health">/api/health</a>
        </p>
      </section>
    </div>
  );
}
