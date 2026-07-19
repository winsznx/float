import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@float/db";
import { env } from "./env.js";

export type Db = SupabaseClient<Database>;

/**
 * Service-role client. Bypasses RLS — use only for work the user cannot do as
 * themselves: indexer writes, capability-token lookups, status transitions.
 * Never hand this to a request that carries a user session.
 */
let serviceClient: Db | null = null;
export function serviceDb(): Db {
  if (!serviceClient) {
    serviceClient = createClient<Database>(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return serviceClient;
}

/**
 * A client acting as the caller. RLS applies, so every query is automatically
 * scoped to rows this user is allowed to touch — the same policies verified in
 * Phase 1 are what enforce authorization here.
 */
export function userDb(accessToken: string): Db {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
