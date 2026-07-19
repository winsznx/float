import { router, protectedProcedure } from "../trpc.js";
import { authRouter } from "./auth.js";
import { identityRouter } from "./identity.js";
import { balanceRouter } from "./balance.js";
import { sendRouter } from "./send.js";
import { splitRouter } from "./split.js";
import { leashRouter } from "./leash.js";
import { pledgeRouter } from "./pledge.js";
import { TRPCError } from "@trpc/server";

export type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

export type ActivityRow = {
  id: string;
  type: string;
  refType: string;
  refId: string;
  createdAt: string;
};

const feedRouter = router({
  /** Unified home feed. RLS scopes it to the caller's own rows. */
  activity: protectedProcedure.query(async ({ ctx }): Promise<ActivityRow[]> => {
    const { data, error } = await ctx.db
      .from("activity")
      .select("id, type, ref_type, ref_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return (data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      refType: row.ref_type,
      refId: row.ref_id,
      createdAt: row.created_at,
    }));
  }),

  notifications: protectedProcedure.query(async ({ ctx }): Promise<NotificationRow[]> => {
    const { data, error } = await ctx.db
      .from("notifications")
      .select("id, type, payload, read, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    // Mapped to a flat shape on purpose: returning the raw Supabase row type
    // through tRPC pushes the client past TypeScript's instantiation depth
    // limit ("excessively deep and possibly infinite").
    return (data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      payload: row.payload as Record<string, unknown>,
      read: row.read,
      createdAt: row.created_at,
    }));
  }),

  markRead: protectedProcedure.mutation(async ({ ctx }): Promise<{ updated: number }> => {
    const { data, error } = await ctx.db
      .from("notifications")
      .update({ read: true })
      .eq("user_id", ctx.userId)
      .eq("read", false)
      .select("id");
    if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    return { updated: data?.length ?? 0 };
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
