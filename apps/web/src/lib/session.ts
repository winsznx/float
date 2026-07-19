"use client";

/**
 * Session storage for the app.
 *
 * The API mints a real Supabase session (access + refresh token) after
 * verifying a Magic DID token server-side. We hold it in localStorage so a
 * reload keeps the user signed in; every API call attaches the access token
 * and the server re-verifies it with Supabase on each request.
 */

const KEY = "float.session";

export type StoredSession = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  address: string;
};

export function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("float:session"));
}

export function clearSession(): void {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("float:session"));
}
