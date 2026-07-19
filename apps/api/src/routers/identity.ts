import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc.js";
import { resolveIdentity } from "../lib/identity.js";
import { getErrorMessage } from "../lib/errors.js";

export const identityRouter = router({
  /**
   * Resolves ENS / Farcaster / email / raw address to an address plus the
   * chains that address holds value on.
   *
   * Rejects rather than returning a null-ish success when lookup fails —
   * the frontend's IdentityInput renders a distinct "failed" state for that
   * (DATA_CONTRACTS §7).
   */
  resolve: publicProcedure
    .input(z.object({ input: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      try {
        return await resolveIdentity(input.input);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: getErrorMessage(error),
        });
      }
    }),
});
