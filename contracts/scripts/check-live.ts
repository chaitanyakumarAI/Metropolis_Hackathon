// Quick liveness check: reads FirstFan state and sends one small real support tx from the team test wallet.
import hre from "hardhat";
import { createWalletClient, http, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import dep from "../deployments/monadTestnet.json";

async function main() {
  const pc = await hre.viem.getPublicClient();
  const ff = await hre.viem.getContractAt("FirstFan", dep.address as Hex);
  console.log("creators", await ff.read.creatorCount(), "supports", await ff.read.supportCount(), "posts", await ff.read.postCount());
  const acct = privateKeyToAccount(process.env.TEST_WALLET_KEY as Hex);
  const w = createWalletClient({ account: acct, chain: pc.chain, transport: http(process.env.MONAD_RPC_URL) });
  const [noor] = await ff.read.getCreatorByHandle(["noor_loops"]);
  const t0 = Date.now();
  const hash = await w.writeContract({ address: dep.address as Hex, abi: ff.abi, functionName: "support", args: [noor.account, "liveness check"], value: parseEther("0.001") });
  const r = await pc.waitForTransactionReceipt({ hash, retryCount: 30, pollingInterval: 1000 });
  console.log("support tx", hash, "status", r.status, "block", r.blockNumber, `confirmed in ${Date.now() - t0}ms`);
  console.log("supports now", await ff.read.supportCount());
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
