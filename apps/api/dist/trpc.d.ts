import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { type Db } from "./lib/supabase.js";
export type Context = {
    accessToken: string | null;
    userId: string | null;
    address: string | null;
    db: Db;
};
/**
 * Resolves the caller from their Supabase access token. The token is verified
 * by Supabase itself (getUser), never decoded and trusted locally.
 */
export declare function createContext({ req }: CreateFastifyContextOptions): Promise<Context>;
export declare const router: import("@trpc/server").TRPCRouterBuilder<{
    ctx: Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}>;
export declare const publicProcedure: import("@trpc/server").TRPCProcedureBuilder<Context, object, object, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
/** Rejects anonymous callers and narrows userId/address to non-null. */
export declare const protectedProcedure: import("@trpc/server").TRPCProcedureBuilder<Context, object, {
    address: string | null;
    accessToken: string;
    userId: string;
    db: Db;
}, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
