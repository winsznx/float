export declare const pledgeRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /** Curated failure destinations, with the addresses the contract will use. */
    destinations: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: import("../lib/destinations.js").FailureDestination[];
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            goal: string;
            stakeAmount: number;
            witness: string;
            destinationId: string;
            deadlineDate: string;
            customAddress?: string | undefined;
            timezone?: string | undefined;
            isPublic?: boolean | undefined;
            onchainPledgeId?: string | undefined;
            txHash?: string | undefined;
        };
        output: {
            witnessUrl: string;
            created_at: string;
            deadline_tz: string;
            deadline_unix: number;
            failure_destination_address: string | null;
            failure_destination_id: string;
            failure_destination_label: string;
            goal: string;
            id: string;
            is_public: boolean;
            onchain_pledge_id: string | null;
            pledger_id: string;
            resolved_at: string | null;
            share_card_url: string | null;
            stake_amount: number;
            status: string;
            token: string;
            tx_hash: string | null;
            updated_at: string;
            witness_address: string | null;
            witness_ref: string;
            witness_token: string;
            witness_user_id: string | null;
        };
        meta: object;
    }>;
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            created_at: string;
            deadline_tz: string;
            deadline_unix: number;
            failure_destination_address: string | null;
            failure_destination_id: string;
            failure_destination_label: string;
            goal: string;
            id: string;
            is_public: boolean;
            onchain_pledge_id: string | null;
            pledger_id: string;
            resolved_at: string | null;
            share_card_url: string | null;
            stake_amount: number;
            status: string;
            token: string;
            tx_hash: string | null;
            updated_at: string;
            witness_address: string | null;
            witness_ref: string;
            witness_token: string;
            witness_user_id: string | null;
            pledge_events: {
                block_number: number | null;
                created_at: string;
                event_type: string;
                id: string;
                log_index: number | null;
                pledge_id: string;
                tx_hash: string | null;
            }[];
        };
        meta: object;
    }>;
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            created_at: string;
            deadline_tz: string;
            deadline_unix: number;
            failure_destination_address: string | null;
            failure_destination_id: string;
            failure_destination_label: string;
            goal: string;
            id: string;
            is_public: boolean;
            onchain_pledge_id: string | null;
            pledger_id: string;
            resolved_at: string | null;
            share_card_url: string | null;
            stake_amount: number;
            status: string;
            token: string;
            tx_hash: string | null;
            updated_at: string;
            witness_address: string | null;
            witness_ref: string;
            witness_token: string;
            witness_user_id: string | null;
        }[];
        meta: object;
    }>;
    /** Public pledge board — anon-readable by RLS, public rows only. */
    publicFeed: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            goal: string;
            stake_amount: number;
            deadline_unix: number;
            status: string;
            failure_destination_label: string;
        }[];
        meta: object;
    }>;
}>>;
