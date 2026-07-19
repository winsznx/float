import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import { resolveIdentity } from "../lib/identity.js";
import { serviceDb } from "../lib/supabase.js";
import { notifyWitness } from "../lib/notify.js";
import { endOfDayUnix } from "../lib/time.js";
import { FAILURE_DESTINATIONS, resolveDestination } from "../lib/destinations.js";
import { env } from "../lib/env.js";
import { getErrorMessage } from "../lib/errors.js";

export const pledgeRouter = router({
  /** Curated failure destinations, with the addresses the contract will use. */
  destinations: publicProcedure.query(() => FAILURE_DESTINATIONS),

  create: protectedProcedure
    .input(
      z.object({
        goal: z.string().min(1).max(200),
        stakeAmount: z.number().positive(),
        witness: z.string().min(1),
        destinationId: z.string().min(1),
        customAddress: z
          .string()
          .regex(/^0x[a-fA-F0-9]{40}$/)
          .optional(),
        deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timezone: z.string().default("UTC"),
        isPublic: z.boolean().default(false),
        onchainPledgeId: z.string().optional(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const destination = resolveDestination(input.destinationId, input.customAddress);
      const witness = await resolveIdentity(input.witness).catch(() => null);

      // A witness who cannot be reached cannot resolve the pledge, which would
      // strand the stake until claimExpired. Refuse up front.
      const witnessIsEmail = input.witness.includes("@") && !input.witness.startsWith("@");
      if (!witness?.resolvedAddress && !witnessIsEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Couldn't reach that witness. Use an email or a resolvable name.",
        });
      }

      let witnessUserId: string | null = null;
      if (witness?.resolvedAddress) {
        const { data: known } = await serviceDb()
          .from("users")
          .select("id")
          .eq("address", witness.resolvedAddress.toLowerCase())
          .maybeSingle();
        witnessUserId = known?.id ?? null;
      }

      const { data, error } = await ctx.db
        .from("pledges")
        .insert({
          pledger_id: ctx.userId,
          goal: input.goal,
          stake_amount: input.stakeAmount,
          token: "USDC",
          witness_ref: input.witness,
          witness_address: witness?.resolvedAddress?.toLowerCase() ?? null,
          witness_user_id: witnessUserId,
          failure_destination_id: destination.id,
          failure_destination_label: destination.label,
          // Schema enforces lowercase hex on every address column.
          failure_destination_address: destination.address.toLowerCase(),
          deadline_unix: endOfDayUnix(input.deadlineDate, input.timezone),
          deadline_tz: input.timezone,
          is_public: input.isPublic,
          status: "locked",
          onchain_pledge_id: input.onchainPledgeId ?? null,
          tx_hash: input.txHash ?? null,
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });

      const { error: activityError } = await serviceDb().from("activity").insert({
        user_id: ctx.userId,
        type: "pledge_created",
        ref_type: "pledge",
        ref_id: data.id,
      });
      if (activityError) {
        // The feed is the only record that this happened; a silent failure here
        // is how a write disappears from the home screen.
        console.error("activity insert failed", activityError.message);
      }
      await serviceDb().from("pledge_events").insert({
        pledge_id: data.id,
        event_type: "created",
        tx_hash: input.txHash ?? null,
      });

      if (witnessIsEmail) {
        try {
          await notifyWitness({
            email: input.witness,
            goal: input.goal,
            stake: input.stakeAmount,
            token: data.witness_token,
            userId: witnessUserId,
          });
        } catch (mailError) {
          console.error("witness email failed", getErrorMessage(mailError));
        }
      }

      return { ...data, witnessUrl: `${env.webOrigin}/witness/${data.witness_token}` };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("pledges")
        .select("*, pledge_events(*)")
        .eq("id", input.id)
        .single();
      if (error) throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      return data;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("pledges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data;
  }),

  /** Public pledge board — anon-readable by RLS, public rows only. */
  publicFeed: publicProcedure.query(async () => {
    const { data, error } = await serviceDb()
      .from("pledges")
      .select("id, goal, stake_amount, deadline_unix, status, failure_destination_label")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data;
  }),
});
