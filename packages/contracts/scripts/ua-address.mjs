/**
 * Resolves the Universal Account deposit address for our owner EOA, and reads
 * its current unified balance.
 *
 * In EIP-7702 mode the UA *is* the owner EOA — the account is upgraded in
 * place, so the address does not change. This script proves that against the
 * live Particle API rather than assuming it, and reports what the UA can
 * currently see across chains.
 *
 * Run: node packages/contracts/scripts/ua-address.mjs
 */
import { UniversalAccount } from "@particle-network/universal-account-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const owner = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);

const ua = new UniversalAccount({
  projectId: env.NEXT_PUBLIC_PARTICLE_PROJECT_ID,
  projectClientKey: env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY,
  projectAppUuid: env.NEXT_PUBLIC_PARTICLE_APP_ID,
  smartAccountOptions: {
    name: "UNIVERSAL",
    version: "2.0.1",
    ownerAddress: owner.address,
    useEIP7702: true,
  },
});

console.log("owner EOA:      ", owner.address);

const opts = await ua.getSmartAccountOptions();
console.log("smart account:  ", opts.smartAccountAddress ?? "(none returned)");
console.log("solana account: ", opts.solanaSmartAccountAddress ?? "(none)");
console.log("EIP-7702 mode:  ", opts.useEIP7702 ?? false);

const sameAddress =
  (opts.smartAccountAddress ?? "").toLowerCase() === owner.address.toLowerCase();
console.log(
  sameAddress
    ? "\n✓ 7702 confirmed: UA address == owner EOA (upgraded in place, no migration)"
    : "\n⚠ UA address differs from owner EOA — deposits must go to the smart account address"
);

const assets = await ua.getPrimaryAssets();
console.log(`\nunified balance: $${assets.totalAmountInUSD.toFixed(2)}`);
for (const asset of assets.assets) {
  if (asset.amountInUSD <= 0) continue;
  console.log(`  ${asset.tokenType.toUpperCase().padEnd(6)} $${asset.amountInUSD.toFixed(2)}`);
  for (const row of asset.chainAggregation) {
    if (row.amountInUSD > 0) {
      console.log(`      chain ${row.token.chainId}: $${row.amountInUSD.toFixed(2)}`);
    }
  }
}

console.log(
  `\nFUND THIS ADDRESS (USDC on Arbitrum One): ${opts.smartAccountAddress ?? owner.address}`
);
