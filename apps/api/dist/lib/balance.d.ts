/**
 * The balance seam (DATA_CONTRACTS §2). Backs four surfaces the frontend
 * currently hardcodes: BalanceDisplay, BalanceDiscovery, the send max, and
 * confirmation routing.
 *
 * Deliberately NOT a Postgres table — this is live Universal Account state.
 * Caching it would let the displayed balance drift from what the chain will
 * actually let you spend.
 *
 * Goes through the SDK rather than Particle's JSON-RPC directly: the SDK owns
 * the request envelope and the hex-1e18 → number decoding, and hand-rolling
 * that returned "Invalid request".
 */
export type ChainBalance = {
    chain: string;
    value: number;
};
export type UnifiedBalance = {
    total: number;
    chains: ChainBalance[];
    tokens: string[];
};
export declare function getUnifiedBalance(ownerAddress: string): Promise<UnifiedBalance>;
/** Chains an address holds value on, ranked. Used by identity resolution. */
export declare function chainsHoldingValue(ownerAddress: string): Promise<{
    chains: string[];
    preferred: string;
}>;
