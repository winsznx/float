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
};
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    auth: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        loginWithMagic: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                didToken: string;
            };
            output: import("../lib/auth.js").Session;
            meta: object;
        }>;
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
        loginWithWallet: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                address: string;
                nonce: string;
                signature: string;
            };
            output: import("../lib/auth.js").Session;
            meta: object;
        }>;
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
    identity: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        resolve: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                input: string;
            };
            output: import("../lib/identity.js").IdentityResolution;
            meta: object;
        }>;
    }>>;
    balance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("../lib/balance.js").UnifiedBalance;
            meta: object;
        }>;
    }>>;
    send: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    split: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                totalAmount: number;
                members: {
                    ref: string;
                    shareAmount: number;
                }[];
                name?: string | undefined;
                method?: "custom" | "equal" | "percentage" | undefined;
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
    leash: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                beneficiary: string;
                spendLimit: number;
                expiryDate: string;
                contractScope?: "basic" | "advanced" | undefined;
                allowedContracts?: string[] | undefined;
                timezone?: string | undefined;
                onchainLeashId?: string | undefined;
                txHash?: string | undefined;
            };
            output: {
                claimUrl: string;
                allowed_contracts: string[];
                beneficiary_address: string | null;
                beneficiary_ref: string;
                beneficiary_user_id: string | null;
                claim_token: string;
                contract_scope: string;
                created_at: string;
                expiry_tz: string | null;
                expiry_unix: number | null;
                id: string;
                onchain_leash_id: string | null;
                owner_id: string;
                revoked: boolean;
                spend_limit: number;
                spent: number;
                token: string;
                tx_hash: string | null;
                updated_at: string;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                allowed_contracts: string[];
                beneficiary_address: string | null;
                beneficiary_ref: string;
                beneficiary_user_id: string | null;
                claim_token: string;
                contract_scope: string;
                created_at: string;
                expiry_tz: string | null;
                expiry_unix: number | null;
                id: string;
                onchain_leash_id: string | null;
                owner_id: string;
                revoked: boolean;
                spend_limit: number;
                spent: number;
                token: string;
                tx_hash: string | null;
                updated_at: string;
                leash_spends: {
                    amount: number;
                    block_number: number | null;
                    created_at: string;
                    id: string;
                    leash_id: string;
                    log_index: number;
                    to_address: string;
                    tx_hash: string;
                }[];
            };
            meta: object;
        }>;
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                allowed_contracts: string[];
                beneficiary_address: string | null;
                beneficiary_ref: string;
                beneficiary_user_id: string | null;
                claim_token: string;
                contract_scope: string;
                created_at: string;
                expiry_tz: string | null;
                expiry_unix: number | null;
                id: string;
                onchain_leash_id: string | null;
                owner_id: string;
                revoked: boolean;
                spend_limit: number;
                spent: number;
                token: string;
                tx_hash: string | null;
                updated_at: string;
            }[];
            meta: object;
        }>;
        revoke: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                txHash: string;
            };
            output: {
                allowed_contracts: string[];
                beneficiary_address: string | null;
                beneficiary_ref: string;
                beneficiary_user_id: string | null;
                claim_token: string;
                contract_scope: string;
                created_at: string;
                expiry_tz: string | null;
                expiry_unix: number | null;
                id: string;
                onchain_leash_id: string | null;
                owner_id: string;
                revoked: boolean;
                spend_limit: number;
                spent: number;
                token: string;
                tx_hash: string | null;
                updated_at: string;
            };
            meta: object;
        }>;
    }>>;
    pledge: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    feed: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        /** Unified home feed. RLS scopes it to the caller's own rows. */
        activity: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: ActivityRow[];
            meta: object;
        }>;
        notifications: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: NotificationRow[];
            meta: object;
        }>;
        markRead: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                updated: number;
            };
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
