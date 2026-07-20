import {
  UniversalAccount,
  type EIP7702Authorization,
  type IAssetsResponse,
  type ITokenChanges,
  type ITransaction,
  type ITransactionFees,
} from "@particle-network/universal-account-sdk";
import { serializeSignature, numberToHex } from "viem";
import type { Sign7702AuthorizationResponse } from "@magic-sdk/types";
import { particleConfig, particleRpcUrl } from "@/lib/chain/config";

// Verified against @particle-network/universal-account-sdk@2.0.3 installed
// types and compiled source:
//   new UniversalAccount({projectId, projectClientKey, projectAppUuid,
//     smartAccountOptions: {ownerAddress, useEIP7702}})
//   getPrimaryAssets() → {assets, totalAmountInUSD}
//   createTransferTransaction({token, amount, receiver}) → ITransaction
//     ⚠ `token` is the DESTINATION — the chain and contract the receiver ends
//     up holding. Liquidity is sourced from the unified balance regardless.
//     Hardcoding it to Arbitrum is what made every "to Base" send land on
//     Arbitrum; ITransaction.tokenChanges.{fromChains,toChains} is the quote's
//     own account of what the route does.
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
    rpcUrl: particleRpcUrl(),
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

/**
 * Native USDC per chain. ITransferTransaction.token names what the *receiver*
 * gets, so this map is the set of chains FLOAT can deliver to — a chain absent
 * here cannot be a destination no matter what the recipient prefers.
 *
 * Deliberately narrower than CHAIN_IDS: Particle also routes BNB Chain, X Layer
 * and Solana, but their USDC is a bridged or non-EVM representation and naming
 * the wrong contract would send real money to an address that isn't USDC.
 */
const USDC_BY_CHAIN: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [CHAIN_IDS.BASE]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [CHAIN_IDS.ARBITRUM]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

/** Where a transfer lands when the recipient prefers a chain FLOAT can't deliver to. */
export const DEFAULT_DEST_CHAIN_ID: number = CHAIN_IDS.ARBITRUM;

const CHAIN_IDS_BY_LABEL: Record<string, number> = Object.fromEntries(
  Object.entries(CHAIN_LABELS).map(([id, label]) => [label, Number(id)])
);

export type DestinationChain = {
  id: number;
  label: string;
};

/**
 * Resolves a recipient's preferred chain label into the chain the transfer will
 * actually settle on.
 *
 * The confirmation card and the transaction builder both read this, and that is
 * the point: they used to decide separately, so the UI could promise "Arbitrum
 * to Base" while createTransferTransaction was hardcoded to Arbitrum and the
 * money landed there. One resolver means the label cannot drift from the money
 * again.
 */
/** Display name for a chain id the SDK reported. */
export function chainLabelFor(id: number): string {
  return CHAIN_LABELS[id] ?? `Chain ${id}`;
}

export function destinationChainFor(preferredChain?: string | null): DestinationChain {
  const preferredId = preferredChain ? CHAIN_IDS_BY_LABEL[preferredChain] : undefined;
  const id =
    preferredId !== undefined && preferredId in USDC_BY_CHAIN
      ? preferredId
      : DEFAULT_DEST_CHAIN_ID;
  return { id, label: CHAIN_LABELS[id] };
}

/**
 * Build a cross-chain USDC transfer: sourced from whatever the sender holds
 * anywhere, delivered as USDC on `destinationChainId` to `receiver`. Amount in
 * display units ("50" = $50) — the SDK's ITransferTransaction takes decimal
 * strings.
 */
export async function createUsdcTransfer(
  ua: UniversalAccount,
  receiver: string,
  amount: string,
  destinationChainId: number = DEFAULT_DEST_CHAIN_ID
): Promise<ITransaction> {
  const address = USDC_BY_CHAIN[destinationChainId];
  if (!address) {
    throw new Error(
      `FLOAT cannot deliver USDC on chain ${destinationChainId}. Use destinationChainFor().`
    );
  }
  return ua.createTransferTransaction({
    token: { chainId: destinationChainId, address },
    amount,
    receiver,
  });
}

export type TransferQuote = {
  /** Particle's answer, not ours: does this route charge the sender for gas? */
  gasSponsored: boolean;
  /** Total quoted route cost in USD — gas, service and LP fees together. */
  totalFeeUsd: number;
};

/**
 * The cost of a built transfer, read off the quote Particle returned.
 *
 * The confirmation card used to print "Gas: $0.00 (sponsored)" as a literal on
 * the last screen before irreversible movement. Sponsorship is a property of
 * the route, and the route says so itself — `freeGasFee` is the field that
 * decides it.
 */
export function quoteOf(tx: ITransaction): TransferQuote {
  const fees: ITransactionFees | undefined = tx.transactionFees;
  const changes: ITokenChanges | undefined = tx.tokenChanges;
  const total = Number(changes?.totalFeeInUSD ?? 0);
  return {
    gasSponsored: fees?.freeGasFee ?? false,
    totalFeeUsd: Number.isFinite(total) ? total : 0,
  };
}

export type ExecutedChains = {
  /** Null when the route draws on more than one chain: the column holds one id. */
  sourceChainId: number | null;
  destChainId: number | null;
};

/**
 * What the built transaction actually moves, per Particle's own quote, rather
 * than what we asked for. This is what gets persisted — a route that settles
 * somewhere other than requested should be recorded as it happened.
 */
export function executedChains(tx: ITransaction): ExecutedChains {
  const changes: ITokenChanges | undefined = tx.tokenChanges;
  if (!changes) return { sourceChainId: null, destChainId: null };

  const from = changes.fromChains ?? [];
  const to = changes.toChains ?? [];
  return {
    sourceChainId: from.length === 1 ? from[0] : null,
    destChainId: to.length > 0 ? to[0] : null,
  };
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
