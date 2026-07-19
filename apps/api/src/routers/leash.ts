import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { resolveIdentity } from "../lib/identity.js";
import { serviceDb } from "../lib/supabase.js";
import { notifyLeashGranted } from "../lib/notify.js";
import { endOfDayUnix } from "../lib/time.js";
import { env } from "../lib/env.js";
import { getErrorMessage } from "../lib/errors.js";

export const leashRouter = router({
  /**
   * Records a leash. The on-chain LeashManager.createLeash is signed in the
   * browser; the returned leashId and tx hash are attached here. `spent` is
   * never written by this API — the indexer owns it, because the chain is
   * authoritative for how much authority has been consumed.
   */
  create: protectedProcedure
    .input(
      z.object({
        beneficiary: z.string().min(1),
        spendLimit: z.number().positive(),
        contractScope: z.enum(["basic", "advanced"]).default("basic"),
        allowedContracts: z.array(z.string()).default([]),
        expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timezone: z.string().default("UTC"),
        onchainLeashId: z.string().optional(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const identity = await resolveIdentity(input.beneficiary).catch(() => null);

      let beneficiaryUserId: string | null = null;
      if (identity?.resolvedAddress) {
        const { data: known } = await serviceDb()
          .from("users")
          .select("id")
          .eq("address", identity.resolvedAddress.toLowerCase())
          .maybeSingle();
        beneficiaryUserId = known?.id ?? null;
      }

      const { data, error } = await ctx.db
        .from("leashes")
        .insert({
          owner_id: ctx.userId,
          beneficiary_ref: input.beneficiary,
          beneficiary_address: identity?.resolvedAddress?.toLowerCase() ?? null,
          beneficiary_user_id: beneficiaryUserId,
          token: "USDC",
          spend_limit: input.spendLimit,
          contract_scope: input.contractScope,
          allowed_contracts: input.allowedContracts,
          expiry_unix: endOfDayUnix(input.expiryDate, input.timezone),
          expiry_tz: input.timezone,
          onchain_leash_id: input.onchainLeashId ?? null,
          tx_hash: input.txHash ?? null,
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });

      const { error: activityError } = await serviceDb().from("activity").insert({
        user_id: ctx.userId,
        type: "leash_created",
        ref_type: "leash",
        ref_id: data.id,
      });
      if (activityError) {
        // The feed is the only record that this happened; a silent failure here
        // is how a write disappears from the home screen.
        console.error("activity insert failed", activityError.message);
      }

      if (input.beneficiary.includes("@") && !input.beneficiary.startsWith("@")) {
        try {
          await notifyLeashGranted({
            email: input.beneficiary,
            limit: input.spendLimit,
            token: data.claim_token,
          });
        } catch (mailError) {
          console.error("leash email failed", getErrorMessage(mailError));
        }
      }

      return { ...data, claimUrl: `${env.webOrigin}/leash/claim/${data.claim_token}` };
    }),

  /** Live usage. `spent` comes from the indexer mirroring on-chain events. */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("leashes")
        .select("*, leash_spends(*)")
        .eq("id", input.id)
        .single();
      if (error) throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      return data;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("leashes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data;
  }),

  /**
   * Marks a leash revoked after the on-chain revoke lands. Kept honest: the
   * caller must supply the tx hash, so the DB never claims revocation the
   * chain has not seen.
   */
  revoke: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]+$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("leashes")
        .update({ revoked: true })
        .eq("id", input.id)
        .eq("owner_id", ctx.userId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      return data;
    }),
});
