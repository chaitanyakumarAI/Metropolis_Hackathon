// End-to-end check of /api/seal and /api/unlock against a running dev server.
// Usage: node scripts/e2e-unlock.mjs <baseUrl> <eligibleFanKey> <chainId>
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const [base = "http://localhost:3000", fanKey, chainIdArg = "31337"] = process.argv.slice(2);
const chainId = Number(chainIdArg);
const msg = (address, issuedAt) =>
  [
    "FirstFan: verify wallet to unlock supporter content",
    "",
    `Address: ${address.toLowerCase()}`,
    `Chain ID: ${chainId}`,
    `Issued At: ${issuedAt}`,
    "",
    "This free signature proves you own this wallet. It does not send a transaction or move funds.",
  ].join("\n");

async function unlock(account, postIds, { issuedAt = new Date().toISOString(), signer = account } = {}) {
  const signature = await signer.signMessage({ message: msg(account.address, issuedAt) });
  const res = await fetch(`${base}/api/unlock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: account.address, issuedAt, signature, postIds }),
  });
  return { status: res.status, body: await res.json() };
}

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : " — " + JSON.stringify(detail)}`);
  if (!cond) failures++;
};

const fan = privateKeyToAccount(fanKey);
const stranger = privateKeyToAccount(generatePrivateKey());
const ids = ["2", "3", "5", "8"];

const a = await unlock(fan, ids);
check("eligible fan unlocks tier post", a.body.results?.["2"]?.ok === true, a.body);
check("founding fan unlocks founding post", a.body.results?.["3"]?.ok === true, a.body);
check("fan unlocks other creator's tier-1 post", a.body.results?.["5"]?.ok === true, a.body);
check("fan blocked from creator they never supported", a.body.results?.["8"]?.ok === false, a.body);
if (a.body.results?.["2"]?.ok) console.log("   sample:", a.body.results["2"].content.body.slice(0, 60) + "…");

const b = await unlock(stranger, ids);
check("non-supporter gets nothing", Object.values(b.body.results ?? {}).every((r) => !r.ok), b.body);

const c = await unlock(fan, ids, { signer: stranger });
check("forged signature rejected", c.status === 401, c);

const d = await unlock(fan, ids, { issuedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString() });
check("expired session rejected", d.status === 401, d);

const e = await fetch(`${base}/api/seal`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ creator: stranger.address, body: "hi" }),
});
check("seal refuses non-creators", e.status === 403, await e.json());

const f = await fetch(`${base}/api/rpc`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: ["0x00"] }),
});
check("rpc proxy blocks non-read methods", f.status === 400, await f.json());

console.log(failures ? `${failures} check(s) failed` : "All unlock/seal checks passed");
process.exit(failures ? 1 : 0);
