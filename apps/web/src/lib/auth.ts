"use client";

import { api } from "@/lib/api";
import { loginWithEmailOtp, getIdToken } from "@/lib/chain/magic";
import { writeSession, clearSession, type StoredSession } from "@/lib/session";

/**
 * Email login. Magic provisions (or recovers) the embedded wallet in its
 * iframe, then the API verifies the resulting DID token server-side and mints
 * a Supabase session. The browser never asserts its own identity.
 */
export async function signInWithEmail(email: string): Promise<StoredSession> {
  await loginWithEmailOtp(email);
  const didToken = await getIdToken();
  const session = await api.auth.loginWithMagic.mutate({ didToken });
  writeSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  clearSession();
  try {
    const { logout } = await import("@/lib/chain/magic");
    await logout();
  } catch {
    // Already signed out of Magic, or its iframe is unavailable — the local
    // session is cleared either way.
  }
}
