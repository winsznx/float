/**
 * Gate A runtime proof for A3: a real leash and a real pledge created on
 * Arbitrum One get their onchain ids attached by the indexer through
 * event-args matching, with no manual help — and the row's tx_hash is
 * backfilled with the real chain hash, replacing Particle's routing id.
 *
 * Moves real money: ~$0.02 USDC escrowed into PledgeVault (recoverable via
 * claimExpired to the burn destination after deadline + 72h — this pledge is
 * deliberately left to expire as the Phase D keeper subject) plus gas.
 *
 * Run with the API on :4000. Starts a local indexer against the production
 * cursor, which is safe: the gap it skips holds zero contract events
 * (verified via Arbiscan before the cursor is advanced).
 */
import { createWalletClient, createPublicClient, http, parseAbi, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const env = Object.fromEntries(
  readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const API = process.env.API_URL ?? "http://localhost:4000";
const RPC = env.ARBITRUM_ONE_RPC_URL || "https://arb1.arbitrum.io/rpc";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const LEASH_MANAGER = env.NEXT_PUBLIC_LEASH_MANAGER_ADDRESS;
const PLEDGE_VAULT = env.NEXT_PUBLIC_PLEDGE_VAULT_ADDRESS;
// A second real account (not the pledger/owner), required by the contracts'
// self-dealing guards.
const COUNTERPARTY = "0xaee48bd1467e3b7882281c9533dbd89865225153";

const ABI = parseAbi([
  "function approve(address spender, uint256 value) returns (bool)",
  "function createLeash(address beneficiary, address token, uint256 spendLimit, uint64 expiry) returns (bytes32)",
  "function createPledge(address witness, address failureDestination, address token, uint256 amount, uint64 deadline) returns (bytes32)",
]);

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const account = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);
const pub = createPublicClient({ chain: arbitrum, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: arbitrum, transport: http(RPC) });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADDRESS = account.address.toLowerCase();
const authEmail = `${ADDRESS}@wallet.float.local`;
let userId = null;
let indexer = null;

async function trpcMutation(path, token, input) {
  const res = await fetch(`${API}/trpc/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${path}: ${body.error.message}`);
  return body.result?.data;
}

const send = async (address, functionName, args) => {
  const hash = await wallet.writeContract({ address, abi: ABI, functionName, args });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  return hash;
};

try {
  const ethBal = await pub.getBalance({ address: account.address });
  console.log(`wallet ${account.address}: ${formatUnits(ethBal, 18)} ETH for gas`);

  // Session, same path loginWithMagic takes after DID verification.
  await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }).then(({ data }) => {
    const existing = data?.users.find((u) => u.email === authEmail);
    return existing ? admin.auth.admin.deleteUser(existing.id) : null;
  });
  const { data: created } = await admin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    user_metadata: { wallet_address: ADDRESS },
  });
  userId = created.user.id;
  await admin.from("users").upsert({ id: userId, address: ADDRESS });
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: authEmail });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  const token = verified.session.access_token;

  // DB rows first so the chain calls can reuse the server's exact unix values
  // (linkage matches on them byte-for-byte).
  const today = new Date().toISOString().slice(0, 10);
  const leashRow = await trpcMutation("leash.create", token, {
    beneficiary: COUNTERPARTY,
    spendLimit: 0.05,
    contractScope: "basic",
    expiryDate: "2026-08-20",
    timezone: "UTC",
  });
  check("leash row created without an on-chain id", !!leashRow?.id && !leashRow.onchain_leash_id, leashRow?.id);

  const pledgeRow = await trpcMutation("pledge.create", token, {
    goal: "Gate A linkage proof — expires as the Phase D keeper subject",
    stakeAmount: 0.02,
    witness: COUNTERPARTY,
    destinationId: "burn",
    deadlineDate: today,
    timezone: "UTC",
    isPublic: false,
  });
  check("pledge row created without an on-chain id", !!pledgeRow?.id && !pledgeRow.onchain_pledge_id, pledgeRow?.id);

  // The real contract calls, from a plain EOA — the contracts are
  // permissionless, so this exercises the exact events the app produces.
  await send(USDC, "approve", [LEASH_MANAGER, 50_000n]);
  const leashTx = await send(LEASH_MANAGER, "createLeash", [
    COUNTERPARTY,
    USDC,
    50_000n,
    BigInt(leashRow.expiry_unix),
  ]);
  check("real createLeash mined", true, leashTx);

  await send(USDC, "approve", [PLEDGE_VAULT, 20_000n]);
  const pledgeTx = await send(PLEDGE_VAULT, "createPledge", [
    COUNTERPARTY,
    "0x000000000000000000000000000000000000dEaD",
    USDC,
    20_000n,
    BigInt(pledgeRow.deadline_unix),
  ]);
  check("real createPledge mined (stake escrowed)", true, pledgeTx);

  // Advance the stale cursor (gap verified event-free) and run the indexer.
  const head = await pub.getBlockNumber();
  await admin.from("indexer_state").update({ last_block: Number(head - 80n) }).eq("id", "arbitrum");
  indexer = spawn("node", ["packages/indexer/dist/index.js"], {
    cwd: new URL("../../../", import.meta.url).pathname,
    stdio: "ignore",
    env: { ...process.env },
  });

  let leashLinked = null;
  let pledgeLinked = null;
  for (let i = 0; i < 20 && (!leashLinked?.onchain_leash_id || !pledgeLinked?.onchain_pledge_id); i++) {
    await new Promise((r) => setTimeout(r, 5000));
    ({ data: leashLinked } = await admin
      .from("leashes")
      .select("onchain_leash_id, tx_hash")
      .eq("id", leashRow.id)
      .single());
    ({ data: pledgeLinked } = await admin
      .from("pledges")
      .select("onchain_pledge_id, tx_hash")
      .eq("id", pledgeRow.id)
      .single());
  }

  check(
    "A3: leash onchain id attached by args-matching",
    !!leashLinked?.onchain_leash_id,
    leashLinked?.onchain_leash_id?.slice(0, 20)
  );
  check(
    "A3: leash tx_hash backfilled with the real chain hash",
    leashLinked?.tx_hash === leashTx.toLowerCase(),
    leashLinked?.tx_hash
  );
  check(
    "A3: pledge onchain id attached by args-matching",
    !!pledgeLinked?.onchain_pledge_id,
    pledgeLinked?.onchain_pledge_id?.slice(0, 20)
  );
  check(
    "A3: pledge tx_hash backfilled with the real chain hash",
    pledgeLinked?.tx_hash === pledgeTx.toLowerCase(),
    pledgeLinked?.tx_hash
  );

  console.log(
    `\nPhase D subject: pledge ${pledgeRow.id} (deadline ${pledgeRow.deadline_unix}, grace ends ${pledgeRow.deadline_unix + 72 * 3600})`
  );
} catch (error) {
  check(`unexpected: ${error.message}`, false);
} finally {
  indexer?.kill();
  // The auth user is NOT deleted: cascade would remove the linked rows, and
  // the pledge must survive as the Phase D keeper subject.
}

console.log(failures === 0 ? "\nPASS — chain linkage holds" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
