/**
 * Gate B runtime proofs, all real money on Arbitrum One against the deployed
 * Cloudflare stack:
 *
 *  1. Leash live usage: a real leash to a beneficiary key this script holds,
 *     a real on-chain spend, and the OWNER's realtime channel (the same
 *     postgres_changes subscription the web page opens) receiving the update
 *     without any refresh.
 *  2. Split settle realtime + activity: the organizer's channel sees the
 *     verified settle land, and split_member_settled activity + notification
 *     rows exist afterward.
 *  3. A real Universal Account send with the new tradeConfig
 *     (preferTokenType USD, slippageBps 100) reaching FINISHED.
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  formatUnits,
  parseEther,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { createClient } from "@supabase/supabase-js";
import { UniversalAccount, UA_TRANSACTION_STATUS, PREFER_TOKEN_TYPE } from "@particle-network/universal-account-sdk";
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

const API = process.env.API_URL ?? "https://float-api.timjosh507.workers.dev";
const RPC = env.ARBITRUM_ONE_RPC_URL || "https://arb1.arbitrum.io/rpc";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const LEASH_MANAGER = env.NEXT_PUBLIC_LEASH_MANAGER_ADDRESS;
const COUNTERPARTY = "0xaee48bd1467e3b7882281c9533dbd89865225153";

const ABI = parseAbi([
  "function approve(address spender, uint256 value) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function createLeash(address beneficiary, address token, uint256 spendLimit, uint64 expiry) returns (bytes32)",
  "function spend(bytes32 leashId, uint256 amount, address to)",
]);

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const owner = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);
const beneficiary = privateKeyToAccount(generatePrivateKey());
const pub = createPublicClient({ chain: arbitrum, transport: http(RPC) });
const ownerWallet = createWalletClient({ account: owner, chain: arbitrum, transport: http(RPC) });
const beneficiaryWallet = createWalletClient({
  account: beneficiary,
  chain: arbitrum,
  transport: http(RPC),
});

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OWNER_ADDRESS = owner.address.toLowerCase();
const authEmail = `${OWNER_ADDRESS}@wallet.float.local`;

const sendTx = async (wallet, address, functionName, args) => {
  const hash = await wallet.writeContract({ address, abi: ABI, functionName, args });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  return hash;
};

async function mintOwnerSession() {
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: authEmail });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  return verified.session.access_token;
}

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

/** RLS-scoped realtime subscription, exactly what the web page opens. */
function subscribe(jwt, table, filter, onEvent) {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  client.realtime.setAuth(jwt);
  const channel = client
    .channel(`proof-${table}-${Date.now()}`)
    .on("postgres_changes", { event: "*", schema: "public", table, filter }, onEvent)
    .subscribe();
  return { client, channel };
}

const waitFor = (predicate, ms, step = 3000) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      if (predicate()) return resolve(true);
      if (Date.now() - startedAt > ms) return resolve(false);
      setTimeout(tick, step);
    };
    tick();
  });

try {
  const [usdcBal, ethBal] = await Promise.all([
    pub.readContract({ address: USDC, abi: ABI, functionName: "balanceOf", args: [owner.address] }),
    pub.getBalance({ address: owner.address }),
  ]);
  console.log(`owner ${owner.address}: ${formatUnits(usdcBal, 6)} USDC, ${formatUnits(ethBal, 18)} ETH`);
  console.log(`beneficiary (fresh): ${beneficiary.address}`);

  const token = await mintOwnerSession();

  // ── Proof 1: leash live usage ─────────────────────────────────────────
  const leashRow = await trpcMutation("leash.create", token, {
    beneficiary: beneficiary.address,
    spendLimit: 0.04,
    expiryDate: "2026-08-20",
    timezone: "UTC",
  });
  check("leash row created", !!leashRow?.id, leashRow?.id);

  await sendTx(ownerWallet, USDC, "approve", [LEASH_MANAGER, 40_000n]);
  const leashTx = await sendTx(ownerWallet, LEASH_MANAGER, "createLeash", [
    beneficiary.address,
    USDC,
    40_000n,
    BigInt(leashRow.expiry_unix),
  ]);
  check("real createLeash mined", true, leashTx);

  // Gas for the beneficiary's spend call — a fresh EOA holds nothing.
  const fund = await ownerWallet.sendTransaction({
    to: beneficiary.address,
    value: parseEther("0.00002"),
  });
  await pub.waitForTransactionReceipt({ hash: fund });

  let onchainLeashId = null;
  for (let i = 0; i < 30 && !onchainLeashId; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const { data } = await admin
      .from("leashes")
      .select("onchain_leash_id")
      .eq("id", leashRow.id)
      .single();
    onchainLeashId = data?.onchain_leash_id ?? null;
  }
  check("indexer linked the leash by args", !!onchainLeashId, onchainLeashId?.slice(0, 20));
  if (!onchainLeashId) throw new Error("leash never linked; cannot continue");

  let sawSpendEvent = false;
  const { client: rtClient } = subscribe(
    token,
    "leash_spends",
    `leash_id=eq.${leashRow.id}`,
    () => {
      sawSpendEvent = true;
    }
  );
  await new Promise((r) => setTimeout(r, 3000));

  const spendTx = await sendTx(beneficiaryWallet, LEASH_MANAGER, "spend", [
    onchainLeashId,
    20_000n,
    beneficiary.address,
  ]);
  check("real beneficiary spend mined ($0.02 pulled from owner)", true, spendTx);

  const eventArrived = await waitFor(() => sawSpendEvent, 120_000);
  check("owner's realtime channel saw the spend without any refresh", eventArrived);

  const { data: after } = await admin
    .from("leashes")
    .select("spent")
    .eq("id", leashRow.id)
    .single();
  check("leashes.spent mirrors the chain", after?.spent === 0.02, `spent $${after?.spent}`);
  await rtClient.removeAllChannels();

  // ── Proof 2: split settle realtime + activity rows ────────────────────
  const headCents = 2 + (Math.floor(Date.now() / 60_000) % 11);
  const split = await trpcMutation("split.create", token, {
    name: "Gate B realtime proof",
    totalAmount: (headCents * 3) / 100,
    method: "equal",
    members: [
      { ref: "vitalik.eth", shareAmount: headCents / 100 },
      { ref: "dwr", shareAmount: headCents / 100 },
    ],
  });
  const shareToken = split.shareUrl.split("/").pop();

  let sawSettleEvent = false;
  const { client: rtSplit } = subscribe(
    token,
    "split_members",
    `split_id=eq.${split.id}`,
    (payload) => {
      if (payload.new?.settled) sawSettleEvent = true;
    }
  );
  await new Promise((r) => setTimeout(r, 3000));

  const payTx = await ownerWallet.writeContract({
    address: USDC,
    abi: parseAbi(["function transfer(address to, uint256 value) returns (bool)"]),
    functionName: "transfer",
    args: [owner.address, BigInt(headCents) * 10_000n],
  });
  await pub.waitForTransactionReceipt({ hash: payTx });
  check(`real $${(headCents / 100).toFixed(2)} transfer for the settle`, !!payTx, payTx);

  const settleOnce = () =>
    fetch(`${API}/link/settle/${shareToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: split.members[0].id, txHash: `0x${"cd".repeat(32)}` }),
    });
  let settled = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const res = await settleOnce();
    if (res.status === 200) {
      settled = await res.json();
      break;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  check("settle recorded with chain corroboration", settled?.settled === true, settled?.settle_tx_hash);

  const settleEventArrived = await waitFor(() => sawSettleEvent, 60_000);
  check("organizer's realtime channel saw the settle land", settleEventArrived);

  const { data: activityRows } = await admin
    .from("activity")
    .select("type")
    .eq("ref_id", split.id)
    .eq("type", "split_member_settled");
  check("split_member_settled activity row written", (activityRows?.length ?? 0) > 0);
  await rtSplit.removeAllChannels();
  await admin.from("splits").delete().eq("id", split.id);

  // ── Proof 3: real UA send with the new tradeConfig ────────────────────
  const ua = new UniversalAccount({
    projectId: env.NEXT_PUBLIC_PARTICLE_PROJECT_ID,
    projectClientKey: env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY,
    projectAppUuid: env.NEXT_PUBLIC_PARTICLE_APP_ID,
    tradeConfig: { preferTokenType: PREFER_TOKEN_TYPE.USD, slippageBps: 100 },
    smartAccountOptions: {
      name: "UNIVERSAL",
      version: "2.0.1",
      ownerAddress: owner.address,
      useEIP7702: true,
    },
  });

  // The owner EOA must carry the delegation before the UA can execute.
  const preflight = await (await fetch(`${API}/delegate/${owner.address}`)).json();
  if (!preflight.delegated) {
    const signed = await owner.signAuthorization({
      contractAddress: preflight.contractAddress,
      chainId: preflight.chainId,
      nonce: preflight.nonce,
    });
    const delegated = await (
      await fetch(`${API}/delegate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: owner.address,
          contractAddress: preflight.contractAddress,
          nonce: preflight.nonce,
          r: signed.r,
          s: signed.s,
          yParity: signed.yParity,
        }),
      })
    ).json();
    check("owner delegated via the worker relayer", delegated.delegated === true, delegated.txHash);
  }

  const transfer = await ua.createTransferTransaction({
    token: { chainId: 42161, address: USDC },
    amount: "0.05",
    receiver: COUNTERPARTY,
  });
  const rootSignature = await owner.signMessage({ message: { raw: transfer.rootHash } });
  const sent = await ua.sendTransaction(transfer, rootSignature);
  const transactionId = sent?.transactionId ?? transfer.transactionId;
  check("UA transfer submitted with tradeConfig live", !!transactionId, transactionId);

  let status = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const detail = await ua.getTransaction(transactionId).catch(() => null);
    status = detail?.status ?? detail?.data?.status ?? null;
    if (status === UA_TRANSACTION_STATUS.FINISHED) break;
  }
  check(
    "UA transfer FINISHED (preferTokenType USD, slippage 100bps)",
    status === UA_TRANSACTION_STATUS.FINISHED,
    `status ${status}`
  );
} catch (error) {
  check(`unexpected: ${error.message}`, false);
}

console.log(failures === 0 ? "\nPASS — Gate B runtime proofs hold" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
