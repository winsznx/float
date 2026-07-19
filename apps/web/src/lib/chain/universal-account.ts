import {
  UniversalAccount,
  type EIP7702Authorization,
  type IAssetsResponse,
  type ITransaction,
} from "@particle-network/universal-account-sdk";
import { serializeSignature, numberToHex } from "viem";
import type { Sign7702AuthorizationResponse } from "@magic-sdk/types";
import { particleConfig } from "@/lib/chain/config";

// Verified against @particle-network/universal-account-sdk@2.0.3 installed
// types and compiled source:
//   new UniversalAccount({projectId, projectClientKey, projectAppUuid,
//     smartAccountOptions: {ownerAddress, useEIP7702}})
//   getPrimaryAssets() → {assets, totalAmountInUSD}
//   createTransferTransaction({token, amount, receiver}) → ITransaction
//   getEIP7702Auth(chainIds) → auth tuples to sign
//   sendTransaction(tx, rootHashSignature, authorizations?: {userOpHash, signature}[])
//
// ⚠ assertSupportedChain gates on MAINNETS ONLY (Solana, Ethereum, BSC, Base,
// XLayer, Arbitrum One). There is no testnet in the SDK. See AGENT_PROGRESS.md
// phase-3 finding before pointing this anywhere but production chains.

export type ChainBalance = {
  chain: string;
  value: number;
};

export type UnifiedBalance = {
  total: number;
  chains: ChainBalance[];
  tokens: string[];
};

// Plain literals rather than the SDK's CHAIN_ID enum: that enum is built by an
// obfuscated IIFE that comes back undefined once bundled, which threw
// "Cannot read properties of undefined (reading 'ETHEREUM_MAINNET')" at module
// scope in the browser. The numbers are chain ids and never change.
export const CHAIN_IDS = {
  ETHEREUM: 1,
  BSC: 56,
  BASE: 8453,
  ARBITRUM: 42161,
  XLAYER: 196,
  SOLANA: 101,
} as const;

const CHAIN_LABELS: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: "Ethereum",
  [CHAIN_IDS.BASE]: "Base",
  [CHAIN_IDS.ARBITRUM]: "Arbitrum",
  [CHAIN_IDS.BSC]: "BNB Chain",
  [CHAIN_IDS.XLAYER]: "X Layer",
  [CHAIN_IDS.SOLANA]: "Solana",
};

export function createUniversalAccount(ownerAddress: string): UniversalAccount {
  return new UniversalAccount({
    projectId: particleConfig.projectId,
    projectClientKey: particleConfig.clientKey,
    projectAppUuid: particleConfig.appUuid,
    smartAccountOptions: {
      name: "UNIVERSAL",
      version: "2.0.1",
      ownerAddress,
      useEIP7702: true,
    },
  });
}

/**
 * The balance seam (DATA_CONTRACTS §8): unified total plus per-chain rows,
 * aggregated across every chain the UA spans. Backs BalanceDisplay,
 * BalanceDiscovery, and the send max.
 */
export async function getUnifiedBalance(ua: UniversalAccount): Promise<UnifiedBalance> {
  const assets: IAssetsResponse = await ua.getPrimaryAssets();

  const byChain = new Map<number, number>();
  const tokens = new Set<string>();

  for (const asset of assets.assets) {
    if (asset.amountInUSD <= 0) continue;
    tokens.add(asset.tokenType.toUpperCase());
    for (const chainRow of asset.chainAggregation) {
      if (chainRow.amountInUSD <= 0) continue;
      const id = chainRow.token.chainId;
      byChain.set(id, (byChain.get(id) ?? 0) + chainRow.amountInUSD);
    }
  }

  return {
    total: assets.totalAmountInUSD,
    chains: [...byChain.entries()]
      .map(([id, value]) => ({ chain: CHAIN_LABELS[id] ?? `Chain ${id}`, value }))
      .sort((a, b) => b.value - a.value),
    tokens: [...tokens],
  };
}

/** USDC on Arbitrum One — FLOAT's settlement target for sends. */
const ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

/**
 * Build a cross-chain USDC transfer: sourced from whatever the sender holds
 * anywhere, delivered as USDC on Arbitrum to `receiver`. Amount in display
 * units ("50" = $50) — the SDK's ITransferTransaction takes decimal strings.
 */
export async function createUsdcTransfer(
  ua: UniversalAccount,
  receiver: string,
  amount: string
): Promise<ITransaction> {
  return ua.createTransferTransaction({
    token: { chainId: CHAIN_IDS.ARBITRUM, address: ARBITRUM_USDC },
    amount,
    receiver,
  });
}

/**
 * Magic {v,r,s} → the 65-byte hex signature Particle forwards as
 * eip7702AuthSignature. v is normalized to yParity (0/1) per EIP-7702.
 */
export function toParticleAuthorization(
  userOpHash: string,
  auth: Sign7702AuthorizationResponse
): EIP7702Authorization {
  const yParity = auth.v >= 27 ? auth.v - 27 : auth.v;
  const signature =
    auth.signature ??
    serializeSignature({
      r: auth.r as `0x${string}`,
      s: auth.s as `0x${string}`,
      yParity,
    });
  return { userOpHash, signature };
}

export { numberToHex };
export type { ITransaction, EIP7702Authorization };
