import { createPublicClient, http, type Log } from "viem";
import { arbitrum } from "viem/chains";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LEASH_EVENTS, PLEDGE_EVENTS } from "./abi.js";
import {
  onLeashCreated,
  onLeashSpent,
  onLeashRevoked,
  onPledgeCreated,
  onPledgeSucceeded,
  onPledgeFailed,
  onPledgeExpiredSlashed,
  type EventContext,
} from "./handlers.js";

/**
 * The scan engine, shared by the node entry (local runs, proofs) and the
 * Cloudflare worker (production). Stateless between calls on purpose: the
 * cursor lives in indexer_state, so any runtime can pick up exactly where the
 * last one stopped — a cold start is just a backfill from the cursor, the
 * same mechanism as recovering from downtime.
 */

// Verified against the public RPC: 10k-block ranges are accepted.
const BACKFILL_CHUNK = 9_000n;
// Arbitrum reorgs are shallow, but re-scanning a few blocks each pass costs
// almost nothing and the handlers are idempotent anyway.
const REORG_BUFFER = 5n;

export type IndexerConfig = {
  db: SupabaseClient;
  readRpcUrl: string;
  logsRpcUrl: string;
  leashAddress: `0x${string}`;
  pledgeAddress: `0x${string}`;
  startBlock: bigint;
  log?: (...args: unknown[]) => void;
};

type DecodedLog = Log & { eventName?: string; args?: Record<string, unknown> };

export type AdvanceResult = {
  fromBlock: bigint;
  cursor: bigint;
  head: bigint;
  events: number;
  caughtUp: boolean;
};

export function createIndexer(config: IndexerConfig) {
  const log = config.log ?? ((...args: unknown[]) => console.log(new Date().toISOString(), ...args));
  const client = createPublicClient({ chain: arbitrum, transport: http(config.readRpcUrl) });
  const logsClient = createPublicClient({ chain: arbitrum, transport: http(config.logsRpcUrl) });

  async function readCursor(): Promise<bigint> {
    const { data } = await config.db
      .from("indexer_state")
      .select("last_block")
      .eq("id", "arbitrum")
      .maybeSingle();
    return data?.last_block ? BigInt(data.last_block) : config.startBlock;
  }

  async function writeCursor(block: bigint): Promise<void> {
    await config.db
      .from("indexer_state")
      .upsert({ id: "arbitrum", last_block: Number(block), updated_at: new Date().toISOString() });
  }

  async function dispatch(entry: DecodedLog): Promise<void> {
    if (!entry.eventName || !entry.args || !entry.transactionHash) return;

    const ctx: EventContext = {
      db: config.db,
      txHash: entry.transactionHash,
      logIndex: entry.logIndex ?? 0,
      blockNumber: entry.blockNumber ?? 0n,
    };

    const args = entry.args as never;
    switch (entry.eventName) {
      case "LeashCreated":
        return onLeashCreated(ctx, args);
      case "LeashSpent":
        return onLeashSpent(ctx, args);
      case "LeashRevoked":
        return onLeashRevoked(ctx, args);
      case "PledgeCreated":
        return onPledgeCreated(ctx, args);
      case "PledgeSucceeded":
        return onPledgeSucceeded(ctx, args);
      case "PledgeFailed":
        return onPledgeFailed(ctx, args);
      case "PledgeExpiredSlashed":
        return onPledgeExpiredSlashed(ctx, args);
      default:
        return;
    }
  }

  /** Scans a block range for both contracts and applies every event in order. */
  async function scan(fromBlock: bigint, toBlock: bigint): Promise<number> {
    const [leashLogs, pledgeLogs] = await Promise.all([
      logsClient.getLogs({ address: config.leashAddress, events: LEASH_EVENTS, fromBlock, toBlock }),
      logsClient.getLogs({ address: config.pledgeAddress, events: PLEDGE_EVENTS, fromBlock, toBlock }),
    ]);

    const all = [...leashLogs, ...pledgeLogs].sort((a, b) => {
      const blockDiff = Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n));
      return blockDiff !== 0 ? blockDiff : (a.logIndex ?? 0) - (b.logIndex ?? 0);
    });

    for (const entry of all) {
      try {
        await dispatch(entry as DecodedLog);
      } catch (error) {
        // One bad event must not stall the cursor for everything behind it.
        console.error("handler failed", (entry as DecodedLog).eventName, error);
      }
    }

    return all.length;
  }

  /**
   * Advances the cursor toward the chain head in bounded chunks.
   *
   * maxChunks caps the work of one invocation: Workers invocations carry
   * subrequest and CPU budgets, so a deep catch-up spreads across successive
   * alarms instead of one giant run. With no cap it runs to the head — the
   * node entry uses that for one-shot backfills.
   */
  async function advance(maxChunks = Number.POSITIVE_INFINITY): Promise<AdvanceResult> {
    const stored = await readCursor();
    const head = await client.getBlockNumber();
    const fromBlock = stored > REORG_BUFFER ? stored - REORG_BUFFER : 0n;

    let cursor = fromBlock;
    let events = 0;
    let chunks = 0;

    while (cursor < head && chunks < maxChunks) {
      const to = cursor + BACKFILL_CHUNK > head ? head : cursor + BACKFILL_CHUNK;
      events += await scan(cursor + 1n, to);
      cursor = to;
      chunks += 1;
      if (cursor > stored) await writeCursor(cursor);
    }

    if (events > 0) log(`applied ${events} event(s) through block ${cursor}`);
    return { fromBlock, cursor, head, events, caughtUp: cursor >= head };
  }

  return { advance, readCursor };
}
