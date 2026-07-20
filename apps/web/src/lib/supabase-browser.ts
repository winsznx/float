"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSession } from "@/lib/session";

/**
 * The one Supabase client in the browser.
 *
 * Realtime and avatar upload each built their own, and avatar upload built a
 * fresh one on every call, so a session could end up with several GoTrue
 * instances sharing a storage key — which supabase-js warns about because
 * concurrent use under the same key produces undefined behaviour.
 *
 * Rebuilt only when the session token changes, so a socket never keeps
 * authenticating as a signed-out user.
 */
let client: SupabaseClient | null = null;
let boundToken: string | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const session = readSession();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!session || !url || !anonKey) return null;
  if (client && boundToken === session.accessToken) return client;

  client = createClient(url, anonKey, {
    // Sessions are minted by our API, not by Supabase auth, so there is
    // nothing for GoTrue to persist or refresh. The explicit storageKey keeps
    // this instance from colliding with any other on the page.
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: "float-supabase-browser",
    },
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  void client.realtime.setAuth(session.accessToken);
  boundToken = session.accessToken;

  return client;
}
