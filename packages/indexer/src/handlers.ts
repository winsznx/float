import { formatUnits } from "viem";
import type { SupabaseClient } from "@supabase/supabase-js";

const USDC_DECIMALS = 6;

/** Chain amounts are minor units; the database stores display USD. */
function toUsd(raw: bigint): number {
  return Number(formatUnits(raw, USDC_DECIMALS));
}

export type EventContext = {
  db: SupabaseClient;
  txHash: string;
  logIndex: number;
  blockNumber: bigint;
};

/**
 * Every handler is idempotent. The reconciliation loop replays ranges that may
 * already be applied, and a chain reorg can deliver the same log twice, so a
 * second application must be a no-op rather than double-counting a spend.
 *
 * `spent` is derived from the event's own `remaining` field rather than
 * incremented locally — the contract is authoritative, and an increment would
 * drift if a log were ever applied twice.
 */

/**
 * The API row and the chain event are linked by the event's own arguments,
 * never by transaction hash: the app only knows Particle's routing
 * transactionId, which is not the hash the log carries (confirmed against
 * mainnet — the one production leash never linked under hash matching).
 * Among identical unlinked rows the oldest wins, so repeated creates link
 * first-in-first-out. The real chain hash is backfilled onto the row.
 */
export async function onLeashCreated(
  ctx: EventContext,
  args: {
    leashId: string;
    owner: string;
    beneficiary: string;
    token: string;
    spendLimit: bigint;
    expiry: bigint;
  }
): Promise<void> {
  const { data: linked } = await ctx.db
    .from("leashes")
    .select("id")
    .eq("onchain_leash_id", args.leashId)
    .maybeSingle();
  if (linked) return;

  const { data: owner } = await ctx.db
    .from("users")
    .select("id")
    .eq("address", args.owner.toLowerCase())
    .maybeSingle();
  if (!owner) return;

  let query = ctx.db
    .from("leashes")
    .select("id")
    .is("onchain_leash_id", null)
    .eq("owner_id", owner.id)
    .eq("beneficiary_address", args.beneficiary.toLowerCase())
    .eq("spend_limit", toUsd(args.spendLimit));
  query =
    args.expiry === 0n
      ? query.is("expiry_unix", null)
      : query.eq("expiry_unix", Number(args.expiry));
  const { data: candidates } = await query
    .order("created_at", { ascending: true })
    .limit(1);
  const match = candidates?.[0];
  if (!match) return;

  const { error } = await ctx.db
    .from("leashes")
    .update({ onchain_leash_id: args.leashId, tx_hash: ctx.txHash })
    .eq("id", match.id)
    .is("onchain_leash_id", null);
  if (error && !error.message.includes("duplicate")) throw error;
}

export async function onLeashSpent(
  ctx: EventContext,
  args: { leashId: string; beneficiary: string; to: string; amount: bigint; remaining: bigint }
): Promise<void> {
  const { data: leash } = await ctx.db
    .from("leashes")
    .select("id, owner_id, spend_limit")
    .eq("onchain_leash_id", args.leashId)
    .maybeSingle();
  if (!leash) return;

  // (tx_hash, log_index) is the idempotency key — a replayed log conflicts and
  // is ignored rather than inserting a duplicate spend.
  const { error } = await ctx.db.from("leash_spends").insert({
    leash_id: leash.id,
    amount: toUsd(args.amount),
    to_address: args.to.toLowerCase(),
    tx_hash: ctx.txHash,
    log_index: ctx.logIndex,
    block_number: Number(ctx.blockNumber),
  });
  if (error && !error.message.includes("duplicate")) throw error;

  // Derived from the contract's own remaining, so replays converge instead of
  // accumulating.
  await ctx.db
    .from("leashes")
    .update({ spent: leash.spend_limit - toUsd(args.remaining) })
    .eq("id", leash.id);

  await ctx.db.from("notifications").insert({
    user_id: leash.owner_id,
    type: "leash_spend",
    payload: {
      amount: toUsd(args.amount),
      to: args.to.toLowerCase(),
      remaining: toUsd(args.remaining),
      txHash: ctx.txHash,
    },
  });

  await ctx.db.from("activity").insert({
    user_id: leash.owner_id,
    type: "leash_spend",
    ref_type: "leash",
    ref_id: leash.id,
  });
}

export async function onLeashRevoked(
  ctx: EventContext,
  args: { leashId: string }
): Promise<void> {
  const { data: leash } = await ctx.db
    .from("leashes")
    .select("id, owner_id, revoked")
    .eq("onchain_leash_id", args.leashId)
    .maybeSingle();
  if (!leash || leash.revoked) return;

  await ctx.db.from("leashes").update({ revoked: true }).eq("id", leash.id);
  await ctx.db.from("activity").insert({
    user_id: leash.owner_id,
    type: "leash_revoked",
    ref_type: "leash",
    ref_id: leash.id,
  });
}

/** Same args-linkage as onLeashCreated: pledger + stake + exact deadline +
 *  failure destination identify the row; deadline_unix is byte-for-byte the
 *  uint the contract stores, which is what makes this deterministic. */
export async function onPledgeCreated(
  ctx: EventContext,
  args: {
    pledgeId: string;
    pledger: string;
    witness: string;
    token: string;
    amount: bigint;
    deadline: bigint;
    failureDestination: string;
  }
): Promise<void> {
  const { data: linked } = await ctx.db
    .from("pledges")
    .select("id")
    .eq("onchain_pledge_id", args.pledgeId)
    .maybeSingle();
  if (linked) return;

  const { data: pledger } = await ctx.db
    .from("users")
    .select("id")
    .eq("address", args.pledger.toLowerCase())
    .maybeSingle();
  if (!pledger) return;

  const { data: candidates } = await ctx.db
    .from("pledges")
    .select("id")
    .is("onchain_pledge_id", null)
    .eq("pledger_id", pledger.id)
    .eq("stake_amount", toUsd(args.amount))
    .eq("deadline_unix", Number(args.deadline))
    .eq("failure_destination_address", args.failureDestination.toLowerCase())
    .order("created_at", { ascending: true })
    .limit(1);
  const match = candidates?.[0];
  if (!match) return;

  const { error } = await ctx.db
    .from("pledges")
    .update({ onchain_pledge_id: args.pledgeId, tx_hash: ctx.txHash })
    .eq("id", match.id)
    .is("onchain_pledge_id", null);
  if (error && !error.message.includes("duplicate")) throw error;
}

/** Shared terminal transition for all three resolution paths. */
async function resolvePledge(
  ctx: EventContext,
  pledgeId: string,
  succeeded: boolean,
  eventType: string,
  amount: bigint
): Promise<void> {
  const { data: pledge } = await ctx.db
    .from("pledges")
    .select("id, pledger_id, status")
    .eq("onchain_pledge_id", pledgeId)
    .maybeSingle();
  if (!pledge) return;

  // Resolution is terminal on-chain, so never move a pledge out of a resolved
  // state — a replayed log must not flip succeeded to failed.
  if (pledge.status !== "locked") return;

  await ctx.db
    .from("pledges")
    .update({
      status: succeeded ? "succeeded" : "failed",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", pledge.id);

  const { error } = await ctx.db.from("pledge_events").insert({
    pledge_id: pledge.id,
    event_type: eventType,
    tx_hash: ctx.txHash,
    log_index: ctx.logIndex,
    block_number: Number(ctx.blockNumber),
  });
  if (error && !error.message.includes("duplicate")) throw error;

  await ctx.db.from("activity").insert({
    user_id: pledge.pledger_id,
    type: succeeded ? "pledge_succeeded" : "pledge_failed",
    ref_type: "pledge",
    ref_id: pledge.id,
  });

  await ctx.db.from("notifications").insert({
    user_id: pledge.pledger_id,
    type: succeeded ? "pledge_succeeded" : "pledge_failed",
    payload: { amount: toUsd(amount), txHash: ctx.txHash },
  });
}

export async function onPledgeSucceeded(
  ctx: EventContext,
  args: { pledgeId: string; amountReturned: bigint }
): Promise<void> {
  await resolvePledge(ctx, args.pledgeId, true, "succeeded", args.amountReturned);
}

export async function onPledgeFailed(
  ctx: EventContext,
  args: { pledgeId: string; amountSlashed: bigint }
): Promise<void> {
  await resolvePledge(ctx, args.pledgeId, false, "failed", args.amountSlashed);
}

export async function onPledgeExpiredSlashed(
  ctx: EventContext,
  args: { pledgeId: string; amountSlashed: bigint }
): Promise<void> {
  await resolvePledge(ctx, args.pledgeId, false, "expired_slashed", args.amountSlashed);
}
