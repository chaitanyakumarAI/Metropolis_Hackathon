import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`Network ${hre.network.name} (chain ${chainId})`);
  console.log(`Deployer ${deployer.account.address} balance ${formatEther(balance)} MON`);

  // Send the raw deployment and poll for the receipt; public RPCs can briefly lag
  // behind the node that accepted the transaction.
  const artifact = await hre.artifacts.readArtifact("FirstFan");
  const hash = await deployer.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode as `0x${string}` });
  console.log(`Deploy tx ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, retryCount: 30, pollingInterval: 1_000 });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Deployment reverted");
  const address = receipt.contractAddress;
  console.log(`FirstFan deployed at ${address} in block ${receipt.blockNumber}`);

  const out = {
    network: hre.network.name,
    chainId,
    address,
    deployTx: hash,
    blockNumber: Number(receipt.blockNumber),
    deployer: deployer.account.address,
    deployedAt: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${hre.network.name}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`Saved deployments/${hre.network.name}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
