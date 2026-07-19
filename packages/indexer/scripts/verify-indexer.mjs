/**
 * Phase 5 acceptance: create a real leash on Arbitrum One, spend against it,
 * revoke it — and prove the indexer mirrors each event into Postgres.
 *
 * This spends real money (a few cents of USDC plus gas). It uses the deployer
 * key directly rather than a Magic wallet so it can run headlessly.
 *
 * Run: node packages/indexer/scripts/verify-indexer.mjs   (indexer running)
 */
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from "viem";
import { arbitrum } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createClient } from "@supabase/supabase-js";
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

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const LEASH = env.NEXT_PUBLIC_LEASH_MANAGER_ADDRESS;
const owner = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);

// A throwaway beneficiary — the contract rejects a self-leash.
//
// Generated fresh rather than using a fixed key. A well-known key like
// 0x1111…11 is watched by sweeper bots on mainnet: gas sent to it was drained
// within seconds, and the spend then failed with "gas required exceeds
// allowance". Anything funded on mainnet needs an address nobody else holds.
const beneficiary = privateKeyToAccount(generatePrivateKey());

const rpc = env.ARBITRUM_ONE_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
const pub = createPublicClient({ chain: arbitrum, transport: http(rpc) });
const wallet = createWalletClient({ account: owner, chain: arbitrum, transport: http(rpc) });
// spend() is beneficiary-only (reverts NotBeneficiary otherwise), so the
// beneficiary needs its own client and a little gas.
const benWallet = createWalletClient({ account: beneficiary, chain: arbitrum, transport: http(rpc) });

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ERC20 = [
  { type: "function", name: "approve", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
];

const LEASH_ABI = [
  { type: "function", name: "createLeash", inputs: [{ name: "beneficiary", type: "address" }, { name: "token", type: "address" }, { name: "spendLimit", type: "uint256" }, { name: "expiry", type: "uint64" }], outputs: [{ type: "bytes32" }], stateMutability: "nonpayable" },
  { type: "function", name: "spend", inputs: [{ name: "leashId", type: "bytes32" }, { name: "amount", type: "uint256" }, { name: "to", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "revoke", inputs: [{ name: "leashId", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "event", name: "LeashCreated", inputs: [{ name: "leashId", type: "bytes32", indexed: true }, { name: "owner", type: "address", indexed: true }, { name: "beneficiary", type: "address", indexed: true }, { name: "token", type: "address" }, { name: "spendLimit", type: "uint256" }, { name: "expiry", type: "uint64" }] },
];

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

/** Polls Postgres until the indexer applies the event, or times out. */
async function waitFor(label, query, predicate, timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await query();
    if (data && predicate(data)) {
      check(`${label} (${Math.round((Date.now() - started) / 1000)}s)`, true);
      return data;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  check(`${label} — timed out after ${timeoutMs / 1000}s`, false);
  return null;
}

const LIMIT = "0.50";
const SPEND = "0.10";
let leashId = null;
let dbLeashId = null;

try {
  const balance = await pub.readContract({ address: USDC, abi: ERC20, functionName: "balanceOf", args: [owner.address] });
  console.log(`owner USDC: $${formatUnits(balance, 6)}`);
  if (balance < parseUnits(LIMIT, 6)) {
    console.error(`need at least $${LIMIT} USDC on Arbitrum One`);
    process.exit(1);
  }

  // Allowance must cover the cap — LeashManager pulls, it doesn't escrow.
  const approveHash = await wallet.writeContract({
    address: USDC, abi: ERC20, functionName: "approve",
    args: [LEASH, parseUnits(LIMIT, 6)],
  });
  await pub.waitForTransactionReceipt({ hash: approveHash });
  check("USDC approve confirmed", true, approveHash.slice(0, 18));

  const expiry = BigInt(Math.floor(Date.now() / 1000) + 86_400);
  const createHash = await wallet.writeContract({
    address: LEASH, abi: LEASH_ABI, functionName: "createLeash",
    args: [beneficiary.address, USDC, parseUnits(LIMIT, 6), expiry],
  });
  const createReceipt = await pub.waitForTransactionReceipt({ hash: createHash });
  leashId = createReceipt.logs.find((l) => l.address.toLowerCase() === LEASH.toLowerCase())?.topics[1];
  check("createLeash confirmed on Arbitrum One", !!leashId, leashId?.slice(0, 20));

  // The API normally inserts this row; here we insert it so the indexer has
  // something to attach the on-chain id to, exactly as it would in the app.
  const { data: user } = await db.from("users").select("id").limit(1).maybeSingle();
  if (!user) {
    check("needs at least one user row to attach the leash to", false);
    throw new Error("no users");
  }
  const { data: row } = await db.from("leashes").insert({
    owner_id: user.id,
    beneficiary_ref: beneficiary.address,
    beneficiary_address: beneficiary.address.toLowerCase(),
    token: "USDC",
    spend_limit: Number(LIMIT),
    expiry_unix: Number(expiry),
    expiry_tz: "UTC",
    tx_hash: createHash,
  }).select().single();
  dbLeashId = row.id;

  await waitFor(
    "indexer attached the on-chain leashId",
    () => db.from("leashes").select("onchain_leash_id").eq("id", dbLeashId).maybeSingle(),
    (d) => d.onchain_leash_id?.toLowerCase() === leashId.toLowerCase()
  );

  // ── spend, as the beneficiary
  const benBalance = await pub.getBalance({ address: beneficiary.address });
  if (benBalance < 200_000_000_000_000n) {
    const fundHash = await wallet.sendTransaction({
      to: beneficiary.address,
      value: 300_000_000_000_000n, // 0.0003 ETH, ample for a few Arbitrum calls
    });
    await pub.waitForTransactionReceipt({ hash: fundHash });
    check("funded the beneficiary for gas", true, fundHash.slice(0, 18));
  }

  const spendHash = await benWallet.writeContract({
    address: LEASH, abi: LEASH_ABI, functionName: "spend",
    args: [leashId, parseUnits(SPEND, 6), owner.address],
  });
  await pub.waitForTransactionReceipt({ hash: spendHash });
  check("spend confirmed on-chain", true, spendHash.slice(0, 18));

  await waitFor(
    "indexer recorded the spend and updated `spent`",
    () => db.from("leashes").select("spent").eq("id", dbLeashId).maybeSingle(),
    (d) => Math.abs(d.spent - Number(SPEND)) < 0.001
  );

  const { data: spends } = await db.from("leash_spends").select("*").eq("leash_id", dbLeashId);
  check("leash_spends row written", spends?.length === 1, `amount $${spends?.[0]?.amount}`);
  check("spend row carries the real tx hash", spends?.[0]?.tx_hash === spendHash);

  // Replaying the same log must not double-count.
  const { error: dupe } = await db.from("leash_spends").insert({
    leash_id: dbLeashId, amount: Number(SPEND), to_address: owner.address.toLowerCase(),
    tx_hash: spendHash, log_index: spends[0].log_index, block_number: spends[0].block_number,
  });
  check("(tx_hash, log_index) blocks a duplicate spend", !!dupe, dupe?.code);

  // ── revoke
  const revokeHash = await wallet.writeContract({
    address: LEASH, abi: LEASH_ABI, functionName: "revoke", args: [leashId],
  });
  await pub.waitForTransactionReceipt({ hash: revokeHash });
  check("revoke confirmed on-chain", true, revokeHash.slice(0, 18));

  await waitFor(
    "indexer marked the leash revoked",
    () => db.from("leashes").select("revoked").eq("id", dbLeashId).maybeSingle(),
    (d) => d.revoked === true
  );

  const { data: activity } = await db
    .from("activity").select("type").eq("ref_id", dbLeashId);
  const kinds = new Set(activity?.map((a) => a.type));
  check("activity feed got spend + revoke", kinds.has("leash_spend") && kinds.has("leash_revoked"), [...kinds].join(", "));
} catch (error) {
  check(`unexpected: ${error.message}`, false);
} finally {
  if (dbLeashId) await db.from("leashes").delete().eq("id", dbLeashId);

  // Return whatever gas the throwaway beneficiary has left, so repeated runs
  // don't bleed ETH into addresses nobody will ever use again.
  try {
    const left = await pub.getBalance({ address: beneficiary.address });
    const gasCost = 60_000n * (await pub.getGasPrice());
    if (left > gasCost * 2n) {
      await benWallet.sendTransaction({ to: owner.address, value: left - gasCost * 2n });
    }
  } catch {
    // Dust recovery is best-effort; never fail the run over it.
  }
}

console.log(failures === 0 ? "\nPASS — chain events mirrored into Postgres" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
