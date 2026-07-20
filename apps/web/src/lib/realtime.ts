"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase-browser";

/**
 * Supabase realtime client bound to the caller's session.
 *
 * `postgres_changes` honors RLS, so a subscription only ever delivers rows the
 * user is allowed to read — no extra filtering needed here, and no risk of
 * leaking another user's activity into this stream. This is why the Phase 1
 * policies were written to be realtime-safe.
 */
export function createRealtimeClient(): SupabaseClient | null {
  return getSupabaseClient();
}
