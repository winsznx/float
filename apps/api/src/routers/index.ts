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
  /**
   * Where this row opens, or null when the referenced thing has no detail
   * page. Resolved here because the destination needs a capability token the
   * feed row doesn't carry — the client used to map ref_type straight to
   * "/send", "/split" and so on, which dropped you into a *new* transfer
   * instead of the one you clicked.
   */
  href: string | null;
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
    const rows = data ?? [];

    // Batched per ref_type rather than per row: a 50-row feed would otherwise
    // issue 50 lookups. RLS still scopes each query to the caller.
    const idsOf = (refType: string) =>
      [...new Set(rows.filter((r) => r.ref_type === refType).map((r) => r.ref_id))];

    const [sends, splits] = await Promise.all([
      idsOf("send").length
        ? ctx.db.from("sends").select("id, share_token").in("id", idsOf("send"))
        : Promise.resolve({ data: [] as { id: string; share_token: string }[] }),
      idsOf("split").length
        ? ctx.db.from("splits").select("id, share_link_token").in("id", idsOf("split"))
        : Promise.resolve({ data: [] as { id: string; share_link_token: string }[] }),
    ]);

    const sendTokens = new Map((sends.data ?? []).map((s) => [s.id, s.share_token]));
    const splitTokens = new Map((splits.data ?? []).map((s) => [s.id, s.share_link_token]));

    // Leashes are deliberately absent: there is no leash detail page, and a
    // link that lands somewhere unrelated is worse than no link at all.
    const hrefFor = (refType: string, refId: string): string | null => {
      if (refType === "send") {
        const token = sendTokens.get(refId);
        return token ? `/r/${token}` : null;
      }
      if (refType === "split") {
        const token = splitTokens.get(refId);
        return token ? `/settle/${token}` : null;
      }
      if (refType === "pledge") return `/pledge/${refId}`;
      return null;
    };

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      refType: row.ref_type,
      refId: row.ref_id,
      createdAt: row.created_at,
      href: hrefFor(row.ref_type, row.ref_id),
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
