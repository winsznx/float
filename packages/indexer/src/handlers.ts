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

export async function onLeashCreated(
  ctx: EventContext,
  args: { leashId: string; owner: string; beneficiary: string; spendLimit: bigint }
): Promise<void> {
  // The API already inserted the row when the user created it; this attaches
  // the on-chain id so later spend events can find it. Matching on tx_hash is
  // what links the two.
  const { data } = await ctx.db
    .from("leashes")
    .select("id, onchain_leash_id")
    .eq("tx_hash", ctx.txHash)
    .maybeSingle();

  if (data && !data.onchain_leash_id) {
    await ctx.db
      .from("leashes")
      .update({ onchain_leash_id: args.leashId })
      .eq("id", data.id);
  }
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

export async function onPledgeCreated(
  ctx: EventContext,
  args: { pledgeId: string; pledger: string; witness: string; amount: bigint }
): Promise<void> {
  const { data } = await ctx.db
    .from("pledges")
    .select("id, onchain_pledge_id")
    .eq("tx_hash", ctx.txHash)
    .maybeSingle();

  if (data && !data.onchain_pledge_id) {
    await ctx.db
      .from("pledges")
      .update({ onchain_pledge_id: args.pledgeId })
      .eq("id", data.id);
  }
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
