import { type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@float/db";
export type Db = SupabaseClient<Database>;
export declare function serviceDb(): Db;
/**
 * A client acting as the caller. RLS applies, so every query is automatically
 * scoped to rows this user is allowed to touch — the same policies verified in
 * Phase 1 are what enforce authorization here.
 */
export declare function userDb(accessToken: string): Db;
