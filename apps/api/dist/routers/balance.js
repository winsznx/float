import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { getUnifiedBalance } from "../lib/balance.js";
import { getErrorMessage } from "../lib/errors.js";
export const balanceRouter = router({
    /** Unified balance + per-chain breakdown for the signed-in user's UA. */
    get: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.address) {
            throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message: "No wallet address on this account.",
            });
        }
        try {
            return await getUnifiedBalance(ctx.address);
        }
        catch (error) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: getErrorMessage(error),
            });
        }
    }),
});
//# sourceMappingURL=balance.js.map