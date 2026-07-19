export declare const leashRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Records a leash. The on-chain LeashManager.createLeash is signed in the
     * browser; the returned leashId and tx hash are attached here. `spent` is
     * never written by this API — the indexer owns it, because the chain is
     * authoritative for how much authority has been consumed.
     */
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
    /** Live usage. `spent` comes from the indexer mirroring on-chain events. */
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
    /**
     * Marks a leash revoked after the on-chain revoke lands. Kept honest: the
     * caller must supply the tx hash, so the DB never claims revocation the
     * chain has not seen.
     */
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
