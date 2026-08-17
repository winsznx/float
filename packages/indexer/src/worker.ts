import { DurableObject } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";
import { createIndexer } from "./core.js";

/**
 * The indexer on Cloudflare: a Durable Object alarm every ~10s as the
 * metronome, with a 1-minute cron as the watchdog that re-arms it after a
 * deploy or an alarm-chain break. A cron alone would do, but a 60s floor
 * would make the realtime surfaces (leash usage, pledge resolution) feel
 * dead next to the old 8s poll.
 *
 * The DO holds no indexing state — the cursor stays in indexer_state, so this
 * object can be deleted and recreated freely, and a cold start is just the
 * standard backfill-from-cursor path (the exact mechanism proven live
 * on a 1.47M-block gap).
 */

const TICK_MS = 10_000;
// 6 chunks × 9k blocks per tick keeps one invocation inside the free plan's
// 50-external-subrequest budget with room for handler DB writes; a deep
// catch-up spreads across successive alarms at ~54k blocks per tick.
const MAX_CHUNKS_PER_TICK = 6;

type Env = {
  INDEXER_LOOP: DurableObjectNamespace<IndexerLoop>;
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_LEASH_MANAGER_ADDRESS: string;
  NEXT_PUBLIC_PLEDGE_VAULT_ADDRESS: string;
  ARBITRUM_ONE_RPC_URL?: string;
  ARBITRUM_LOGS_RPC_URL?: string;
  INDEXER_START_BLOCK?: string;
};

function indexerFor(env: Env) {
  return createIndexer({
    db: createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    readRpcUrl: env.ARBITRUM_ONE_RPC_URL ?? "https://arb1.arbitrum.io/rpc",
    logsRpcUrl: env.ARBITRUM_LOGS_RPC_URL ?? "https://arb1.arbitrum.io/rpc",
    leashAddress: env.NEXT_PUBLIC_LEASH_MANAGER_ADDRESS as `0x${string}`,
    pledgeAddress: env.NEXT_PUBLIC_PLEDGE_VAULT_ADDRESS as `0x${string}`,
    startBlock: BigInt(env.INDEXER_START_BLOCK ?? "0"),
  });
}

export class IndexerLoop extends DurableObject<Env> {
  async ensureRunning(): Promise<void> {
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now());
    }
  }

  async alarm(): Promise<void> {
    try {
      await indexerFor(this.env).advance(MAX_CHUNKS_PER_TICK);
    } catch (error) {
      // The next tick retries; the cursor makes a failed pass lossless.
      console.error("indexer tick failed", error);
    } finally {
      await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
    }
  }

  async status(): Promise<{ cursor: string; head: string; lag: string }> {
    const indexer = indexerFor(this.env);
    const cursor = await indexer.readCursor();
    const result = await indexer.advance(0);
    return {
      cursor: cursor.toString(),
      head: result.head.toString(),
      lag: (result.head - cursor).toString(),
    };
  }
}

function loop(env: Env) {
  return env.INDEXER_LOOP.get(env.INDEXER_LOOP.idFromName("arbitrum"));
}

export default {
  /** Ops surface: cursor lag at a glance, and a manual kick. */
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      await loop(env).ensureRunning();
      return Response.json({ ok: true, service: "float-indexer", ...(await loop(env).status()) });
    }
    return new Response("float-indexer", { status: 200 });
  },

  /** Watchdog: re-arms the alarm chain if a deploy or error dropped it. */
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await loop(env).ensureRunning();
  },
};
