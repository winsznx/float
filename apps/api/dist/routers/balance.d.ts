export declare const balanceRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /** Unified balance + per-chain breakdown for the signed-in user's UA. */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: import("../lib/balance.js").UnifiedBalance;
        meta: object;
    }>;
}>>;
