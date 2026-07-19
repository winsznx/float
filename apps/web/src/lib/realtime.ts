"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSession } from "@/lib/session";

/**
 * Supabase realtime client bound to the caller's session.
 *
 * `postgres_changes` honors RLS, so a subscription only ever delivers rows the
 * user is allowed to read — no extra filtering needed here, and no risk of
 * leaking another user's activity into this stream. This is why the Phase 1
 * policies were written to be realtime-safe.
 */
let client: SupabaseClient | null = null;
let boundToken: string | null = null;

export function createRealtimeClient(): SupabaseClient | null {
  const session = readSession();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!session || !url || !anonKey) return null;

  // Rebuild when the session changes so the socket never keeps authenticating
  // as a signed-out user.
  if (client && boundToken === session.accessToken) return client;

  client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  void client.realtime.setAuth(session.accessToken);
  boundToken = session.accessToken;

  return client;
}
