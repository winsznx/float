import { UniversalAccount } from "@particle-network/universal-account-sdk";
import { env } from "./env.js";

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

export type ChainBalance = { chain: string; value: number };
export type UnifiedBalance = {
  total: number;
  chains: ChainBalance[];
  tokens: string[];
};

const CHAIN_LABELS: Record<number, string> = {
  1: "Ethereum",
  56: "BNB Chain",
  8453: "Base",
  42161: "Arbitrum",
  196: "X Layer",
  101: "Solana",
};

/** Shared by the transaction-status seam, which reads the same live UA state. */
export function accountFor(ownerAddress: string): UniversalAccount {
  return new UniversalAccount({
    projectId: env.particleProjectId,
    projectClientKey: env.particleClientKey,
    projectAppUuid: env.particleAppUuid,
    smartAccountOptions: {
      name: "UNIVERSAL",
      version: "2.0.1",
      ownerAddress,
      useEIP7702: true,
    },
  });
}

export async function getUnifiedBalance(ownerAddress: string): Promise<UnifiedBalance> {
  const assets = await accountFor(ownerAddress).getPrimaryAssets();

  const byChain = new Map<number, number>();
  const tokens = new Set<string>();

  for (const asset of assets.assets ?? []) {
    if (asset.amountInUSD > 0) tokens.add(String(asset.tokenType ?? "").toUpperCase());
    for (const row of asset.chainAggregation ?? []) {
      if (row.amountInUSD <= 0) continue;
      const id = row.token?.chainId;
      if (id === undefined) continue;
      byChain.set(id, (byChain.get(id) ?? 0) + row.amountInUSD);
    }
  }

  return {
    total: assets.totalAmountInUSD,
    chains: [...byChain.entries()]
      .map(([id, value]) => ({ chain: CHAIN_LABELS[id] ?? `Chain ${id}`, value }))
      .sort((a, b) => b.value - a.value),
    tokens: [...tokens].filter(Boolean),
  };
}

/** Chains an address holds value on, ranked. Used by identity resolution. */
export async function chainsHoldingValue(
  ownerAddress: string
): Promise<{ chains: string[]; preferred: string }> {
  try {
    const balance = await getUnifiedBalance(ownerAddress);
    return {
      chains: balance.chains.map((c) => c.chain),
      // Arbitrum is FLOAT's settlement chain, so it is the fallback when the
      // recipient holds nothing anywhere yet.
      preferred: balance.chains[0]?.chain ?? "Arbitrum",
    };
  } catch {
    // Enrichment, not authorization — a lookup failure must not block
    // resolving the recipient.
    return { chains: [], preferred: "Arbitrum" };
  }
}
