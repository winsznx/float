import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { resolveIdentity } from "../lib/identity.js";
import { serviceDb } from "../lib/supabase.js";
import { notifySettleRequest } from "../lib/notify.js";
import { env } from "../lib/env.js";
import { getErrorMessage } from "../lib/errors.js";

const memberInput = z.object({
  ref: z.string().min(1),
  shareAmount: z.number().nonnegative(),
});

export const splitRouter = router({
  /**
   * Creates a split and its members in one shot, then mails a settle link to
   * anyone identified by email.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().max(120).optional(),
        totalAmount: z.number().positive(),
        method: z.enum(["equal", "custom", "percentage"]).default("equal"),
        members: z.array(memberInput).min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sum = input.members.reduce((acc, m) => acc + m.shareAmount, 0);
      // Tolerate rounding on equal splits, reject genuine mismatches.
      if (Math.abs(sum - input.totalAmount) > 0.01 * input.members.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Shares total $${sum.toFixed(2)}, but the split is $${input.totalAmount.toFixed(2)}.`,
        });
      }

      const { data: split, error } = await ctx.db
        .from("splits")
        .insert({
          organizer_id: ctx.userId,
          name: input.name ?? null,
          total_amount: input.totalAmount,
          token: "USDC",
          split_method: input.method,
          status: "open",
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });

      // Link members who already have a FLOAT account so their own session can
      // settle; strangers stay ref-only until they claim.
      const resolved = await Promise.all(
        input.members.map(async (m) => {
          const identity = await resolveIdentity(m.ref).catch(() => null);
          let memberUserId: string | null = null;
          if (identity?.resolvedAddress) {
            const { data: known } = await serviceDb()
              .from("users")
              .select("id")
              .eq("address", identity.resolvedAddress.toLowerCase())
              .maybeSingle();
            memberUserId = known?.id ?? null;
          }
          return {
            split_id: split.id,
            member_ref: m.ref,
            member_user_id: memberUserId,
            share_amount: m.shareAmount,
            settled: false,
          };
        })
      );

      const { data: members, error: memberError } = await ctx.db
        .from("split_members")
        .insert(resolved)
        .select();
      if (memberError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: memberError.message });
      }

      const { error: activityError } = await serviceDb().from("activity").insert({
        user_id: ctx.userId,
        type: "split_created",
        ref_type: "split",
        ref_id: split.id,
      });
      if (activityError) {
        // The feed is the only record that this happened; a silent failure here
        // is how a write disappears from the home screen.
        console.error("activity insert failed", activityError.message);
      }

      for (const member of members) {
        if (member.member_ref.includes("@") && !member.member_ref.startsWith("@")) {
          try {
            await notifySettleRequest({
              email: member.member_ref,
              splitName: split.name,
              share: member.share_amount,
              token: split.share_link_token,
            });
          } catch (mailError) {
            console.error("settle email failed", getErrorMessage(mailError));
          }
        }
      }

      return { ...split, members, shareUrl: `${env.webOrigin}/settle/${split.share_link_token}` };
    }),

  /** Organizer dashboard: the split plus live per-member settle status. */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: split, error } = await ctx.db
        .from("splits")
        .select("*, split_members(*)")
        .eq("id", input.id)
        .single();
      if (error) throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      return { ...split, shareUrl: `${env.webOrigin}/settle/${split.share_link_token}` };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("splits")
      .select("*, split_members(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data;
  }),
});
