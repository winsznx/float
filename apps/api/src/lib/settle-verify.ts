import { createPublicClient, http, parseAbiItem, getAddress, type Address } from "viem";
import { env } from "./env.js";

/**
 * Server-side corroboration for split settlements.
 *
 * The client can only report Particle's routing transactionId, which is not a
 * chain hash and cannot be looked up on any RPC. What the chain CAN prove is
 * the outcome: a USDC Transfer to the organizer for at least the share. The
 * settle route sweeps recent Transfer logs on every chain FLOAT delivers to
 * and records the hash it finds — never the identifier the client claims.
 *
 * Known limits, stated rather than hidden: the sweep window is ~30 minutes,
 * so an unrelated payment of the same amount to the organizer inside that
 * window could corroborate a share. Each found hash is single-use per split
 * (the caller passes already-recorded hashes to exclude), which stops one
 * payment settling two shares.
 */

const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

const USDC_DECIMALS = 1_000_000n;

/**
 * Native USDC per deliverable chain — mirror of USDC_BY_CHAIN in
 * apps/web/src/lib/chain/universal-account.ts. Keep the two in sync; a wrong
 * address here silently makes every settlement unverifiable.
 *
 * Sweep windows are ~30 minutes expressed in each chain's block time
 * (Arbitrum ~0.25s, Base ~2s, Ethereum ~12s), sized under public-RPC
 * getLogs range caps.
 */
const SWEEP_TARGETS: Array<{
  chainId: number;
  usdc: Address;
  rpcUrl: () => string;
  blocks: bigint;
}> = [
  {
    chainId: 42161,
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    rpcUrl: () => env.arbitrumLogsRpcUrl,
    blocks: 7_200n,
  },
  {
    chainId: 8453,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpcUrl: () => env.baseLogsRpcUrl,
    blocks: 900n,
  },
  {
    chainId: 1,
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    rpcUrl: () => env.ethereumLogsRpcUrl,
    blocks: 150n,
  },
];

export interface SettleProof {
  txHash: string;
  chainId: number;
}

/**
 * Finds a USDC transfer to the organizer worth at least the share, preferring
 * an exact-amount match so one larger unrelated payment doesn't corroborate a
 * smaller share when both sit in the window. Returns null when no chain has
 * seen the money — the caller must not record a settlement.
 *
 * One chain's RPC failing must not veto another chain's proof, so sweeps run
 * in parallel and a rejection is treated as "no proof from that chain".
 */
export async function findSettleTransfer(params: {
  organizer: Address;
  amountUsd: number;
  excludeTxHashes: Set<string>;
}): Promise<SettleProof | null> {
  const organizer = getAddress(params.organizer);
  const value = (BigInt(Math.round(params.amountUsd * 100)) * USDC_DECIMALS) / 100n;

  const sweeps = SWEEP_TARGETS.map(async (target): Promise<SettleProof | null> => {
    const client = createPublicClient({ transport: http(target.rpcUrl()) });
    const head = await client.getBlockNumber();
    const fromBlock = head > target.blocks ? head - target.blocks : 0n;
    const logs = await client.getLogs({
      address: target.usdc,
      event: TRANSFER,
      args: { to: organizer },
      fromBlock,
      toBlock: head,
    });

    const usable = logs.filter(
      (log) =>
        (log.args.value ?? 0n) >= value &&
        !params.excludeTxHashes.has(log.transactionHash.toLowerCase())
    );
    const exact = usable.find((log) => log.args.value === value);
    const match = exact ?? usable[0];
    return match
      ? { txHash: match.transactionHash.toLowerCase(), chainId: target.chainId }
      : null;
  });

  for (const result of await Promise.allSettled(sweeps)) {
    if (result.status === "fulfilled" && result.value) return result.value;
  }
  return null;
}
