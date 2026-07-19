import type { SupabaseClient } from "@supabase/supabase-js";
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
export declare function onLeashCreated(ctx: EventContext, args: {
    leashId: string;
    owner: string;
    beneficiary: string;
    spendLimit: bigint;
}): Promise<void>;
export declare function onLeashSpent(ctx: EventContext, args: {
    leashId: string;
    beneficiary: string;
    to: string;
    amount: bigint;
    remaining: bigint;
}): Promise<void>;
export declare function onLeashRevoked(ctx: EventContext, args: {
    leashId: string;
}): Promise<void>;
export declare function onPledgeCreated(ctx: EventContext, args: {
    pledgeId: string;
    pledger: string;
    witness: string;
    amount: bigint;
}): Promise<void>;
export declare function onPledgeSucceeded(ctx: EventContext, args: {
    pledgeId: string;
    amountReturned: bigint;
}): Promise<void>;
export declare function onPledgeFailed(ctx: EventContext, args: {
    pledgeId: string;
    amountSlashed: bigint;
}): Promise<void>;
export declare function onPledgeExpiredSlashed(ctx: EventContext, args: {
    pledgeId: string;
    amountSlashed: bigint;
}): Promise<void>;
