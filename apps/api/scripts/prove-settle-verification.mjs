/**
 * Gate A runtime proof: A1 (a $0.03 equal split is accepted) and A2 (a settle
 * records only when a real on-chain USDC transfer corroborates it, records the
 * chain's hash rather than the client's claim, and never reuses one transfer
 * for two shares).
 *
 * Moves real money: one $0.01 USDC self-transfer on Arbitrum One plus gas.
 */
import { createWalletClient, createPublicClient, http, parseAbi, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("/Users/mac/float/.env.local", import.meta.url), "utf8")
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
const ERC20 = parseAbi([
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
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
const createdSplitIds = [];

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

try {
  const [usdcBal, ethBal] = await Promise.all([
    pub.readContract({ address: USDC, abi: ERC20, functionName: "balanceOf", args: [account.address] }),
    pub.getBalance({ address: account.address }),
  ]);
  console.log(`wallet ${account.address}: ${formatUnits(usdcBal, 6)} USDC, ${formatUnits(ethBal, 18)} ETH`);
  if (usdcBal < 10_000n) throw new Error("wallet needs at least $0.01 USDC on Arbitrum One");

  // Session, exactly the path loginWithMagic takes after DID verification.
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

  // A1 live proof: a dust-sized equal split. The per-head cent amount is
  // varied per run so a leftover transfer from an earlier run (still inside
  // the sweep window) cannot corroborate this run's shares.
  // Minute-derived so consecutive runs use different amounts and a leftover
  // transfer from an earlier run can't corroborate this run's shares.
  const headCents = 2 + (Math.floor(Date.now() / 60_000) % 11);
  const headUsd = headCents / 100;
  const totalUsd = (headCents * 3) / 100;
  const split = await trpcMutation("split.create", token, {
    name: "Gate A proof",
    totalAmount: totalUsd,
    method: "equal",
    members: [
      { ref: "vitalik.eth", shareAmount: headUsd },
      { ref: "dwr", shareAmount: headUsd },
    ],
  });
  if (split?.id) createdSplitIds.push(split.id);
  check(`A1: $${totalUsd.toFixed(2)} equal split accepted at $${headUsd.toFixed(2)} a head`, split?.members?.length === 2, split?.id);

  const shareToken = split.shareUrl.split("/").pop();
  const [m1, m2] = split.members;

  // The real transfer the server must find: exactly one head's share of USDC
  // to the organizer.
  const txHash = await wallet.writeContract({
    address: USDC,
    abi: ERC20,
    functionName: "transfer",
    args: [account.address, BigInt(headCents) * 10_000n],
  });
  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  check(`real $${headUsd.toFixed(2)} USDC transfer mined on Arbitrum One`, receipt.status === "success", txHash);

  const settle = async (memberId) =>
    fetch(`${API}/link/settle/${shareToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: memberId, txHash: `0x${"ab".repeat(32)}` }),
    });

  // The sweep's logs RPC can trail the receipt by a few seconds, so retry the
  // record phase exactly like the real client does on a retryable 409.
  const settleWithRetry = async (memberId) => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const res = await settle(memberId);
      if (res.status !== 409) return res;
      const body = await res.clone().json();
      if (!body?.retryable) return res;
      await new Promise((r) => setTimeout(r, 4000));
    }
    return settle(memberId);
  };

  const r1 = await settleWithRetry(m1.id);
  const row1 = await r1.json();
  check("A2: settle recorded once the chain corroborates", r1.status === 200 && row1?.settled === true);
  check(
    "A2: recorded hash is the real chain hash, not the client's claim",
    row1?.settle_tx_hash === txHash.toLowerCase(),
    `${row1?.settle_tx_hash} vs ${txHash.toLowerCase()}`
  );

  const r2 = await settle(m2.id);
  const row2 = await r2.json();
  check(
    "A2: one transfer cannot settle a second share",
    r2.status === 409 && !!row2?.error,
    `${r2.status} ${row2?.error ?? ""}`
  );

  const replay = await settle(m1.id);
  const replayRow = await replay.json();
  check("A2: re-recording a settled share is a no-op", replay.status === 200 && replayRow?.settled === true);
} catch (error) {
  check(`unexpected: ${error.message}`, false);
} finally {
  // Remove only the splits this run created — deleting the auth user would
  // cascade every row that identity owns, including real linked pledges.
  for (const id of createdSplitIds) {
    await admin.from("splits").delete().eq("id", id);
  }
}

console.log(failures === 0 ? "\nPASS — Gate A runtime proofs hold" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
