export declare const authRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Magic login → app session. The DID token is verified server-side; the
     * client's claimed address is never trusted.
     */
    loginWithMagic: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            didToken: string;
        };
        output: import("../lib/auth.js").Session;
        meta: object;
    }>;
    /** Issues a single-use nonce for wallet sign-in. */
    walletNonce: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            address: string;
        };
        output: {
            nonce: string;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Existing-wallet sign-in. The signature is verified against the exact
     * message the server issued — an address on its own proves nothing, since
     * anyone can claim one.
     */
    loginWithWallet: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            address: string;
            nonce: string;
            signature: string;
        };
        output: import("../lib/auth.js").Session;
        meta: object;
    }>;
    /** The signed-in user's profile row, straight from Postgres. */
    me: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            address: string | null;
            avatar_url: string | null;
            created_at: string;
            email: string | null;
            handle: string | null;
            id: string;
            magic_id: string | null;
            preferred_chain_id: number | null;
            updated_at: string;
        };
        meta: object;
    }>;
    handleAvailable: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            handle: string;
        };
        output: boolean;
        meta: object;
    }>;
    /** Claims a handle. Returns the persisted row, never a constructed object. */
    setHandle: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            handle: string;
        };
        output: {
            address: string | null;
            avatar_url: string | null;
            created_at: string;
            email: string | null;
            handle: string | null;
            id: string;
            magic_id: string | null;
            preferred_chain_id: number | null;
            updated_at: string;
        };
        meta: object;
    }>;
}>>;
