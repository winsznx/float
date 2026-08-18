import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { serviceDb } from "./supabase.js";
import { env } from "./env.js";
import { notifyWitness } from "./notify.js";
import { fetchSendStatus } from "./transaction-status.js";
import { getErrorMessage } from "./errors.js";

/**
 * The cron-driven half of the product, one tick a minute, three tasks. Every
 * task is idempotent and safe to re-run: the keeper's guard is the contract
 * itself (AlreadyResolved / GracePeriodActive revert in simulation, spending
 * nothing), the witness lifecycle's guard is the pledge_events ledger, and
 * the reconciler only ever moves rows to what Particle says is terminal.
 */

const GRACE_SECONDS = 72 * 3600;
const DAY_SECONDS = 24 * 3600;
const PLEDGE_ABI = parseAbi(["function claimExpired(bytes32 pledgeId)"]);

/** Bounded per tick so one invocation stays inside Workers request budgets. */
const KEEPER_BATCH = 3;
const RECONCILE_BATCH = 20;

export async function runSchedulers(): Promise<void> {
  const results = await Promise.allSettled([
    runExpiryKeeper(),
    runWitnessLifecycle(),
    runSendReconciler(),
  ]);
  const names = ["keeper", "witness-lifecycle", "send-reconciler"];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`scheduler ${names[i]} failed`, getErrorMessage(result.reason));
    }
  });
}

/**
 * The expiry safety net, no longer theoretical: once a locked pledge is past
 * deadline + grace, anyone may slash it to the failure destination — so we
 * do, with the sponsor key. The indexer ingests PledgeExpiredSlashed and
 * flips the row; nothing is written here, the chain stays authoritative.
 */
async function runExpiryKeeper(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const { data: expired } = await serviceDb()
    .from("pledges")
    .select("id, onchain_pledge_id, deadline_unix")
    .eq("status", "locked")
    .lt("deadline_unix", now - GRACE_SECONDS)
    .order("deadline_unix", { ascending: true })
    .limit(KEEPER_BATCH);
  if (!expired?.length) return;

  const account = privateKeyToAccount(env.sponsorPrivateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain: arbitrum, transport: http(env.arbitrumRpcUrl) });
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(env.arbitrumRpcUrl) });

  for (const pledge of expired) {
    if (!pledge.onchain_pledge_id) {
      console.error("keeper: pledge has no onchain id, cannot slash", pledge.id);
      continue;
    }
    try {
      // Simulation is the idempotency and race guard: a pledge the witness
      // resolved first, or one another tick already slashed, reverts here
      // and costs nothing.
      const { request } = await publicClient.simulateContract({
        account,
        address: env.pledgeVaultAddress,
        abi: PLEDGE_ABI,
        functionName: "claimExpired",
        args: [pledge.onchain_pledge_id as `0x${string}`],
      });
      const hash = await wallet.writeContract(request);
      console.log("keeper: claimExpired submitted", pledge.id, hash);
    } catch (error) {
      console.log("keeper: skipped", pledge.id, getErrorMessage(error));
    }
  }
}

/**
 * The contract header promises the witness is notified at the deadline; this
 * is where that promise becomes true (plus a T-24h reminder). Reached however
 * they can be: in-app when the witness is a FLOAT user, email when they're an
 * email. pledge_events records each moment so a tick never re-sends.
 */
async function runWitnessLifecycle(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await notifyWindow("witness_reminded_24h", now, now + DAY_SECONDS, "closes in the next day");
  await notifyWindow("witness_notified_deadline", 0, now, "has reached its deadline");
}

async function notifyWindow(
  eventType: string,
  deadlineFrom: number,
  deadlineTo: number,
  phrase: string
): Promise<void> {
  const db = serviceDb();
  const { data: candidates } = await db
    .from("pledges")
    .select("id, goal, stake_amount, witness_ref, witness_user_id, witness_token, deadline_unix")
    .eq("status", "locked")
    .gte("deadline_unix", deadlineFrom)
    .lt("deadline_unix", deadlineTo)
    .limit(25);
  if (!candidates?.length) return;

  const { data: already } = await db
    .from("pledge_events")
    .select("pledge_id")
    .eq("event_type", eventType)
    .in("pledge_id", candidates.map((p) => p.id));
  const done = new Set((already ?? []).map((row) => row.pledge_id));

  for (const pledge of candidates) {
    if (done.has(pledge.id)) continue;
    const url = `${env.webOrigin}/witness/${pledge.witness_token}`;

    // Delivery before the ledger write: a crash between the two re-sends once
    // on the next tick, which beats recording a notification nobody got.
    if (pledge.witness_user_id) {
      const { error } = await db.from("notifications").insert({
        user_id: pledge.witness_user_id,
        type: "witness_request",
        payload: { goal: pledge.goal, stake: pledge.stake_amount, url, phase: eventType, phrase },
      });
      if (error) {
        console.error("witness lifecycle: notification failed", pledge.id, error.message);
        continue;
      }
    }
    const witnessIsEmail = pledge.witness_ref.includes("@") && !pledge.witness_ref.startsWith("@");
    if (witnessIsEmail) {
      try {
        await notifyWitness({
          email: pledge.witness_ref,
          goal: pledge.goal,
          stake: pledge.stake_amount,
          token: pledge.witness_token,
        });
      } catch (mailError) {
        console.error("witness lifecycle: email failed", pledge.id, getErrorMessage(mailError));
        continue;
      }
    }

    const { error: ledgerError } = await db.from("pledge_events").insert({
      pledge_id: pledge.id,
      event_type: eventType,
    });
    if (ledgerError) {
      console.error("witness lifecycle: ledger write failed", pledge.id, ledgerError.message);
    }
  }
}

/**
 * Background sweep of submitted sends against Particle — a send now reaches
 * its terminal state with the app closed, instead of only when someone opens
 * their history (which stays as a complementary path).
 */
async function runSendReconciler(): Promise<void> {
  const db = serviceDb();
  const { data: rows } = await db
    .from("sends")
    .select("id, tx_hash, sender_id")
    .eq("status", "submitted")
    .not("tx_hash", "is", null)
    .order("created_at", { ascending: true })
    .limit(RECONCILE_BATCH);
  if (!rows?.length) return;

  const senderIds = [...new Set(rows.map((row) => row.sender_id))];
  const { data: senders } = await db
    .from("users")
    .select("id, address")
    .in("id", senderIds);
  const addressOf = new Map((senders ?? []).map((user) => [user.id, user.address]));

  for (const row of rows) {
    const address = addressOf.get(row.sender_id);
    if (!address || !row.tx_hash) continue;
    try {
      const status = await fetchSendStatus(address, row.tx_hash);
      if (!status) continue;
      const { error } = await db.from("sends").update({ status }).eq("id", row.id);
      if (error) console.error("reconciler: update failed", row.id, error.message);
      else console.log("reconciler:", row.id, "→", status);
    } catch (error) {
      // A Particle hiccup on one row must not stall the sweep.
      console.error("reconciler: skip", row.id, getErrorMessage(error));
    }
  }
}
