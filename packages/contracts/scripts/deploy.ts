import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers, network, run } from "hardhat";

// Deploys LeashManager + PledgeVault, records addresses + deploy block in
// deployments/<network>.json (the indexer's backfill start), then verifies on
// Arbiscan when an API key is present. Idempotent per network: re-running
// overwrites the record, it never half-writes.

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer account — set DEPLOYER_PRIVATE_KEY in .env.local");

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`network:  ${network.name} (chainId ${network.config.chainId})`);
  console.log(`deployer: ${deployer.address}`);
  console.log(`balance:  ${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) throw new Error("Deployer has no gas funds on this network");

  const leashManager = await (await ethers.getContractFactory("LeashManager")).deploy();
  await leashManager.waitForDeployment();
  const leashReceipt = await leashManager.deploymentTransaction()!.wait();
  console.log(`LeashManager: ${await leashManager.getAddress()} (block ${leashReceipt!.blockNumber})`);

  const pledgeVault = await (await ethers.getContractFactory("PledgeVault")).deploy();
  await pledgeVault.waitForDeployment();
  const pledgeReceipt = await pledgeVault.deploymentTransaction()!.wait();
  console.log(`PledgeVault:  ${await pledgeVault.getAddress()} (block ${pledgeReceipt!.blockNumber})`);

  const record = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    contracts: {
      LeashManager: {
        address: await leashManager.getAddress(),
        blockNumber: leashReceipt!.blockNumber,
        txHash: leashReceipt!.hash,
      },
      PledgeVault: {
        address: await pledgeVault.getAddress(),
        blockNumber: pledgeReceipt!.blockNumber,
        txHash: pledgeReceipt!.hash,
      },
    },
    deployedAt: new Date().toISOString(),
  };

  const dir = resolve(__dirname, "../deployments");
  if (!existsSync(dir)) mkdirSync(dir);
  const file = resolve(dir, `${network.name}.json`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`recorded: ${file}`);

  if (process.env.ARBISCAN_API_KEY) {
    // Arbiscan needs the deploy txs indexed before verify succeeds.
    console.log("waiting for the explorer to index before verification…");
    await new Promise((r) => setTimeout(r, 30_000));
    for (const name of ["LeashManager", "PledgeVault"] as const) {
      try {
        await run("verify:verify", {
          address: record.contracts[name].address,
          constructorArguments: [],
        });
        console.log(`${name}: verified`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Already Verified")) {
          console.log(`${name}: already verified`);
        } else {
          // Verification is retryable after deploy; don't lose the record.
          console.error(`${name}: verification failed — rerun 'npx hardhat verify' later\n${message}`);
        }
      }
    }
  } else {
    console.log("ARBISCAN_API_KEY not set — skipping verification (rerun 'npx hardhat verify' once set)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
