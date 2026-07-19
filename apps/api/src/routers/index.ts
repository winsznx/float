import { router, protectedProcedure } from "../trpc.js";
import { authRouter } from "./auth.js";
import { identityRouter } from "./identity.js";
import { balanceRouter } from "./balance.js";
import { sendRouter } from "./send.js";
import { splitRouter } from "./split.js";
import { leashRouter } from "./leash.js";
import { pledgeRouter } from "./pledge.js";
import { TRPCError } from "@trpc/server";

const feedRouter = router({
  /** Unified home feed. RLS scopes it to the caller's own rows. */
  activity: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data;
  }),

  notifications: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data;
  }),

  markRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("notifications")
      .update({ read: true })
      .eq("user_id", ctx.userId)
      .eq("read", false)
      .select();
    if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    return data;
  }),
});

export const appRouter = router({
  auth: authRouter,
  identity: identityRouter,
  balance: balanceRouter,
  send: sendRouter,
  split: splitRouter,
  leash: leashRouter,
  pledge: pledgeRouter,
  feed: feedRouter,
});

export type AppRouter = typeof appRouter;
