import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createIndexer } from "./core.js";

/**
 * Node entry, kept for local runs and gate proofs. Production is the
 * Cloudflare worker (src/worker.ts); both share the same engine and cursor,
 * so either can pick up where the other stopped.
 */

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env.local") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example`);
  return value;
}

const POLL_INTERVAL_MS = 8_000;

const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

const indexer = createIndexer({
  db: createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  }),
  readRpcUrl: process.env.ARBITRUM_ONE_RPC_URL ?? "https://arb1.arbitrum.io/rpc",
  logsRpcUrl: process.env.ARBITRUM_LOGS_RPC_URL ?? "https://arb1.arbitrum.io/rpc",
  leashAddress: required("NEXT_PUBLIC_LEASH_MANAGER_ADDRESS") as `0x${string}`,
  pledgeAddress: required("NEXT_PUBLIC_PLEDGE_VAULT_ADDRESS") as `0x${string}`,
  startBlock: BigInt(process.env.INDEXER_START_BLOCK ?? "0"),
  log,
});

async function main(): Promise<void> {
  log("float-indexer starting (node entry)");

  const first = await indexer.advance();
  log(`caught up to block ${first.cursor}`);

  // Polling rather than a websocket subscription: it survives RPC restarts
  // without extra reconnection logic, and the cursor makes it lossless.
  setInterval(() => {
    indexer.advance().catch((error) => console.error("poll failed", error));
  }, POLL_INTERVAL_MS);

  log("watching");
}

void main().catch((error) => {
  console.error("indexer failed to start", error);
  process.exit(1);
});
