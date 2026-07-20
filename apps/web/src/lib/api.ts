"use client";

import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@float/api";
import { readSession } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Typed client for the FLOAT API. AppRouter is imported straight from the API
 * package, so a shape change on the server is a type error here rather than a
 * runtime surprise.
 */
export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      headers() {
        const session = readSession();
        return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
      },
    }),
  ],
});

/** True when the API rejected us for lack of a valid session. */
export function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED"
  );
}

/**
 * REST surface outside the /link namespace — routes that take no session and
 * no capability token, like sponsored delegation, which a split member has to
 * reach before they have either.
 */
export async function apiFetch<T>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown }
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data;
}

/** REST surface for capability-token links, which carry no session. */
export async function linkFetch<T>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown }
): Promise<T> {
  const response = await fetch(`${API_URL}/link${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data;
}
