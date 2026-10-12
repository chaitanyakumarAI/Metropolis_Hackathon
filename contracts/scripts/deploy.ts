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

  const { contract, deploymentTransaction } = await hre.viem.sendDeploymentTransaction("FirstFan");
  console.log(`Deploy tx ${deploymentTransaction.hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deploymentTransaction.hash });
  if (receipt.status !== "success") throw new Error("Deployment reverted");
  console.log(`FirstFan deployed at ${contract.address} in block ${receipt.blockNumber}`);

  const out = {
    network: hre.network.name,
    chainId,
    address: contract.address,
    deployTx: deploymentTransaction.hash,
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
