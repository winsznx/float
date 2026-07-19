import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { resolveIdentity } from "../lib/identity.js";
import { serviceDb } from "../lib/supabase.js";
import { notifyClaim } from "../lib/notify.js";
import { getErrorMessage } from "../lib/errors.js";

const ARBITRUM_ONE = 42161;
// Resolution returns display labels; the schema stores numeric chain ids.
const CHAIN_IDS: Record<string, number> = {
  Ethereum: 1,
  "BNB Chain": 56,
  Base: 8453,
  Arbitrum: ARBITRUM_ONE,
  "X Layer": 196,
};

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
        sourceChainId: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const resolution = await resolveIdentity(input.recipient);

      const { data, error } = await ctx.db
        .from("sends")
        .insert({
          sender_id: ctx.userId,
          recipient_address: resolution.resolvedAddress?.toLowerCase() ?? null,
          recipient_input: resolution.input,
          recipient_type: resolution.type,
          amount: input.amount,
          token: "USDC",
          source_chain_id: input.sourceChainId ?? null,
          dest_chain_id: CHAIN_IDS[resolution.preferredChain] ?? ARBITRUM_ONE,
          // Schema allows pending|submitted|confirmed|failed. A row without a
          // hash is still pending; only the indexer moves it to confirmed.
          status: input.txHash ? "submitted" : "pending",
          tx_hash: input.txHash ?? null,
          note: input.note ?? null,
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

      // A recipient with no FLOAT account gets a claim link rather than funds
      // landing somewhere they cannot reach.
      if (resolution.isNewUser && resolution.type === "email") {
        try {
          await notifyClaim({
            email: resolution.input,
            amount: input.amount,
            sendId: data.id,
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
    return data;
  }),
});
