/**
 * Recreates the DB rows for the real on-chain leash + pledge created by
 * prove-chain-linkage (the originals were cascade-deleted by a verify run
 * that shared the same auth identity — since fixed), then rolls the indexer
 * cursor back so the production worker re-links them by event args. No new
 * chain transactions.
 */
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
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

const API = process.env.API_URL ?? "https://float-api.timjosh507.workers.dev";
const LEASH_TX = "0xe07faaa0c7d0845e67b448735430b1890d8531aaa8fb418d837ca1c2b9e9d737";
const PLEDGE_TX = "0x672a3be4c23a452a0c2d30bd0580bc765182a52a6b15f8542624ca4ba3ef715e";
const OWNER = "0x88B59C52C90a257111C3E6Bb32F1983410E63A84".toLowerCase();
const COUNTERPARTY = "0xaee48bd1467e3b7882281c9533dbd89865225153";

const pub = createPublicClient({
  chain: arbitrum,
  transport: http(env.ARBITRUM_ONE_RPC_URL || "https://arb1.arbitrum.io/rpc"),
});
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authEmail = `${OWNER}@wallet.float.local`;

// Session for the owner identity (kept afterward — it owns real linked rows).
let userId;
{
  const { data: created } = await admin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    user_metadata: { wallet_address: OWNER },
  });
  if (created?.user) {
    userId = created.user.id;
  } else {
    const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: authEmail });
    userId = link.user.id;
  }
  await admin.from("users").upsert({ id: userId, address: OWNER });
}
const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: authEmail });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: verified } = await anon.auth.verifyOtp({
  type: "magiclink",
  token_hash: link.properties.hashed_token,
});
const token = verified.session.access_token;

const mutate = async (path, input) => {
  const res = await fetch(`${API}/trpc/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${path}: ${body.error.message}`);
  return body.result?.data;
};

const leashRow = await mutate("leash.create", {
  beneficiary: COUNTERPARTY,
  spendLimit: 0.05,
  contractScope: "basic",
  expiryDate: "2026-08-20",
  timezone: "UTC",
});
const pledgeRow = await mutate("pledge.create", {
  goal: "Gate A linkage proof — expires as the Phase D keeper subject",
  stakeAmount: 0.02,
  witness: COUNTERPARTY,
  destinationId: "burn",
  deadlineDate: "2026-08-17",
  timezone: "UTC",
  isPublic: false,
});
console.log("rows recreated:", leashRow.id, pledgeRow.id);

const [leashReceipt, pledgeReceipt] = await Promise.all([
  pub.getTransactionReceipt({ hash: LEASH_TX }),
  pub.getTransactionReceipt({ hash: PLEDGE_TX }),
]);
const rewindTo =
  (leashReceipt.blockNumber < pledgeReceipt.blockNumber
    ? leashReceipt.blockNumber
    : pledgeReceipt.blockNumber) - 10n;
await admin.from("indexer_state").update({ last_block: Number(rewindTo) }).eq("id", "arbitrum");
console.log("cursor rewound to", rewindTo.toString(), "— waiting for the worker to re-link");

for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 6000));
  const [{ data: leash }, { data: pledge }] = await Promise.all([
    admin.from("leashes").select("onchain_leash_id, tx_hash").eq("id", leashRow.id).single(),
    admin.from("pledges").select("onchain_pledge_id, tx_hash").eq("id", pledgeRow.id).single(),
  ]);
  if (leash?.onchain_leash_id && pledge?.onchain_pledge_id) {
    console.log("leash linked:", leash.onchain_leash_id.slice(0, 20), "tx", leash.tx_hash === LEASH_TX ? "matches" : leash.tx_hash);
    console.log("pledge linked:", pledge.onchain_pledge_id.slice(0, 20), "tx", pledge.tx_hash === PLEDGE_TX ? "matches" : pledge.tx_hash);
    console.log("\nPASS — keeper subject restored:", pledgeRow.id);
    process.exit(0);
  }
}
console.error("FAIL — rows did not link in time");
process.exit(1);
