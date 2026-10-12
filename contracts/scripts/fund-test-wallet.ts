// Funds the team's UI test wallet (TEST_WALLET_KEY) from the deployer. Testnet only.
import hre from "hardhat";
import { formatEther, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const key = process.env.TEST_WALLET_KEY as Hex | undefined;
  if (!key) throw new Error("TEST_WALLET_KEY missing");
  const test = privateKeyToAccount(key);
  const [deployer] = await hre.viem.getWalletClients();
  const pc = await hre.viem.getPublicClient();
  const want = parseEther(process.env.TEST_WALLET_FUND || "0.1");
  const bal = await pc.getBalance({ address: test.address });
  if (bal < want) {
    const hash = await deployer.sendTransaction({ to: test.address, value: want - bal });
    await pc.waitForTransactionReceipt({ hash, retryCount: 30, pollingInterval: 1000 });
    console.log(`Funded ${hash}`);
  }
  console.log(`Test wallet ${test.address} balance ${formatEther(await pc.getBalance({ address: test.address }))} MON`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
