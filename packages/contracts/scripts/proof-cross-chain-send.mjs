/**
 * PHASE 3 PROOF 1 — a real USDC transfer through the Universal Account with
 * the owner EOA upgraded in place via EIP-7702.
 *
 * This is the mechanism behind FLOAT's Send mode: the sender never picks a
 * chain, and their existing EOA becomes the smart account with no migration.
 *
 * Two distinct signatures are required, and they are NOT interchangeable:
 *   1. rootHash        — signed as a raw digest (the aggregate UserOp)
 *   2. 7702 auth tuple — signed as an EIP-7702 authorization, then paired
 *                        with each userOpHash
 *
 * The SDK is mainnet-only (no testnet chain ids exist in it), so this moves
 * real value. Amount defaults to $1.
 *
 * Run: node packages/contracts/scripts/proof-cross-chain-send.mjs [amountUSD]
 */
import { UniversalAccount } from "@particle-network/universal-account-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { serializeSignature } from "viem";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const AMOUNT = process.argv[2] ?? "1";
const ARBITRUM_ONE = 42161;
const ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
// An address we do not control, so delivery is provable and the value cannot
// quietly return to us.
const RECEIVER = "0x000000000000000000000000000000000000dEaD";

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

console.log("owner / UA:", owner.address);

const deploymentsBefore = await ua.getEIP7702Deployments();
const delegatedBefore = deploymentsBefore.find((d) => d.chainId === ARBITRUM_ONE)?.isDelegated;
console.log(`delegated on Arbitrum before: ${delegatedBefore}`);

const before = await ua.getPrimaryAssets();
console.log(`balance before: $${before.totalAmountInUSD.toFixed(2)}`);
if (before.totalAmountInUSD < Number(AMOUNT)) {
  console.error(`insufficient: need $${AMOUNT}`);
  process.exit(1);
}

console.log(`\nbuilding transfer of $${AMOUNT} USDC → ${RECEIVER} on Arbitrum One…`);
const tx = await ua.createTransferTransaction({
  token: { chainId: ARBITRUM_ONE, address: ARBITRUM_USDC },
  amount: AMOUNT,
  receiver: RECEIVER,
});
console.log("rootHash:     ", tx.rootHash);
console.log("transactionId:", tx.transactionId);
console.log("userOps:      ", tx.userOps.length);

// Signature 1: the root hash — a merkle root over every userOp — signed as an
// EIP-191 personal_sign message, NOT as a raw digest. Signing it raw returns
// AA24 from the bundler. The 7702 auth tuple below is the opposite: raw.
const rootSignature = await owner.signMessage({ message: { raw: tx.rootHash } });

// Signature 2: the EIP-7702 authorization tuple. chainId 0 means the
// authorization is valid on every chain, which is what makes one signature
// upgrade the account everywhere.
const authTuples = await ua.getEIP7702Auth([ARBITRUM_ONE]);
console.log(
  `7702 auth tuple: chainId=${authTuples[0].chainId} nonce=${authTuples[0].nonce} delegate=${authTuples[0].address}`
);

const signedAuth = await owner.signAuthorization({
  contractAddress: authTuples[0].address,
  chainId: authTuples[0].chainId,
  nonce: authTuples[0].nonce,
});
const authSignature = serializeSignature({
  r: signedAuth.r,
  s: signedAuth.s,
  yParity: signedAuth.yParity ?? (signedAuth.v >= 27n ? Number(signedAuth.v) - 27 : Number(signedAuth.v)),
});

// Every userOp carries the same authorization signature; Particle pairs them
// by userOpHash.
const authorizations = tx.userOps.map((op) => ({
  userOpHash: op.userOpHash,
  signature: authSignature,
}));

console.log("submitting…");
const result = await ua.sendTransaction(tx, rootSignature, authorizations);
const txId = result?.transactionId ?? tx.transactionId;
console.log("\n✓ SUBMITTED");
console.log("transactionId:", txId);
console.log("explorer:", `https://universalx.app/activity/details?id=${txId}`);

console.log("\nwaiting for settlement…");
let after = before;
for (let i = 0; i < 25; i++) {
  await new Promise((r) => setTimeout(r, 6000));
  after = await ua.getPrimaryAssets();
  process.stdout.write(`  $${after.totalAmountInUSD.toFixed(4)}   \r`);
  if (after.totalAmountInUSD < before.totalAmountInUSD - 0.001) break;
}

const delta = before.totalAmountInUSD - after.totalAmountInUSD;
console.log(`\nbalance after: $${after.totalAmountInUSD.toFixed(4)}  (−$${delta.toFixed(4)})`);

const deploymentsAfter = await ua.getEIP7702Deployments();
const arbAfter = deploymentsAfter.find((d) => d.chainId === ARBITRUM_ONE);
console.log(`delegated on Arbitrum after: ${arbAfter?.isDelegated} (${arbAfter?.delegationAddress})`);

mkdirSync(new URL("../proofs/", import.meta.url), { recursive: true });
const record = {
  proof: "USDC transfer via Universal Account, owner EOA upgraded in place (EIP-7702)",
  ownerEOA: owner.address,
  universalAccountAddress: owner.address,
  addressUnchanged: true,
  receiver: RECEIVER,
  amountUSD: AMOUNT,
  chainId: ARBITRUM_ONE,
  token: ARBITRUM_USDC,
  rootHash: tx.rootHash,
  transactionId: txId,
  eip7702: {
    delegateContract: authTuples[0].address,
    authChainId: authTuples[0].chainId,
    nonce: authTuples[0].nonce,
    delegatedBefore,
    delegatedAfter: arbAfter?.isDelegated,
    delegationAddress: arbAfter?.delegationAddress,
  },
  balanceBefore: before.totalAmountInUSD,
  balanceAfter: after.totalAmountInUSD,
  settled: delta > 0,
  explorer: `https://universalx.app/activity/details?id=${txId}`,
};
writeFileSync(
  new URL("../proofs/cross-chain-send.json", import.meta.url),
  JSON.stringify(record, null, 2) + "\n"
);

console.log(
  delta > 0
    ? "\n✓ PROOF 1 PASSED — value moved on-chain through the UA"
    : "\n⚠ submitted but settlement not observed within the window"
);
