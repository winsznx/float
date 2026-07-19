import { api } from "@/lib/api";

export type ChainBalance = { chain: string; value: number };
export type UnifiedBalance = {
  total: number;
  chains: ChainBalance[];
  tokens: string[];
};

/**
 * Live Universal Account balance. Not cached in Postgres — a stale number here
 * would let the UI offer to send more than the chain will allow.
 */
export async function getBalance(): Promise<UnifiedBalance> {
  return api.balance.get.query();
}
