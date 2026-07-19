export declare const sendRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Records a send.
     *
     * The chain transaction is signed in the browser (the UA owner key never
     * leaves the client), so the client submits and reports back the hash. The
     * row is written pending and the indexer confirms it — the API never claims
     * a transfer settled on the client's say-so.
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            recipient: string;
            amount: number;
            note?: string | undefined;
            txHash?: string | undefined;
            sourceChainId?: number | undefined;
        };
        output: {
            amount: number;
            claim_token: string | null;
            claimed_at: string | null;
            created_at: string;
            dest_chain_id: number | null;
            id: string;
            note: string | null;
            recipient_address: string | null;
            recipient_input: string;
            recipient_type: string;
            recipient_user_id: string | null;
            sender_id: string;
            source_chain_id: number | null;
            status: string;
            token: string;
            tx_hash: string | null;
            updated_at: string;
        };
        meta: object;
    }>;
    /** Attaches the on-chain hash once the client has submitted. */
    attachTxHash: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            txHash: string;
        };
        output: {
            amount: number;
            claim_token: string | null;
            claimed_at: string | null;
            created_at: string;
            dest_chain_id: number | null;
            id: string;
            note: string | null;
            recipient_address: string | null;
            recipient_input: string;
            recipient_type: string;
            recipient_user_id: string | null;
            sender_id: string;
            source_chain_id: number | null;
            status: string;
            token: string;
            tx_hash: string | null;
            updated_at: string;
        };
        meta: object;
    }>;
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            amount: number;
            claim_token: string | null;
            claimed_at: string | null;
            created_at: string;
            dest_chain_id: number | null;
            id: string;
            note: string | null;
            recipient_address: string | null;
            recipient_input: string;
            recipient_type: string;
            recipient_user_id: string | null;
            sender_id: string;
            source_chain_id: number | null;
            status: string;
            token: string;
            tx_hash: string | null;
            updated_at: string;
        }[];
        meta: object;
    }>;
}>>;
