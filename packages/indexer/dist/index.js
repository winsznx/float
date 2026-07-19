import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LEASH_EVENTS, PLEDGE_EVENTS } from "./abi.js";
import { onLeashCreated, onLeashSpent, onLeashRevoked, onPledgeCreated, onPledgeSucceeded, onPledgeFailed, onPledgeExpiredSlashed, } from "./handlers.js";
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env.local") });
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`${name} is not set — see .env.example`);
    return value;
}
// Two transports on purpose. Alchemy is fast and reliable for reads, but its
// free tier caps eth_getLogs at a 10-block range — too small even for routine
// polling, since Arbitrum produces ~4 blocks a second. Arbitrum's public RPC
// serves 10k-block log ranges, so log scanning goes there and everything else
// stays on Alchemy.
const READ_RPC = process.env.ARBITRUM_ONE_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
const LOGS_RPC = process.env.ARBITRUM_LOGS_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
const LEASH_ADDRESS = required("NEXT_PUBLIC_LEASH_MANAGER_ADDRESS");
const PLEDGE_ADDRESS = required("NEXT_PUBLIC_PLEDGE_VAULT_ADDRESS");
const START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK ?? "0");
// Verified against the public RPC: 10k-block ranges are accepted.
const BACKFILL_CHUNK = 9000n;
const POLL_INTERVAL_MS = 8_000;
// Arbitrum reorgs are shallow, but re-scanning a few blocks each pass costs
// almost nothing and the handlers are idempotent anyway.
const REORG_BUFFER = 5n;
const db = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { autoRefreshToken: false, persistSession: false } });
const client = createPublicClient({ chain: arbitrum, transport: http(READ_RPC) });
const logsClient = createPublicClient({ chain: arbitrum, transport: http(LOGS_RPC) });
const log = (...args) => console.log(new Date().toISOString(), ...args);
/**
 * Cursor persistence. Without this a restart would either re-scan from the
 * deployment block every time or, worse, skip everything that happened while
 * the worker was down.
 */
async function readCursor() {
    const { data } = await db
        .from("indexer_state")
        .select("last_block")
        .eq("id", "arbitrum")
        .maybeSingle();
    return data?.last_block ? BigInt(data.last_block) : START_BLOCK;
}
async function writeCursor(block) {
    await db
        .from("indexer_state")
        .upsert({ id: "arbitrum", last_block: Number(block), updated_at: new Date().toISOString() });
}
async function dispatch(entry) {
    if (!entry.eventName || !entry.args || !entry.transactionHash)
        return;
    const ctx = {
        db,
        txHash: entry.transactionHash,
        logIndex: entry.logIndex ?? 0,
        blockNumber: entry.blockNumber ?? 0n,
    };
    const args = entry.args;
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
async function scan(fromBlock, toBlock) {
    const [leashLogs, pledgeLogs] = await Promise.all([
        logsClient.getLogs({ address: LEASH_ADDRESS, events: LEASH_EVENTS, fromBlock, toBlock }),
        logsClient.getLogs({ address: PLEDGE_ADDRESS, events: PLEDGE_EVENTS, fromBlock, toBlock }),
    ]);
    const all = [...leashLogs, ...pledgeLogs].sort((a, b) => {
        const blockDiff = Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n));
        return blockDiff !== 0 ? blockDiff : (a.logIndex ?? 0) - (b.logIndex ?? 0);
    });
    for (const entry of all) {
        try {
            await dispatch(entry);
        }
        catch (error) {
            // One bad event must not stall the cursor for everything behind it.
            console.error("handler failed", entry.eventName, error);
        }
    }
    return all.length;
}
/**
 * Catches up from the stored cursor to the chain head in bounded chunks. Runs
 * on every start, so a worker that was down for a day recovers the gap rather
 * than silently missing it.
 */
async function backfill() {
    let cursor = await readCursor();
    const head = await client.getBlockNumber();
    if (cursor >= head)
        return cursor;
    log(`backfill ${cursor} → ${head} (${head - cursor} blocks)`);
    let total = 0;
    while (cursor < head) {
        const to = cursor + BACKFILL_CHUNK > head ? head : cursor + BACKFILL_CHUNK;
        total += await scan(cursor + 1n, to);
        cursor = to;
        await writeCursor(cursor);
    }
    log(`backfill complete, ${total} events applied`);
    return cursor;
}
async function main() {
    log("float-indexer starting");
    log(`  chain:        Arbitrum One (${arbitrum.id})`);
    log(`  LeashManager: ${LEASH_ADDRESS}`);
    log(`  PledgeVault:  ${PLEDGE_ADDRESS}`);
    let cursor = await backfill();
    // Polling rather than a websocket subscription: it survives RPC restarts
    // without extra reconnection logic, and the cursor makes it lossless.
    const tick = async () => {
        try {
            const head = await client.getBlockNumber();
            const from = cursor > REORG_BUFFER ? cursor - REORG_BUFFER : 0n;
            if (head > cursor) {
                const count = await scan(from + 1n, head);
                if (count > 0)
                    log(`applied ${count} event(s) through block ${head}`);
                cursor = head;
                await writeCursor(cursor);
            }
        }
        catch (error) {
            console.error("poll failed", error);
        }
    };
    setInterval(() => void tick(), POLL_INTERVAL_MS);
    await tick();
    log(`watching from block ${cursor}`);
}
void main().catch((error) => {
    console.error("indexer failed to start", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map