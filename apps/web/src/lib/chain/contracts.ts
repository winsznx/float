"use client";

import { encodeFunctionData, parseUnits, decodeEventLog, type Abi } from "viem";
import {
  createUniversalAccount,
  CHAIN_IDS,
  type ITransaction,
} from "@/lib/chain/universal-account";
import { SUPPORTED_TOKEN_TYPE } from "@particle-network/universal-account-sdk";
import { contracts } from "@/lib/chain/config";

/**
 * Contract calls routed through the Universal Account.
 *
 * ⚠ These only work on mainnet. The UA SDK's assertSupportedChain rejects
 * every testnet outright — `createUniversalTransaction({chainId: 421614})`
 * throws "Chain 421614 is not supported". So LeashManager and PledgeVault
 * must be deployed on Arbitrum One for any of this to run; a Sepolia
 * deployment is unreachable from the UA by design.
 *
 * The upside is that the user still never picks a chain: the UA sources the
 * tokens the call needs from wherever they hold value, then executes on
 * Arbitrum.
 *
 * Note: the deployed LeashManager scopes by beneficiary, token, cap and
 * expiry. Per-contract allowlisting is captured in the database for the UI but
 * is not enforced on-chain, so don't present it as a chain-level guarantee.
 */

const ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDC_DECIMALS = 6;

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;

const LEASH_ABI = [
  {
    type: "function",
    name: "createLeash",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "token", type: "address" },
      { name: "spendLimit", type: "uint256" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ name: "leashId", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "spend",
    inputs: [
      { name: "leashId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revoke",
    inputs: [{ name: "leashId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "LeashCreated",
    inputs: [
      { name: "leashId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "spendLimit", type: "uint256", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
    ],
  },
] as const satisfies Abi;

const PLEDGE_ABI = [
  {
    type: "function",
    name: "createPledge",
    inputs: [
      { name: "witness", type: "address" },
      { name: "failureDestination", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [{ name: "pledgeId", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "confirmSuccess",
    inputs: [{ name: "pledgeId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "confirmFailure",
    inputs: [{ name: "pledgeId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;

export type SignFn = (params: {
  rootHash: string;
  authorizations: Array<{ chainId: number; nonce: number; address: string }>;
  userOpHashes: string[];
}) => Promise<{ rootSignature: string; authSignature: string }>;

/**
 * Builds, signs, and submits a universal transaction.
 *
 * Two signatures with different schemes, and they are NOT interchangeable:
 * the rootHash is signed as an EIP-191 personal message, the 7702
 * authorization tuple as a raw digest. Signing the rootHash raw returns AA24
 * from the bundler.
 */
async function execute(
  ownerAddress: string,
  calls: Array<{ to: string; data: string }>,
  expectUsd: string,
  sign: SignFn
): Promise<{ transactionId: string }> {
  const ua = createUniversalAccount(ownerAddress);

  const tx: ITransaction = await ua.createUniversalTransaction({
    chainId: CHAIN_IDS.ARBITRUM,
    expectTokens:
      expectUsd === "0"
        ? []
        : [{ type: SUPPORTED_TOKEN_TYPE.USDC, amount: expectUsd }],
    transactions: calls,
  });

  const authTuples = await ua.getEIP7702Auth([CHAIN_IDS.ARBITRUM]);
  const { rootSignature, authSignature } = await sign({
    rootHash: tx.rootHash,
    authorizations: authTuples,
    userOpHashes: tx.userOps.map((op) => op.userOpHash),
  });

  const result = await ua.sendTransaction(
    tx,
    rootSignature,
    tx.userOps.map((op) => ({ userOpHash: op.userOpHash, signature: authSignature }))
  );

  return { transactionId: result?.transactionId ?? tx.transactionId };
}

/**
 * Creates a leash on-chain. LeashManager pulls from the owner at spend time
 * rather than escrowing, so the owner keeps custody — but that means the ERC20
 * allowance has to cover the cap, which is why the approve is batched in.
 */
export async function createLeashOnChain(params: {
  ownerAddress: string;
  beneficiaryAddress: string;
  spendLimitUsd: number;
  expiryUnix: number;
  sign: SignFn;
}): Promise<{ transactionId: string }> {
  const limit = parseUnits(String(params.spendLimitUsd), USDC_DECIMALS);

  return execute(
    params.ownerAddress,
    [
      {
        to: ARBITRUM_USDC,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [contracts.leashManager, limit],
        }),
      },
      {
        to: contracts.leashManager,
        data: encodeFunctionData({
          abi: LEASH_ABI,
          functionName: "createLeash",
          args: [
            params.beneficiaryAddress as `0x${string}`,
            ARBITRUM_USDC,
            limit,
            BigInt(params.expiryUnix),
          ],
        }),
      },
    ],
    "0",
    params.sign
  );
}

export async function revokeLeashOnChain(params: {
  ownerAddress: string;
  leashId: string;
  sign: SignFn;
}): Promise<{ transactionId: string }> {
  return execute(
    params.ownerAddress,
    [
      {
        to: contracts.leashManager,
        data: encodeFunctionData({
          abi: LEASH_ABI,
          functionName: "revoke",
          args: [params.leashId as `0x${string}`],
        }),
      },
    ],
    "0",
    params.sign
  );
}

/**
 * Spends against a leash.
 *
 * Beneficiary-only — the contract reverts NotBeneficiary for anyone else, so
 * this must be signed by the wallet the leash was granted to, not the owner.
 * Funds move from the owner directly to `to`; the leash never custodies.
 */
export async function spendLeashOnChain(params: {
  beneficiaryAddress: string;
  leashId: string;
  amountUsd: number;
  to: string;
  sign: SignFn;
}): Promise<{ transactionId: string }> {
  return execute(
    params.beneficiaryAddress,
    [
      {
        to: contracts.leashManager,
        data: encodeFunctionData({
          abi: LEASH_ABI,
          functionName: "spend",
          args: [
            params.leashId as `0x${string}`,
            parseUnits(String(params.amountUsd), USDC_DECIMALS),
            params.to as `0x${string}`,
          ],
        }),
      },
    ],
    "0",
    params.sign
  );
}

/**
 * Locks a pledge stake. PledgeVault escrows, so the stake is pulled in at
 * creation — the approve and the createPledge go in one batch, and expectTokens
 * makes the UA source the USDC from whatever chain the user holds it on.
 */
export async function createPledgeOnChain(params: {
  ownerAddress: string;
  witnessAddress: string;
  failureDestination: string;
  stakeUsd: number;
  deadlineUnix: number;
  sign: SignFn;
}): Promise<{ transactionId: string }> {
  const stake = parseUnits(String(params.stakeUsd), USDC_DECIMALS);

  return execute(
    params.ownerAddress,
    [
      {
        to: ARBITRUM_USDC,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [contracts.pledgeVault, stake],
        }),
      },
      {
        to: contracts.pledgeVault,
        data: encodeFunctionData({
          abi: PLEDGE_ABI,
          functionName: "createPledge",
          args: [
            params.witnessAddress as `0x${string}`,
            params.failureDestination as `0x${string}`,
            ARBITRUM_USDC,
            stake,
            BigInt(params.deadlineUnix),
          ],
        }),
      },
    ],
    String(params.stakeUsd),
    params.sign
  );
}

/** The witness verdict — the only path that can move an escrowed stake. */
export async function resolvePledgeOnChain(params: {
  witnessOwnerAddress: string;
  pledgeId: string;
  succeeded: boolean;
  sign: SignFn;
}): Promise<{ transactionId: string }> {
  return execute(
    params.witnessOwnerAddress,
    [
      {
        to: contracts.pledgeVault,
        data: encodeFunctionData({
          abi: PLEDGE_ABI,
          functionName: params.succeeded ? "confirmSuccess" : "confirmFailure",
          args: [params.pledgeId as `0x${string}`],
        }),
      },
    ],
    "0",
    params.sign
  );
}

/** Pulls the leashId out of the LeashCreated event in a receipt. */
export function decodeLeashId(logs: Array<{ topics: string[]; data: string }>): string | null {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: LEASH_ABI,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        data: log.data as `0x${string}`,
      });
      if (decoded.eventName === "LeashCreated") {
        return (decoded.args as { leashId: string }).leashId;
      }
    } catch {
      // Not one of ours — keep scanning the rest of the receipt.
    }
  }
  return null;
}

export { LEASH_ABI, PLEDGE_ABI, ARBITRUM_USDC };
