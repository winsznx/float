export declare const splitRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Creates a split and its members in one shot, then mails a settle link to
     * anyone identified by email.
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            totalAmount: number;
            members: {
                ref: string;
                shareAmount: number;
            }[];
            name?: string | undefined;
            method?: "equal" | "custom" | "percentage" | undefined;
        };
        output: {
            members: {
                created_at: string;
                id: string;
                member_ref: string;
                member_user_id: string | null;
                settle_tx_hash: string | null;
                settled: boolean;
                settled_at: string | null;
                share_amount: number;
                split_id: string;
            }[];
            shareUrl: string;
            created_at: string;
            id: string;
            name: string | null;
            organizer_id: string;
            share_link_token: string;
            split_method: string;
            status: string;
            token: string;
            total_amount: number;
            updated_at: string;
        };
        meta: object;
    }>;
    /** Organizer dashboard: the split plus live per-member settle status. */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            shareUrl: string;
            created_at: string;
            id: string;
            name: string | null;
            organizer_id: string;
            share_link_token: string;
            split_method: string;
            status: string;
            token: string;
            total_amount: number;
            updated_at: string;
            split_members: {
                created_at: string;
                id: string;
                member_ref: string;
                member_user_id: string | null;
                settle_tx_hash: string | null;
                settled: boolean;
                settled_at: string | null;
                share_amount: number;
                split_id: string;
            }[];
        };
        meta: object;
    }>;
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            created_at: string;
            id: string;
            name: string | null;
            organizer_id: string;
            share_link_token: string;
            split_method: string;
            status: string;
            token: string;
            total_amount: number;
            updated_at: string;
            split_members: {
                created_at: string;
                id: string;
                member_ref: string;
                member_user_id: string | null;
                settle_tx_hash: string | null;
                settled: boolean;
                settled_at: string | null;
                share_amount: number;
                split_id: string;
            }[];
        }[];
        meta: object;
    }>;
}>>;
