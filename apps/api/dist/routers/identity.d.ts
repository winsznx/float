export declare const identityRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Resolves ENS / Farcaster / email / raw address to an address plus the
     * chains that address holds value on.
     *
     * Rejects rather than returning a null-ish success when lookup fails —
     * the frontend's IdentityInput renders a distinct "failed" state for that
     * (DATA_CONTRACTS §7).
     */
    resolve: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            input: string;
        };
        output: import("../lib/identity.js").IdentityResolution;
        meta: object;
    }>;
}>>;
