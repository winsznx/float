import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { verifyMagicToken, mintSession } from "../lib/auth.js";
import { checkHandleAvailability } from "../lib/identity.js";
import { getErrorMessage } from "../lib/errors.js";

export const authRouter = router({
  /**
   * Magic login → app session. The DID token is verified server-side; the
   * client's claimed address is never trusted.
   */
  loginWithMagic: publicProcedure
    .input(z.object({ didToken: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        const identity = await verifyMagicToken(input.didToken);
        const session = await mintSession(identity.publicAddress, {
          email: identity.email,
          magicIssuer: identity.issuer,
        });
        return session;
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: getErrorMessage(error),
        });
      }
    }),

  /** The signed-in user's profile row, straight from Postgres. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("users")
      .select("*")
      .eq("id", ctx.userId)
      .single();
    if (error) throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    return data;
  }),

  handleAvailable: publicProcedure
    .input(z.object({ handle: z.string().min(1) }))
    .query(({ input }) => checkHandleAvailability(input.handle)),

  /** Claims a handle. Returns the persisted row, never a constructed object. */
  setHandle: protectedProcedure
    .input(z.object({ handle: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/) }))
    .mutation(async ({ ctx, input }) => {
      const handle = input.handle.toLowerCase();
      if (!(await checkHandleAvailability(handle))) {
        throw new TRPCError({ code: "CONFLICT", message: `${handle} is taken.` });
      }
      const { data, error } = await ctx.db
        .from("users")
        .update({ handle })
        .eq("id", ctx.userId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      return data;
    }),
});
