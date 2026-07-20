import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { resolveIdentity } from "../lib/identity.js";
import { serviceDb, type Db } from "../lib/supabase.js";
import { fetchSendStatus } from "../lib/transaction-status.js";
import type { Database } from "@float/db";
import { notifyClaim } from "../lib/notify.js";
import { getErrorMessage } from "../lib/errors.js";
import { randomBytes } from "node:crypto";

// Chains the Universal Account routes. The client reports which of these a
// transfer actually used; anything else is a client that has drifted from the
// SDK's supported set and must not be written to the ledger.
const SUPPORTED_CHAIN_IDS: number[] = [1, 56, 196, 8453, 42161];

const chainId = z
  .number()
  .int()
  .refine((id) => SUPPORTED_CHAIN_IDS.includes(id), { message: "Unsupported chain id." });

/** Rows reconciled per list call. Bounded so history stays a cheap read. */
const RECONCILE_LIMIT = 10;

type SendRow = Database["public"]["Tables"]["sends"]["Row"];

/**
 * Resolves sends that are still in flight against Particle, then returns the
 * rows as they now stand.
 *
 * Nothing else does this. `create` writes `submitted` and the indexer — which
 * only watches LeashManager and PledgeVault — never touches the sends table, so
 * before this every send stayed `submitted` forever while the history rendered
 * a `confirmed` state that was unreachable.
 *
 * Failures are swallowed per row on purpose: a Particle outage should degrade
 * this to "status not updated yet", never take down the history list.
 */
async function reconcileSubmitted(
  db: Db,
  userId: string,
  ownerAddress: string | null,
  rows: SendRow[]
): Promise<SendRow[]> {
  if (!ownerAddress) return rows;

  const pending = rows
    .flatMap((row) =>
      row.status === "submitted" && row.tx_hash
        ? [{ id: row.id, txHash: row.tx_hash }]
        : []
    )
    .slice(0, RECONCILE_LIMIT);
  if (pending.length === 0) return rows;

  const resolved = await Promise.all(
    pending.map(async ({ id, txHash }) => {
      try {
        const status = await fetchSendStatus(ownerAddress, txHash);
        return status && status !== "submitted" ? { id, status } : null;
      } catch (caught) {
        console.error("send status refresh failed", id, getErrorMessage(caught));
        return null;
      }
    })
  );

  const changes = resolved.filter((change) => change !== null);
  if (changes.length === 0) return rows;

  await Promise.all(
    changes.map(({ id, status }) =>
      db.from("sends").update({ status }).eq("id", id).eq("sender_id", userId)
    )
  );

  const byId = new Map(changes.map((change) => [change.id, change.status]));
  return rows.map((row) => {
    const status = byId.get(row.id);
    return status ? { ...row, status } : row;
  });
}

export const sendRouter = router({
  /**
   * Records a send.
   *
   * The chain transaction is signed in the browser (the UA owner key never
   * leaves the client), so the client submits and reports back the hash. The
   * row is written pending and the indexer confirms it — the API never claims
   * a transfer settled on the client's say-so.
   */
  create: protectedProcedure
    .input(
      z.object({
        recipient: z.string().min(1),
        amount: z.number().positive().max(1_000_000),
        note: z.string().max(140).optional(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
        sourceChainId: chainId.optional(),
        destChainId: chainId.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const resolution = await resolveIdentity(input.recipient);

      // A recipient with no address yet needs an unguessable claim token.
      // sends.claim_token is nullable with no default, so it has to be minted
      // here — without it the claim email links nowhere.
      const needsClaim = !resolution.resolvedAddress;
      const claimToken = needsClaim ? randomBytes(16).toString("hex") : null;

      // Link the recipient's FLOAT account when the address belongs to one.
      // This was never set, so recipient_user_id was always null: a send to an
      // existing user produced no "received" activity and no notification, and
      // the money arrived with nothing in the app to show for it. Keyed on the
      // resolved address so it works for every recipient type, not just handles.
      const recipientUserId = resolution.resolvedAddress
        ? (
            await serviceDb()
              .from("users")
              .select("id")
              .eq("address", resolution.resolvedAddress.toLowerCase())
              .maybeSingle()
          ).data?.id ?? null
        : null;

      const { data, error } = await ctx.db
        .from("sends")
        .insert({
          sender_id: ctx.userId,
          recipient_user_id: recipientUserId,
          recipient_address: resolution.resolvedAddress?.toLowerCase() ?? null,
          recipient_input: resolution.input,
          recipient_type: resolution.type,
          amount: input.amount,
          token: "USDC",
          // Both come from the route the client actually built and submitted,
          // reported back off ITransaction.tokenChanges. dest_chain_id used to
          // be derived here from resolution.preferredChain — a preference the
          // transfer never honoured — so every row claimed a destination the
          // money had not gone to. A send with no transfer (claim link) has no
          // chains, and null is the honest value for that.
          source_chain_id: input.sourceChainId ?? null,
          dest_chain_id: input.destChainId ?? null,
          // Schema allows pending|submitted|confirmed|failed. A row without a
          // hash is still pending; only the indexer moves it to confirmed.
          status: input.txHash ? "submitted" : "pending",
          tx_hash: input.txHash ?? null,
          note: input.note ?? null,
          claim_token: claimToken,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }

      // Activity is service-written: RLS denies user inserts so the feed cannot
      // be forged.
      const { error: activityError } = await serviceDb().from("activity").insert({
        user_id: ctx.userId,
        type: "send_sent",
        ref_type: "send",
        ref_id: data.id,
      });
      if (activityError) {
        // The feed is the only record that this happened; a silent failure here
        // is how a write disappears from the home screen.
        console.error("activity insert failed", activityError.message);
      }

      // The recipient's side of the same event. Without it a FLOAT user could
      // receive money and see nothing at all in the app — the send_received
      // label existed in the feed's copy but nothing ever wrote the row.
      if (recipientUserId) {
        const { error: receivedError } = await serviceDb().from("activity").insert({
          user_id: recipientUserId,
          type: "send_received",
          ref_type: "send",
          ref_id: data.id,
        });
        if (receivedError) {
          console.error("recipient activity insert failed", receivedError.message);
        }
      }

      // A recipient with no FLOAT account gets a claim link rather than funds
      // landing somewhere they cannot reach.
      if (needsClaim && resolution.type === "email" && claimToken) {
        try {
          await notifyClaim({
            email: resolution.input,
            amount: input.amount,
            claimToken,
          });
        } catch (notifyError) {
          // The send is already persisted; a mail failure must not roll it back.
          console.error("claim email failed", getErrorMessage(notifyError));
        }
      }

      return data;
    }),

  /** Attaches the on-chain hash once the client has submitted. */
  attachTxHash: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]+$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("sends")
        .update({ tx_hash: input.txHash, status: "submitted" })
        .eq("id", input.id)
        .eq("sender_id", ctx.userId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      return data;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("sends")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

    return reconcileSubmitted(ctx.db, ctx.userId, ctx.address, data);
  }),
});
